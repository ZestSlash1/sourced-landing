"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoContains, geoDistance, geoInterpolate, geoOrthographic } from "d3-geo";
import * as topojson from "topojson-client";
import type { LiveAnalytics, LivePoint, LiveWindow } from "@/lib/analytics/live-queries";
import styles from "./live.module.css";

const POLL_MS = 10000;
const D2R = Math.PI / 180;
const WORLD_TOPOLOGY_URL = "/data/world-110m.json";

type Tab = "countries" | "pages" | "referrers" | "devices";
type Theme = "dark" | "light";

interface DotPoint {
  p: [number, number];
}

interface Arc {
  a: LivePoint;
  b: LivePoint;
  t0: number;
  life: number;
  interp: (t: number) => [number, number];
  alt: number;
}

interface ThemeColors {
  sphere0: string;
  sphere1: string;
  sphere2: string;
  atmo: string;
  dot: string;
  dotA: number;
  arc: string;
  marker: string;
  isDark: boolean;
}

function secondsAgoLabel(s: number): string {
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

function readThemeColors(el: HTMLElement): ThemeColors {
  const css = (k: string) => getComputedStyle(el).getPropertyValue(k).trim();
  return {
    sphere0: css("--sphere0"),
    sphere1: css("--sphere1"),
    sphere2: css("--sphere2"),
    atmo: css("--atmo"),
    dot: css("--dot"),
    dotA: parseFloat(css("--dotA")) || 0.6,
    arc: css("--arc"),
    marker: css("--marker"),
    isDark: el.getAttribute("data-theme") !== "light",
  };
}

function locationLabel(p: { city: string | null; country: string | null }): string {
  if (p.city && p.country) return `${p.city}, ${p.country}`;
  return p.city ?? p.country ?? "Unknown";
}

/**
 * Full-page recreation of the Claude Design "live-globe" handoff: a
 * canvas/d3-orthographic rotating globe with arcs and hover tooltips, KPI
 * tiles, and a sidebar of tabbed breakdowns + a live session feed. Every
 * number here is real, from getLiveAnalytics() — nothing is mocked.
 */
export function LiveAnalyticsView({
  initialData,
  initialWindow,
}: {
  initialData: LiveAnalytics;
  initialWindow: LiveWindow;
}) {
  const [data, setData] = useState(initialData);
  const [fetchedAt, setFetchedAt] = useState(() => Date.now());
  const [windowSel, setWindowSel] = useState<LiveWindow>(initialWindow);
  const [theme, setTheme] = useState<Theme>("dark");
  const [spin, setSpin] = useState(true);
  const [showArcs, setShowArcs] = useState(true);
  const [tab, setTab] = useState<Tab>("countries");
  const [tick, setTick] = useState(0);
  const [dragging, setDragging] = useState(false);

  const pageRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  const dataRef = useRef(data);
  dataRef.current = data;
  const spinRef = useRef(spin);
  spinRef.current = spin;
  const showArcsRef = useRef(showArcs);
  showArcsRef.current = showArcs;
  const windowRef = useRef(windowSel);
  windowRef.current = windowSel;

  // Persisted preferences, read after mount to avoid SSR/client mismatch.
  useEffect(() => {
    const savedTheme = localStorage.getItem("gs-live-theme");
    if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);
  }, []);

  useEffect(() => {
    localStorage.setItem("gs-live-theme", theme);
  }, [theme]);

  // A 1s tick so the "Xs ago" feed labels keep advancing between polls.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const pull = useCallback(async (win: LiveWindow) => {
    try {
      const res = await fetch(`/api/admin/analytics/live?window=${win}`, { headers: { accept: "application/json" } });
      if (!res.ok) return;
      const json = (await res.json()) as LiveAnalytics;
      setData(json);
      setFetchedAt(Date.now());
    } catch {
      // Keep showing the last good data — never break the page over a poll.
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => pull(windowRef.current), POLL_MS);
    return () => clearInterval(id);
  }, [pull]);

  const changeWindow = (win: LiveWindow) => {
    setWindowSel(win);
    pull(win);
  };

  /* ---------------------------------------------------------------- globe */
  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    const page = pageRef.current;
    if (!canvas || !stage || !page) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0,
      H = 0,
      R = 0,
      cx = 0,
      cy = 0,
      zoom = 1;
    let lambda = -20,
      phi = -14;
    let dots: DotPoint[] = [];
    let hover: LivePoint | null = null;
    let raf = 0;
    let stopped = false;

    const proj = geoOrthographic();
    const arcs: Arc[] = [];
    const stars = Array.from({ length: 240 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.3 + 0.2,
      p: Math.random() * 6.283,
      s: 0.4 + Math.random() * 0.8,
    }));

    let T = readThemeColors(page);
    const applyTheme = () => {
      T = readThemeColors(page);
    };

    const vis = (lon: number, lat: number) => geoDistance([lon, lat], [-lambda, -phi]) < Math.PI / 2 - 0.005;

    function resize() {
      W = stage!.clientWidth;
      H = stage!.clientHeight;
      canvas!.width = Math.round(W * dpr);
      canvas!.height = Math.round(H * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = Math.min(W * 0.42, H * 0.46) * zoom;
      cx = W * 0.5;
      cy = H * 0.52;
    }

    function spawnArc() {
      const P = dataRef.current.points;
      if (P.length < 2) return;
      const a = P[Math.floor(Math.random() * P.length)];
      let b = a;
      let guard = 0;
      while (b === a && guard++ < 8) b = P[Math.floor(Math.random() * P.length)];
      arcs.push({
        a,
        b,
        t0: performance.now(),
        life: 5200 + Math.random() * 2600,
        interp: geoInterpolate([a.lng, a.lat], [b.lng, b.lat]) as (t: number) => [number, number],
        alt: 0.14 + geoDistance([a.lng, a.lat], [b.lng, b.lat]) * 0.16,
      });
      if (arcs.length > 16) arcs.shift();
    }

    function frame(t: number) {
      if (stopped) return;
      if (spinRef.current) lambda = (lambda + 0.055) % 360;
      proj.rotate([lambda, phi]).scale(R).translate([cx, cy]);
      ctx!.clearRect(0, 0, W, H);

      if (T.isDark) {
        for (const s of stars) {
          const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * 0.0012 * s.s + s.p));
          ctx!.beginPath();
          ctx!.arc(s.x * W, s.y * H, s.r, 0, 6.283);
          ctx!.fillStyle = `rgba(214,206,255,${a * 0.7})`;
          ctx!.fill();
        }
      } else {
        const sh = ctx!.createRadialGradient(cx, cy + R * 0.98, R * 0.1, cx, cy + R * 0.98, R * 0.9);
        sh.addColorStop(0, "rgba(80,60,180,.10)");
        sh.addColorStop(1, "rgba(80,60,180,0)");
        ctx!.fillStyle = sh;
        ctx!.beginPath();
        ctx!.ellipse(cx, cy + R * 1.0, R * 0.85, R * 0.16, 0, 0, 6.283);
        ctx!.fill();
      }

      const g = ctx!.createRadialGradient(cx - R * 0.33, cy - R * 0.38, R * 0.08, cx, cy, R * 1.04);
      g.addColorStop(0, T.sphere0);
      g.addColorStop(0.58, T.sphere1);
      g.addColorStop(1, T.sphere2);
      ctx!.beginPath();
      ctx!.arc(cx, cy, R, 0, 6.283);
      ctx!.fillStyle = g;
      ctx!.fill();

      const ag = ctx!.createRadialGradient(cx, cy, R * 0.94, cx, cy, R * 1.3);
      ag.addColorStop(0, `rgba(${T.atmo},.28)`);
      ag.addColorStop(0.5, `rgba(${T.atmo},.09)`);
      ag.addColorStop(1, `rgba(${T.atmo},0)`);
      ctx!.beginPath();
      ctx!.arc(cx, cy, R * 1.3, 0, 6.283);
      ctx!.fillStyle = ag;
      ctx!.fill();

      const c0: [number, number] = [-lambda, -phi];
      for (const d of dots) {
        const dist = geoDistance(d.p, c0);
        if (dist > Math.PI / 2 - 0.01) continue;
        const p = proj(d.p);
        if (!p) continue;
        const lit = Math.max(0, Math.min(1, Math.cos(dist) * 1.15));
        ctx!.beginPath();
        ctx!.arc(p[0], p[1], (0.75 + 0.85 * lit) * Math.max(0.55, R / 420), 0, 6.283);
        ctx!.fillStyle = `rgba(${T.dot},${0.16 + T.dotA * lit})`;
        ctx!.fill();
      }

      if (showArcsRef.current) {
        ctx!.lineCap = "round";
        ctx!.lineWidth = 1.15;
        for (let i = arcs.length - 1; i >= 0; i--) {
          const a = arcs[i];
          const age = (t - a.t0) / a.life;
          if (age > 1) {
            arcs.splice(i, 1);
            continue;
          }
          const grow = Math.min(1, age / 0.38);
          const fade = age > 0.72 ? 1 - (age - 0.72) / 0.28 : 1;
          const pts: [number, number, boolean][] = [];
          for (let s = 0; s <= 64; s++) {
            const u = s / 64;
            if (u > grow) break;
            const c = a.interp(u);
            const k = 1 + a.alt * Math.sin(Math.PI * u);
            const p = proj(c);
            if (!p) continue;
            pts.push([cx + (p[0] - cx) * k, cy + (p[1] - cy) * k, vis(c[0], c[1]) || k > 1.02]);
          }
          for (let s = 1; s < pts.length; s++) {
            ctx!.beginPath();
            ctx!.moveTo(pts[s - 1][0], pts[s - 1][1]);
            ctx!.lineTo(pts[s][0], pts[s][1]);
            ctx!.strokeStyle = `rgba(${T.arc},${(pts[s][2] ? 0.85 : 0.16) * fade})`;
            ctx!.stroke();
          }
          if (pts.length > 1 && grow < 1) {
            const h = pts[pts.length - 1];
            ctx!.beginPath();
            ctx!.arc(h[0], h[1], 2.4, 0, 6.283);
            ctx!.fillStyle = `rgba(${T.marker},.98)`;
            ctx!.shadowColor = `rgba(${T.arc},.9)`;
            ctx!.shadowBlur = T.isDark ? 12 : 0;
            ctx!.fill();
            ctx!.shadowBlur = 0;
          }
        }
      }

      for (const c of dataRef.current.points) {
        (c as LivePoint & { _x?: number; _y?: number })._x = undefined;
        if (!vis(c.lng, c.lat)) continue;
        const p = proj([c.lng, c.lat]);
        if (!p) continue;
        (c as LivePoint & { _x?: number; _y?: number })._x = p[0];
        (c as LivePoint & { _x?: number; _y?: number })._y = p[1];
        const base = 2.0 + Math.sqrt(c.sessions || 1) / 6;
        const ph = (t * 0.0016 + c.lat * 0.11) % 6.283;
        const pr = base + (1 + Math.sin(ph)) * base * 1.9;
        ctx!.beginPath();
        ctx!.arc(p[0], p[1], pr, 0, 6.283);
        ctx!.strokeStyle = `rgba(${T.arc},${0.32 * (1 - (pr - base) / (base * 3.9))})`;
        ctx!.lineWidth = 1;
        ctx!.stroke();
        ctx!.beginPath();
        ctx!.arc(p[0], p[1], base, 0, 6.283);
        ctx!.fillStyle = `rgba(${T.marker},.96)`;
        ctx!.shadowColor = `rgba(${T.arc},.95)`;
        ctx!.shadowBlur = T.isDark ? 14 : 0;
        ctx!.fill();
        ctx!.shadowBlur = 0;
        if (!T.isDark) {
          ctx!.beginPath();
          ctx!.arc(p[0], p[1], base, 0, 6.283);
          ctx!.strokeStyle = "#fff";
          ctx!.lineWidth = 1.1;
          ctx!.stroke();
        }
        if (hover === c) {
          ctx!.beginPath();
          ctx!.arc(p[0], p[1], base + 5, 0, 6.283);
          ctx!.strokeStyle = T.isDark ? "rgba(255,255,255,.8)" : "#171532";
          ctx!.lineWidth = 1.3;
          ctx!.stroke();
        }
      }

      raf = requestAnimationFrame(frame);
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(stage);

    let dragState: { x: number; y: number; l: number; p: number } | null = null;
    const onPointerDown = (e: PointerEvent) => {
      dragState = { x: e.clientX, y: e.clientY, l: lambda, p: phi };
      setDragging(true);
      canvas.setPointerCapture(e.pointerId);
    };
    const onPointerUp = () => {
      dragState = null;
      setDragging(false);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (dragState) {
        lambda = dragState.l + (e.clientX - dragState.x) * 0.3;
        phi = Math.max(-75, Math.min(75, dragState.p - (e.clientY - dragState.y) * 0.3));
        return;
      }
      const r = canvas.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      let best: LivePoint | null = null;
      let bd = 18;
      for (const c of dataRef.current.points) {
        const cx2 = (c as LivePoint & { _x?: number })._x;
        const cy2 = (c as LivePoint & { _y?: number })._y;
        if (cx2 == null || cy2 == null) continue;
        const d = Math.hypot(cx2 - mx, cy2 - my);
        if (d < bd) {
          bd = d;
          best = c;
        }
      }
      hover = best;
      const tip = tipRef.current;
      if (tip) {
        if (best) {
          const bx = (best as LivePoint & { _x?: number })._x ?? 0;
          const by = (best as LivePoint & { _y?: number })._y ?? 0;
          tip.innerHTML = `<b class="${styles.tipTitle}">${locationLabel(best)}</b><span class="${styles.tipSub}">${best.sessions} session${best.sessions === 1 ? "" : "s"} · ${best.activeNow} active now</span>`;
          tip.style.left = `${bx}px`;
          tip.style.top = `${by - 8}px`;
          tip.classList.add(styles.visible);
        } else {
          tip.classList.remove(styles.visible);
        }
      }
    };
    const onPointerLeave = () => {
      hover = null;
      tipRef.current?.classList.remove(styles.visible);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoom = Math.max(0.7, Math.min(2.2, zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
      resize();
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    const themeObserver = new MutationObserver(applyTheme);
    themeObserver.observe(page, { attributes: true, attributeFilter: ["data-theme"] });

    const arcInterval = setInterval(spawnArc, 1100);

    topojson_land(dots).then((loadedDots) => {
      dots = loadedDots;
      for (let i = 0; i < 5; i++) spawnArc();
      raf = requestAnimationFrame(frame);
    });

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      themeObserver.disconnect();
      clearInterval(arcInterval);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("wheel", onWheel);
    };
    // Mount once — mutable state lives in refs/closures above so the loop
    // always sees the latest data/spin/arcs without needing to restart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------------------------------------------------------- panels */
  const winLabel = windowSel === "24h" ? "24h" : "5 min";

  const countryRows = useMemo(() => {
    const by = new Map<string, number>();
    for (const p of data.points) {
      const key = p.country ?? "Unknown";
      by.set(key, (by.get(key) ?? 0) + p.sessions);
    }
    return Array.from(by.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7);
  }, [data.points]);

  const rowsFor = (t: Tab): [string, number][] => {
    if (t === "countries") return countryRows;
    if (t === "pages") return data.topPages.slice(0, 7).map((p) => [p.path, p.views]);
    if (t === "referrers") return data.referrers.slice(0, 7).map((r) => [r.source, r.sessions]);
    return data.devices.slice(0, 7).map((d) => [d.label, d.sessions]);
  };

  const secTitle: Record<Tab, string> = {
    countries: `Top countries · ${winLabel}`,
    pages: `Top pages · ${winLabel}`,
    referrers: `Referrers · ${winLabel}`,
    devices: `Devices & browsers · ${winLabel}`,
  };

  const items = rowsFor(tab);
  const max = Math.max(1, ...items.map(([, v]) => v));

  const elapsedSinceFetch = Math.round((Date.now() - fetchedAt) / 1000);
  void tick; // forces the 1s re-render this reads

  const avgMin = Math.floor(data.totals.avgSessionSeconds / 60);
  const avgSec = String(data.totals.avgSessionSeconds % 60).padStart(2, "0");

  return (
    <div ref={pageRef} className={styles.page} data-theme={theme}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.hdrLeft}>
            <span className={styles.crumb}>Live visitor globe</span>
            <span className={styles.sourceTag}>source: live · getLiveAnalytics()</span>
          </div>
          <div className={styles.hdrRight}>
            <button aria-pressed={windowSel === "live"} onClick={() => changeWindow(windowSel === "24h" ? "live" : "24h")}>
              {windowSel === "24h" ? "24h" : "Last 5 min"}
            </button>
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? "Light" : "Dark"}</button>
            <span className={styles.live}>
              <i className={styles.liveDot} />
              LIVE
            </span>
          </div>
        </header>
        <main className={styles.main}>
          <div className={styles.stage} ref={stageRef}>
            <canvas ref={canvasRef} className={`${styles.canvas} ${dragging ? styles.dragging : ""}`} />
            <div className={styles.kpis}>
              <div className={styles.kpi}>
                <div className={styles.kpiLabel}>Active now</div>
                <div className={styles.kpiValue}>{data.totals.activeNow.toLocaleString("en-US")}</div>
              </div>
              <div className={styles.kpi}>
                <div className={styles.kpiLabel}>Sessions · {winLabel}</div>
                <div className={styles.kpiValue}>{data.totals.sessions.toLocaleString("en-US")}</div>
              </div>
              <div className={styles.kpi}>
                <div className={styles.kpiLabel}>Countries</div>
                <div className={styles.kpiValue}>{data.totals.countries.toLocaleString("en-US")}</div>
              </div>
              <div className={styles.kpi}>
                <div className={styles.kpiLabel}>Avg. session</div>
                <div className={styles.kpiValue}>
                  {avgMin}:{avgSec}
                  <small>min</small>
                </div>
              </div>
            </div>
            <div className={styles.stageFooter}>
              <div className={styles.controls}>
                <button aria-pressed={!spin} onClick={() => setSpin((s) => !s)}>
                  {spin ? "Pause rotation" : "Resume rotation"}
                </button>
                <button aria-pressed={!showArcs} onClick={() => setShowArcs((s) => !s)}>
                  {showArcs ? "Hide arcs" : "Show arcs"}
                </button>
              </div>
              <div className={styles.hint}>drag to rotate · scroll to zoom</div>
            </div>
            <div ref={tipRef} className={styles.tip} />
          </div>
          <aside className={styles.aside}>
            <div className={styles.tabs}>
              {(["countries", "pages", "referrers", "devices"] as const).map((t) => (
                <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
                  {t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            <div className={styles.sec}>
              <h3>{secTitle[tab]}</h3>
              {items.length === 0 ? (
                <p className={styles.empty}>No data yet.</p>
              ) : (
                items.map(([k, v]) => (
                  <div key={k} className={styles.row}>
                    <span className={styles.rowKey}>{k}</span>
                    <span className={styles.rowNum}>{v.toLocaleString("en-US")}</span>
                    <span className={styles.rowBar}>
                      <i className={styles.rowBarFill} style={{ width: `${((v / max) * 100).toFixed(0)}%` }} />
                    </span>
                  </div>
                ))
              )}
            </div>
            <div className={styles.feed}>
              <h3>Live sessions</h3>
              <ul className={styles.feedList}>
                {data.recent.length === 0 ? (
                  <p className={styles.empty}>No sessions yet.</p>
                ) : (
                  data.recent.slice(0, 13).map((r, i) => (
                    <li key={i} className={styles.feedItem}>
                      <span className={styles.feedPin} />
                      <span className={styles.feedWho}>
                        {locationLabel(r)}
                        <em className={styles.feedPath}>{r.path ?? "—"}</em>
                      </span>
                      <span className={styles.feedTime}>{secondsAgoLabel(r.secondsAgo + Math.max(0, elapsedSinceFetch))}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}

/** Builds the dot lattice that fills landmasses on the globe, sampled from Natural Earth 110m. */
async function topojson_land(fallback: DotPoint[]): Promise<DotPoint[]> {
  try {
    const res = await fetch(WORLD_TOPOLOGY_URL);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const topo: any = await res.json();
    const land = topojson.feature(topo, topo.objects.countries);
    const dots: DotPoint[] = [];
    const step = 1.9;
    for (let lat = -84; lat <= 84; lat += step) {
      const n = Math.max(6, Math.round((360 / step) * Math.cos(lat * D2R)));
      for (let i = 0; i < n; i++) {
        const lon = -180 + (360 * i) / n;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (geoContains(land as any, [lon, lat])) dots.push({ p: [lon, lat] });
      }
    }
    return dots;
  } catch {
    return fallback;
  }
}
