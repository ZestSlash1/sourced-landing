"use client";

import { useEffect, useRef, useState, ReactNode, CSSProperties } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import dynamic from "next/dynamic";
import DotField from "@/components/DotField";
import NewsletterForm from "./newsletter-form";
import type { ProofBarData } from "./proof-bar";
import type { IdeaDrop } from "@/types/idea-drop";
import { trackEvent } from "@/lib/track-client";
import { resolveCurrency, formatPlanPrice, type Currency } from "@/lib/currency";
import { BorderBeam } from "@/components/magicui/border-beam";
import { ShineBorder } from "@/components/magicui/shine-border";
import { MagicCard } from "@/components/magicui/magic-card";
import { RainbowButton } from "@/components/magicui/rainbow-button";
import { AnimatedGradientText } from "@/components/magicui/animated-gradient-text";
import { Marquee } from "@/components/magicui/marquee";
import { Meteors } from "@/components/magicui/meteors";
import { ProceduralTextMask } from "@/components/procedural-text-mask";
import { Card3DTilt } from "@/components/card-3d-tilt";
import { RadarFallback } from "@/components/r3f/radar-fallback";

const ProofBar = dynamic(() => import("./proof-bar"), { loading: () => null });
const RadarSignalSphere = dynamic(
  () => import("@/components/r3f/radar-signal-sphere").then((m) => m.RadarSignalSphere),
  {
    ssr: false,
    loading: () => <RadarFallback />,
  }
);

gsap.registerPlugin(useGSAP);

type PlanKey = "builder-monthly" | "builder-yearly" | "studio-monthly" | "builder-founding";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout"));
    document.body.appendChild(script);
  });
}

const ideaCards = [
  { cover: "cover-1", tag: "Micro-SaaS", h: 58, title: "Client-ready P&L exports for solo bookkeepers", apis: "3 APIs matched", signals: "41 signals found", pct: 88, d: 0 },
  { cover: "cover-2", tag: "Chrome Ext", h: 58, title: "Auto-flag duplicate line items in shared Figma comment threads", apis: "1 API matched", signals: "19 signals", pct: 64, d: 0.08 },
  { cover: "cover-3", tag: "API Tool", h: 58, title: "Merge duplicate contacts across 3 CRMs in one call", apis: "4 APIs matched", signals: "27 signals", pct: 71, d: 0.16 },
  { cover: "cover-4", tag: "AI Wrapper", h: 58, title: "Turn a landlord's rent-roll spreadsheet into late-fee reminders, automatically", apis: "2 APIs matched", signals: "33 signals", pct: 80, d: 0.24 },
  { cover: "cover-5", tag: "Marketplace", h: 58, title: "Booking waitlist tool for niche tattoo studios", apis: "2 APIs matched", signals: "15 signals", pct: 52, d: 0.32 },
  { cover: "cover-6", tag: "Micro-SaaS", h: 58, title: "One-click GST invoice reconciliation for freelancers", apis: "3 APIs matched", signals: "52 signals", pct: 95, d: 0.4 },
];

const apiChips = [
  { name: "Open Exchange Rates", cat: "Finance" },
  { name: "REST Countries", cat: "Open Data" },
  { name: "Numverify", cat: "Phone" },
  { name: "PDFShift", cat: "Documents" },
  { name: "IPify", cat: "Geolocation" },
  { name: "Stripe", cat: "Billing" },
  { name: "Twilio", cat: "SMS & Voice" },
  { name: "Cloudinary", cat: "Media CDN" },
];

const sourceChips = [
  { name: "Hacker News", cat: "Show HN & Ask HN" },
  { name: "GitHub Issues", cat: "Open Source Signals" },
  { name: "GitLab Issues", cat: "DevOps & Tooling" },
  { name: "YouTube", cat: "Dev Discussions" },
  { name: "Bluesky", cat: "Tech Skepticism" },
  { name: "DevRant", cat: "Developer Rants" },
  { name: "Lobsters", cat: "Systems Architecture" },
  { name: "Codeberg", cat: "FLOSS Community" },
];

const agents = [
  { id: "claude", label: "Claude Code", cmd: "claude code brief.md" },
  { id: "cursor", label: "Cursor", cmd: "cursor .  →  paste brief in chat" },
  { id: "windsurf", label: "Windsurf", cmd: "windsurf .  →  paste brief in Cascade" },
  { id: "v0", label: "v0", cmd: "paste brief.md into v0.dev" },
  { id: "bolt", label: "Bolt", cmd: "paste brief.md into bolt.new" },
];

// Wraps any block in the scroll-reveal treatment (fade + rise, once, on first view).
function Reveal({
  children,
  delay = 0,
  scale = false,
  className = "",
  style = {},
}: {
  children: ReactNode;
  delay?: number;
  scale?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`${scale ? "reveal-scale" : "reveal"} ${className}`}
      style={{ ["--d" as string]: `${delay}s`, ...style }}
    >
      {children}
    </div>
  );
}

interface HomeClientProps {
  userEmail: string | null;
  proofBar: ProofBarData;
  featuredIdeas?: IdeaDrop[];
  sampleIdea?: IdeaDrop | null;
  country?: string | null;
}

const COVERS = ["cover-1", "cover-2", "cover-3", "cover-4", "cover-5", "cover-6"];

export default function HomeClient({
  userEmail,
  proofBar,
  featuredIdeas,
  sampleIdea,
  country,
}: HomeClientProps) {
  const snippetRef = useRef<HTMLDivElement | null>(null);
  const [agentId, setAgentId] = useState("claude");
  const agent = agents.find((a) => a.id === agentId)!;
  const [checkoutPending, setCheckoutPending] = useState<PlanKey | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [foundingRemaining, setFoundingRemaining] = useState<number | null>(null);
  const [currency, setCurrency] = useState<Currency>(() => resolveCurrency(country));

  // Slatebase Free Tier Signup Flow (Phase 1)
  const [freeEmail, setFreeEmail] = useState(userEmail || "");
  const [freeHoneypot, setFreeHoneypot] = useState("");
  const [freeStatus, setFreeStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [freeMessage, setFreeMessage] = useState<string | null>(null);
  const [isFreeFormOpen, setIsFreeFormOpen] = useState(false);

  async function handleFreeSignup(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!isFreeFormOpen && !userEmail) {
      setIsFreeFormOpen(true);
      return;
    }

    const emailToSubmit = (userEmail || freeEmail).trim();
    if (!emailToSubmit) {
      setFreeStatus("error");
      setFreeMessage("Please enter your email to get started.");
      return;
    }

    setFreeStatus("loading");
    setFreeMessage(null);

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailToSubmit,
          tier: "free",
          source: "pricing-card",
          hp: freeHoneypot,
        }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) {
        throw new Error(data.error || "We couldn't save your signup. Please try again.");
      }

      setFreeStatus("success");
      setFreeMessage(data.message || "You're on the list! Free tier access granted.");
      trackEvent("free_tier_signup", { source: "pricing-card" });
    } catch (err: unknown) {
      setFreeStatus("error");
      setFreeMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  const displayCards =
    featuredIdeas && featuredIdeas.length > 0
      ? featuredIdeas.slice(0, 6).map((idea, i) => ({
          slug: idea.slug,
          cover: COVERS[i % COVERS.length],
          tag: idea.category,
          h: 58,
          title: idea.title,
          apis: `${idea.matchedApis?.length ?? 0} APIs matched`,
          signals: `${idea.evidence?.length ?? 0} signals`,
          pct: idea.demandScore,
          tier: idea.tier,
          d: i * 0.08,
        }))
      : ideaCards.map((c) => ({ ...c, slug: "", tier: "builder" }));

  useEffect(() => {
    fetch("/api/founding-status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { remaining: number; total: number } | null) => {
        if (data) setFoundingRemaining(data.remaining);
      })
      .catch(() => {});
  }, []);

  const foundingActive = (foundingRemaining ?? 0) > 0;

  async function startCheckout(plan: PlanKey) {
    trackEvent("upgrade_cta_click", { plan });
    setCheckoutError(null);
    setCheckoutPending(plan);

    try {
      const res = await fetch("/api/razorpay/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      if (res.status === 401) {
        const next = `/?checkout=${plan}#pricing`;
        window.location.href = `/login?next=${encodeURIComponent(next)}`;
        return;
      }

      if (!res.ok) {
        setCheckoutError("Couldn't start checkout. Please try again.");
        return;
      }

      const { subscriptionId, keyId, email } = (await res.json()) as {
        subscriptionId: string;
        keyId: string;
        email: string;
      };

      await loadRazorpayScript();
      const razorpay = new window.Razorpay!({
        key: keyId,
        subscription_id: subscriptionId,
        name: "Sourced",
        description: plan.replace("-", " "),
        prefill: { email },
        theme: { color: "#6d5ef8" },
        handler: () => {
          window.location.href = "/account/topics?upgraded=1";
        },
      });
      razorpay.open();
    } catch {
      setCheckoutError("Couldn't start checkout. Please try again.");
    } finally {
      setCheckoutPending(null);
    }
  }

  // Resumes checkout after a login redirect round-trip (?checkout=<plan>).
  useEffect(() => {
    const plan = new URLSearchParams(window.location.search).get("checkout");
    if (plan === "builder-monthly" || plan === "builder-yearly" || plan === "studio-monthly" || plan === "builder-founding") {
      window.history.replaceState(null, "", window.location.pathname + window.location.hash);
      startCheckout(plan);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const revealEls = document.querySelectorAll(".reveal, .reveal-scale");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in-view");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach((el) => io.observe(el));

    const cards = document.querySelectorAll("#masonry .idea-card");
    const cardIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in-view");
            cardIO.unobserve(e.target);
          }
        });
      },
      { threshold: 0.2 }
    );
    cards.forEach((c) => cardIO.observe(c));

    return () => {
      io.disconnect();
      cardIO.disconnect();
    };
  }, []);

  // Crossfades the exported command snippet when the agent picker changes,
  // instead of the text snapping instantly.
  useGSAP(
    () => {
      if (!snippetRef.current) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(snippetRef.current, { opacity: 0, y: 4 }, { opacity: 1, y: 0, duration: 0.28, ease: "power2.out" });
      });
      return () => mm.revert();
    },
    { dependencies: [agentId], scope: snippetRef },
  );

  return (
    <>
      <div className="hero-dotfield-wrapper" aria-hidden="true">
        <DotField
          dotRadius={1.5}
          dotSpacing={14}
          bulgeStrength={67}
          glowRadius={160}
          sparkle={false}
          waveAmplitude={0}
          gradientFrom="rgba(91, 79, 247, 0.35)"
          gradientTo="rgba(168, 85, 247, 0.22)"
          glowColor="rgba(91, 79, 247, 0.16)"
        />
        <Meteors number={16} />
      </div>
      <a href="#main-content" className="skip-link">Skip to content</a>

      <main id="main-content">
      <header className="hero">
        <div className="wrap">
          <div style={{ marginBottom: 20 }}>
            <AnimatedGradientText badge>
              <span className="dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "#10B981", display: "inline-block", boxShadow: "0 0 8px #10B981" }}></span>
              <span>⚡ VERIFIED DROPS EVERY MONDAY MORNING</span>
            </AnimatedGradientText>
          </div>
          <h1 className="hero-title">
            <span className="line"><span>Real complaints,</span></span>
            <span className="line"><ProceduralTextMask text="triangulated." /></span>
          </h1>
          <p className="hero-sub">
            Three or more independent complaints about the same problem become an
            evidence-backed build brief, ready to paste into Claude Code, Cursor, or v0.
          </p>
          <div className="hero-cta-row">
            <RainbowButton href="#pricing">
              Browse this week&apos;s ideas ⚡
            </RainbowButton>
            <a className="btn btn-ghost" href="#sample">See a free one ↓</a>
          </div>

          <div className="agent-block">
            <span className="agent-label">Every brief exports ready for:</span>
            <div className="agent-picker" role="tablist" aria-label="Choose your build tool">
              {agents.map((a) => (
                <button
                  key={a.id}
                  role="tab"
                  id={`agent-tab-${a.id}`}
                  aria-selected={a.id === agentId}
                  aria-controls="agent-snippet-panel"
                  className={`agent-btn ${a.id === agentId ? "is-active" : ""}`}
                  onClick={() => setAgentId(a.id)}
                >
                  {a.label}
                </button>
              ))}
            </div>
            <div
              ref={snippetRef}
              className="agent-snippet mono"
              id="agent-snippet-panel"
              role="tabpanel"
              aria-labelledby={`agent-tab-${agentId}`}
            >
              <span className="prompt">$</span>
              <span>{agent.cmd}</span>
            </div>
          </div>

          <div className="hero-radar-container" style={{ width: "100%", maxWidth: 440, margin: "28px auto 16px" }}>
            <RadarSignalSphere />
          </div>
        </div>
      </header>

      <div className="masonry-peek">
        <div className="columns" id="masonry">
          {displayCards.map((c, i) => {
            const href = c.slug ? `/feed/${c.slug}` : "/feed";
            return (
              <Card3DTilt
                key={c.slug || i}
                className="idea-card-tilt-wrap"
                style={{ height: "100%", borderRadius: "var(--r-md)" }}
              >
                <MagicCard
                  className="idea-card"
                  gradientColor="rgba(124, 58, 237, 0.16)"
                  style={{ ["--d" as string]: `${c.d}s` }}
                >
                  <Link
                    href={href}
                    style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", height: "100%" }}
                  >
                    <div
                      className={`idea-cover ${c.cover}`}
                      style={{
                        height: c.h,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0 14px",
                      }}
                    >
                      <span className="tag">{c.tag}</span>
                      {c.tier !== "free" ? (
                        <span className="feed-badge" style={{ fontSize: 11, padding: "2px 7px", letterSpacing: "0.02em" }}>
                          🔒 {c.tier}+
                        </span>
                      ) : (
                        <span
                          className="feed-badge"
                          style={{ fontSize: 11, padding: "2px 7px", background: "rgba(16, 185, 129, 0.2)", color: "#10B981" }}
                        >
                          Free
                        </span>
                      )}
                    </div>
                    <div className="idea-body">
                      <p className="idea-card-title">{c.title}</p>
                      <div className="idea-apis">⌁ {c.apis}</div>
                      <div className="idea-foot">
                        <span>{c.signals}</span>
                        <div className="signal-bar" style={{ ["--pct" as string]: c.pct / 100 }}>
                          <span></span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </MagicCard>
              </Card3DTilt>
            );
          })}
        </div>
      </div>

      <ProofBar data={proofBar} />

      <section className="strip">
        <div className="wrap">
          <Reveal>
            <div className="eyebrow">The problem</div>
            <h2>Idea generators give you fiction.</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p>
              &ldquo;Build a todo app for dog walkers&rdquo; isn&rsquo;t a business. It&rsquo;s
              a hallucination with a UI. Every card in Sourced starts as a real complaint
              pulled from a forum, a review, or a job post, from someone already paying for
              a worse fix or no fix at all.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="section" id="how">
        <div className="wrap">
          <Reveal className="section-head">
            <div className="eyebrow">How it works</div>
            <h2>Three checks, not one prompt</h2>
            <p className="section-sub">Every idea earns its place before it reaches your feed.</p>
          </Reveal>
          <div className="stages">
            <Reveal delay={0}>
              <MagicCard className="stage" gradientColor="rgba(124, 58, 237, 0.16)">
                <div className="stage-icon">01 / HARVEST</div>
                <h3>Pulled from real complaints</h3>
                <p>Hacker News threads, GitHub and GitLab issues, Developer forums, and YouTube discussions: places people already describe what they&apos;d pay to fix.</p>
              </MagicCard>
            </Reveal>
            <Reveal delay={0.08}>
              <MagicCard className="stage" gradientColor="rgba(0, 240, 255, 0.14)">
                <div className="stage-icon">02 / VALIDATE</div>
                <h3>Scored before it ships</h3>
                <p>Ranked on repetition, an existing (mediocre) paid competitor, and whether a solo builder can actually ship it in weeks, not months.</p>
              </MagicCard>
            </Reveal>
            <Reveal delay={0.16}>
              <MagicCard className="stage" gradientColor="rgba(16, 185, 129, 0.16)">
                <div className="stage-icon">03 / PACKAGE</div>
                <h3>Handed to you build-ready</h3>
                <p>Buyer profile, proof-of-demand quote, MVP scope, matched APIs, and a step brief, formatted for the tool you picked above.</p>
              </MagicCard>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="section" id="apis">
        <div className="wrap">
          <Reveal className="section-head">
            <div className="eyebrow">Under the hood</div>
            <h2>Every idea comes wired to real APIs</h2>
            <p className="section-sub">
              Stage 3 of the pipeline matches each build brief against a structured copy of
              the public-apis directory (470k+ stars, MIT-licensed, maintained by the
              open-source community), so you&apos;re never staring at a brief wondering what
              actually powers it.
            </p>
          </Reveal>
          <div style={{ margin: "32px 0 28px", display: "flex", flexDirection: "column", gap: 14 }}>
            <Marquee pauseOnHover speed={30} gap="12px">
              {apiChips.map((a, i) => (
                <div className="api-chip" key={`api-${i}`}>
                  {a.name} <span>· {a.cat}</span>
                </div>
              ))}
            </Marquee>
            <Marquee pauseOnHover reverse speed={34} gap="12px">
              {sourceChips.map((s, i) => (
                <div
                  className="api-chip"
                  key={`src-${i}`}
                  style={{
                    borderColor: "rgba(124, 58, 237, 0.25)",
                    background: "rgba(16, 18, 26, 0.8)",
                  }}
                >
                  <span style={{ color: "var(--violet-deep)", fontWeight: 600 }}>⚡ {s.name}</span>{" "}
                  <span>· {s.cat}</span>
                </div>
              ))}
            </Marquee>
          </div>
          <Reveal className="source-note">
            <p>
              Full match list, auth type, and free-tier limits ship with every Builder+
              brief.{" "}
              <a className="source-link" href="https://github.com/public-apis/public-apis" target="_blank" rel="noopener noreferrer">
                Browse the source directory ↗
              </a>
            </p>
          </Reveal>
        </div>
      </section>

      <section className="section" id="sample">
        <div className="wrap">
          <Reveal className="section-head">
            <div className="eyebrow">This week&apos;s free card</div>
            <h2>One, in full. The rest are in your feed.</h2>
          </Reveal>
          <Reveal scale style={{ maxWidth: 740, margin: "0 auto" }}>
            <Card3DTilt maxTilt={6} style={{ borderRadius: 20 }}>
              <ShineBorder
                borderRadius={20}
                duration={18}
                color={[
                  "rgba(124, 58, 237, 0.55)",
                  "rgba(56, 189, 248, 0.45)",
                  "rgba(16, 185, 129, 0.35)",
                  "rgba(139, 92, 246, 0.5)",
                ]}
              >
                <div className="feature-card" style={{ maxWidth: "100%", margin: 0, border: "none", boxShadow: "none" }}>
                  <div className="feature-cover">
                    <span className="tag">{sampleIdea?.category ?? "Micro-SaaS"}</span>
                    <span className="score">{sampleIdea?.demandScore ?? 95}% demand signal</span>
                  </div>
                  <div className="feature-body">
                    <h3>{sampleIdea?.title ?? "Bookkeepers still hand-format P&Ls in Excel for every client, every month."}</h3>
                    <p>
                      {sampleIdea?.problem.summary ??
                        "41 separate complaints across developer forums and review sites in the last 90 days naming this exact gap. Several already pay a VA specifically to reformat exports by hand."}
                    </p>
                    <div className="feature-meta">
                      <div><div className="fm-label">Buyer</div><div className="fm-value">{sampleIdea?.problem.whoFeelsIt ?? "Solo bookkeepers"}</div></div>
                      <div>
                        <div className="fm-label">Build time</div>
                        <div className="fm-value">
                          {sampleIdea?.difficulty
                            ? sampleIdea.difficulty.soloWeekendProject
                              ? "~1 weekend"
                              : `~${sampleIdea.difficulty.estimatedHours} hrs`
                            : "~1 weekend"}
                        </div>
                      </div>
                      <div>
                        <div className="fm-label">Model</div>
                        <div className="fm-value">
                          {sampleIdea?.category === "Micro-SaaS" ? "$10–29/mo" : "Freemium / Usage"}
                        </div>
                      </div>
                      <div>
                        <div className="fm-label">Stack</div>
                        <div className="fm-value">
                          {sampleIdea?.launchStack && sampleIdea.launchStack.length > 0
                            ? sampleIdea.launchStack.map((s) => s.tool).slice(0, 2).join(" + ")
                            : "Next.js + Supabase"}
                        </div>
                      </div>
                      <div>
                        <div className="fm-label">APIs matched</div>
                        <div className="fm-value">
                          {sampleIdea?.matchedApis && sampleIdea.matchedApis.length > 0
                            ? sampleIdea.matchedApis.map((a) => a.name).slice(0, 2).join(", ")
                            : "Open Exchange Rates, PDFShift"}
                        </div>
                      </div>
                      <div><div className="fm-label">Opens in</div><div className="fm-value">{agent.label}</div></div>
                    </div>
                    {sampleIdea?.slug && (
                      <div style={{ marginTop: 22 }}>
                        <Link
                          href={`/feed/${sampleIdea.slug}`}
                          className="btn btn-primary"
                          style={{ padding: "8px 18px", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
                        >
                          Read full free build brief →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </ShineBorder>
            </Card3DTilt>
          </Reveal>
        </div>
      </section>

      <section className="section" id="pricing">
        <div className="wrap">
          <Reveal className="section-head">
            <div className="eyebrow">Pricing</div>
            <h2>Less than a coffee run, per idea</h2>
            <p className="section-sub">Cancel anytime. Every paid plan comes with a 7-day refund, no questions.</p>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: "var(--surface-sunken, #edeae3)",
                padding: "3px 4px",
                borderRadius: "999px",
                marginTop: 14,
                border: "1px solid var(--line)",
              }}
              role="group"
              aria-label="Currency selection"
            >
              <button
                type="button"
                onClick={() => setCurrency("USD")}
                style={{
                  padding: "4px 12px",
                  borderRadius: "999px",
                  fontSize: 12,
                  fontFamily: "var(--mono)",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  background: currency === "USD" ? "var(--ink)" : "transparent",
                  color: currency === "USD" ? "#fff" : "var(--ink-soft)",
                  transition: "all 0.15s ease",
                }}
              >
                USD ($)
              </button>
              <button
                type="button"
                onClick={() => setCurrency("INR")}
                style={{
                  padding: "4px 12px",
                  borderRadius: "999px",
                  fontSize: 12,
                  fontFamily: "var(--mono)",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  background: currency === "INR" ? "var(--ink)" : "transparent",
                  color: currency === "INR" ? "#fff" : "var(--ink-soft)",
                  transition: "all 0.15s ease",
                }}
              >
                INR (₹)
              </button>
            </div>
          </Reveal>
          <div className="pricing-grid">
            <Reveal delay={0} className="plan">
              <div className="plan-name">Free</div>
              <div className="plan-tag">Try before you commit</div>
              <div className="plan-price">$0</div>
              <ul className="plan-features">
                <li>1 full idea card / month</li>
                <li>Headlines of every other card</li>
                <li>API match: name only, no docs</li>
                <li>No card required</li>
              </ul>
              {freeStatus === "success" ? (
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: "var(--r-sm)",
                    background: "rgba(198, 255, 61, 0.25)",
                    border: "1px solid rgba(198, 255, 61, 0.6)",
                    color: "#3F6B00",
                    fontSize: 13.5,
                    fontWeight: 600,
                    textAlign: "center",
                    lineHeight: 1.4,
                  }}
                >
                  ✓ {freeMessage || "You're in! Free tier access granted."}
                </div>
              ) : isFreeFormOpen && !userEmail ? (
                <form
                  onSubmit={handleFreeSignup}
                  noValidate
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <input
                    type="text"
                    name="company_hp"
                    value={freeHoneypot}
                    onChange={(e) => setFreeHoneypot(e.target.value)}
                    style={{ display: "none" }}
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                  />
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={freeEmail}
                    onChange={(e) => {
                      setFreeEmail(e.target.value);
                      if (freeStatus === "error") setFreeStatus("idle");
                    }}
                    required
                    disabled={freeStatus === "loading"}
                    autoFocus
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "var(--r-sm)",
                      border:
                        freeStatus === "error"
                          ? "1.5px solid var(--coral, #e5533d)"
                          : "1.5px solid var(--line)",
                      background: "#fff",
                      color: "var(--ink)",
                      fontSize: 13.5,
                      fontFamily: "inherit",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  <button
                    type="submit"
                    className="plan-btn"
                    disabled={freeStatus === "loading"}
                    style={{
                      background: "var(--violet)",
                      borderColor: "var(--violet)",
                      color: "#fff",
                    }}
                  >
                    {freeStatus === "loading" ? "Claiming access…" : "Claim free access"}
                  </button>
                  {freeStatus === "error" && freeMessage && (
                    <div
                      style={{
                        color: "var(--coral, #e5533d)",
                        fontSize: 12,
                        textAlign: "center",
                      }}
                    >
                      {freeMessage}
                    </div>
                  )}
                </form>
              ) : (
                <>
                  <button
                    type="button"
                    className="plan-btn"
                    onClick={() => handleFreeSignup()}
                    disabled={freeStatus === "loading"}
                  >
                    {freeStatus === "loading"
                      ? "Claiming access…"
                      : userEmail
                      ? `Claim free tier (${userEmail})`
                      : "Start free"}
                  </button>
                  {freeStatus === "error" && freeMessage && (
                    <div
                      style={{
                        color: "var(--coral, #e5533d)",
                        fontSize: 12,
                        textAlign: "center",
                        marginTop: 6,
                      }}
                    >
                      {freeMessage}
                    </div>
                  )}
                </>
              )}
            </Reveal>
            <Reveal delay={0.08} className="plan featured" style={{ position: "relative" }}>
              <BorderBeam duration={16} colorFrom="rgba(138, 43, 226, 0.75)" colorTo="rgba(6, 182, 212, 0.65)" />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div className="plan-name" style={{ margin: 0 }}>Builder</div>
                <span
                  style={{
                    fontSize: 10.5,
                    fontFamily: "var(--mono)",
                    fontWeight: 700,
                    padding: "3px 9px",
                    borderRadius: "999px",
                    background: "rgba(124, 58, 237, 0.22)",
                    color: "var(--violet-deep)",
                    border: "1px solid rgba(124, 58, 237, 0.4)",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  ⚡ Most Popular
                </span>
              </div>
              <div className="plan-tag">The full weekly feed · most common pick</div>
              {(() => {
                const builderMonthly = formatPlanPrice("builder-monthly", currency);
                const builderFounding = formatPlanPrice("builder-founding", currency);
                const builderYearly = formatPlanPrice("builder-yearly", currency);
                return (
                  <>
                    {foundingActive ? (
                      <div className="plan-price">
                        <span className="plan-price-slash">{builderFounding.slash}</span> {builderFounding.primary}<span>{builderFounding.period}</span>
                        {currency === "INR" && builderFounding.approx && (
                          <span style={{ fontSize: 12, fontWeight: 400, color: "var(--ink-soft)", marginLeft: 6 }}>
                            {builderFounding.approx}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="plan-price">
                        {builderMonthly.primary}<span>{builderMonthly.period}</span>
                        {currency === "INR" && builderMonthly.approx && (
                          <span style={{ fontSize: 12, fontWeight: 400, color: "var(--ink-soft)", marginLeft: 6 }}>
                            {builderMonthly.approx}
                          </span>
                        )}
                      </div>
                    )}
                    <button
                      type="button"
                      className="plan-old"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit" }}
                      onClick={() => startCheckout("builder-yearly")}
                      disabled={checkoutPending !== null}
                    >
                      {builderYearly.yearlyButtonText}
                    </button>
                  </>
                );
              })()}
              <ul className="plan-features">
                <li>4 full idea cards every month</li>
                <li>Full searchable archive</li>
                <li>Buyer profile + build brief on every card</li>
                <li>Full API match: auth type, free-tier limits, docs links</li>
              </ul>
              <RainbowButton
                onClick={() => startCheckout(foundingActive ? "builder-founding" : "builder-monthly")}
                disabled={checkoutPending !== null}
                style={{ width: "100%" }}
              >
                {checkoutPending === "builder-monthly" || checkoutPending === "builder-founding"
                  ? "Starting…"
                  : "Get Builder ⚡"}
              </RainbowButton>
            </Reveal>
            <Reveal delay={0.16} className="plan">
              <div className="plan-name">Studio</div>
              <div className="plan-tag">For your specific niche</div>
              {(() => {
                const studioMonthly = formatPlanPrice("studio-monthly", currency);
                return (
                  <div className="plan-price">
                    {studioMonthly.primary}<span>{studioMonthly.period}</span>
                    {currency === "INR" && studioMonthly.approx && (
                      <span style={{ fontSize: 12, fontWeight: 400, color: "var(--ink-soft)", marginLeft: 6 }}>
                        {studioMonthly.approx}
                      </span>
                    )}
                  </div>
                );
              })()}
              <ul className="plan-features">
                <li>Everything in Builder</li>
                <li>Instant dev database hosting bundle</li>
                <li>One custom idea request / month</li>
                <li>$0 launch stack: free-tier hosting, auth &amp; email picks per idea</li>
                <li>48-hour early access to new cards</li>
              </ul>
              <button
                type="button"
                className="plan-btn"
                onClick={() => startCheckout("studio-monthly")}
                disabled={checkoutPending !== null}
              >
                {checkoutPending === "studio-monthly" ? "Starting…" : "Get Studio"}
              </button>
            </Reveal>
          </div>
          <div style={{ textAlign: "center", marginTop: 22, fontSize: 13, color: "var(--ink-soft)" }}>
            {currency === "USD"
              ? "Billed securely in equivalent INR (~₹399 / ₹999) via Razorpay · Accepts all international Visa, Mastercard, and Amex cards with automatic bank conversion"
              : "Billed securely via Razorpay in INR · Accepts all international Visa, Mastercard, and Amex cards"}
          </div>
          {checkoutError && (
            <p style={{ textAlign: "center", color: "var(--coral, #e5533d)", marginTop: 16 }}>
              {checkoutError}
            </p>
          )}
          {foundingRemaining !== null && (
            <Reveal className="founding">
              <span className="founding-label">Founding rate</span>
              {foundingActive ? (
                <span>
                  <b>{foundingRemaining}</b> of 100 founding spots left. Keep <b>{currency === "USD" ? "$3.70/mo" : "₹310/mo"}</b> on Builder for
                  life. No expiry games, just first 100.
                </span>
              ) : (
                <span>All 100 founding spots are taken. Builder is now {currency === "USD" ? "$4.80/mo" : "₹399/mo"} for new subscribers.</span>
              )}
            </Reveal>
          )}
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <Reveal className="section-head">
            <div className="eyebrow">FAQ</div>
            <h2>Before you ask</h2>
          </Reveal>
          <div className="faq-list">
            <Reveal delay={0} className="faq-item">
              <h3>Where do the matched APIs come from?</h3>
              <p>
                From a structured, regularly-synced copy of the{" "}
                <a href="https://github.com/public-apis/public-apis" target="_blank" rel="noopener noreferrer">public-apis directory</a>
                , a 470k-star, MIT-licensed community list. We match categories to your
                idea&apos;s build brief; full docs links and rate limits ship on Builder and
                above.
              </p>
            </Reveal>
            <Reveal delay={0.05} className="faq-item">
              <h3>Which coding tool does this work with?</h3>
              <p>Any AI-assisted builder: Claude Code, Cursor, Windsurf, v0, Bolt, and more. Pick yours in the hero above and every build brief formats for it automatically.</p>
            </Reveal>
            <Reveal delay={0.1} className="faq-item">
              <h3>Is this just ChatGPT with extra steps?</h3>
              <p>No. Every card starts from a real, sourced complaint, not a generated headline. You can see the source signal behind each idea, not just the pitch.</p>
            </Reveal>
            <Reveal delay={0.15} className="faq-item">
              <h3>What if I build one and it doesn&apos;t work?</h3>
              <p>Some won&apos;t. That&apos;s true of every idea anywhere. Sourced removes the guessing on whether anyone wants it in the first place; the execution risk is still yours, same as any build.</p>
            </Reveal>
          </div>
        </div>
      </section>

      <Reveal scale className="cta-band">
        <h2>Your next build is already out there complaining on developer forums and issue trackers.</h2>
        <p>Go find it, or let Sourced bring it to you every Monday.</p>
        <RainbowButton href="#pricing">
          Browse this week&apos;s ideas ⚡
        </RainbowButton>
      </Reveal>

      <section className="newsletter-section" aria-labelledby="newsletter-heading">
        <div className="wrap">
          <div className="newsletter-panel">
            <div>
              <h2 id="newsletter-heading">One verified problem a week.</h2>
              <p>Get the evidence, the signal count, and the build brief when the next drop is ready.</p>
            </div>
            <NewsletterForm sourcePath="/" />
          </div>
        </div>
      </section>
      </main>

      <footer>
        <div className="wrap">
          <p>SOURCED · Real problems, sourced. Ready to build.</p>
          <p className="credit">
            API matching built on the{" "}
            <a href="https://github.com/public-apis/public-apis" target="_blank" rel="noopener noreferrer">public-apis</a>{" "}
            directory (MIT) ↗
          </p>
          <p className="credit">Transparency</p>
          <div className="transparency-links">
            <a href="/methodology">How the pipeline works</a>
            <a href="/rejected">Rejected clusters</a>
          </div>
          <p style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 16 }}>
            © {new Date().getFullYear()} Sourced. All rights reserved. Automated harvesting, wholesale scraping, and commercial resale of curated drops or database schemas is strictly prohibited.
          </p>
        </div>
      </footer>
    </>
  );
}
