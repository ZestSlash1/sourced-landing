"use client";

import { useEffect, useRef, useState, ReactNode, CSSProperties } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import dynamic from "next/dynamic";
import NewsletterForm from "./newsletter-form";
import type { ProofBarData } from "./proof-bar";
import ResearchSample from "@/components/research-sample";
import type { IdeaDrop } from "@/types/idea-drop";
import { trackEvent } from "@/lib/track-client";
import { resolveCurrency, formatPlanPrice, type Currency } from "@/lib/currency";
import { BorderBeam } from "@/components/magicui/border-beam";
import { ShineBorder } from "@/components/magicui/shine-border";
import { MagicCard } from "@/components/magicui/magic-card";
import { RainbowButton } from "@/components/magicui/rainbow-button";
import { Marquee } from "@/components/magicui/marquee";
import { Meteors } from "@/components/magicui/meteors";
import { Card3DTilt } from "@/components/card-3d-tilt";
import { DiscoverButton } from "@/components/obsidian/discover-button";
import { SplitShowcase } from "@/components/obsidian/split-showcase";
import type { SourceTallies } from "@/lib/ingest/types";

const ProofBar = dynamic(() => import("./proof-bar"), { loading: () => null });
const PipelineField = dynamic(
  () => import("@/components/hero/pipeline-field").then((m) => m.PipelineField),
  {
    ssr: false,
    loading: () => null,
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
  onPointerMove,
}: {
  children: ReactNode;
  delay?: number;
  scale?: boolean;
  className?: string;
  style?: CSSProperties;
  onPointerMove?: (e: React.PointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className={`${scale ? "reveal-scale" : "reveal"} ${className}`}
      style={{ ["--d" as string]: `${delay}s`, ...style }}
      onPointerMove={onPointerMove}
    >
      {children}
    </div>
  );
}

interface HomeClientProps {
  userEmail: string | null;
  proofBar: ProofBarData;
  featuredIdeas?: Array<Pick<IdeaDrop, "slug" | "title" | "category" | "tier" | "demandScore"> & { apiCount: number; evidenceCount: number }>;
  
  country?: string | null;
  sourceTallies?: SourceTallies;
}

const COVERS = ["cover-1", "cover-2", "cover-3", "cover-4", "cover-5", "cover-6"];

export default function HomeClient({
  userEmail,
  proofBar,
  featuredIdeas,
  country,
  sourceTallies,
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
          apis: `${idea.apiCount} APIs matched`,
          signals: `${idea.evidenceCount} evidence entries`,
          pct: idea.demandScore,
          tier: idea.tier,
          d: i * 0.08,
        }))
      : [];

  useEffect(() => {
    fetch("/api/founding-status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { remaining: number; total: number } | null) => {
        if (data) setFoundingRemaining(data.remaining);
      })
      .catch(() => {});
  }, []);

  const foundingActive = (foundingRemaining ?? 0) > 0;

  const handleCardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

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
    <div className="sourced-home">
      <style>{`
        .sourced-home .brief-workbench {
          background: linear-gradient(165deg, rgba(28, 28, 38, 0.95) 0%, rgba(18, 18, 24, 0.98) 40%, rgba(13, 13, 18, 1) 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }
        .sourced-home .dossier-card {
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .sourced-home .dossier-card:hover {
          transform: translateY(-2px);
          border-color: rgba(167, 139, 250, 0.4);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(124, 58, 237, 0.12);
        }
        .sourced-home .agent-btn {
          transition: all 0.18s ease;
        }
        .sourced-home .agent-btn.is-active {
          background: rgba(124, 58, 237, 0.25);
          border-color: rgba(167, 139, 250, 0.45);
          color: #fff;
          box-shadow: 0 0 12px rgba(124, 58, 237, 0.2);
        }
        .sourced-home .api-chip {
          transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
        }
        .sourced-home .api-chip:hover {
          transform: translateY(-1px);
          border-color: rgba(167, 139, 250, 0.4);
          background: rgba(25, 27, 38, 0.9);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
        }
        .sourced-home .faq-item {
          background: #0d0f16;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--r-md);
          padding: 24px 28px;
          transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
        }
        .sourced-home .faq-item:hover {
          border-color: rgba(255, 255, 255, 0.16);
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        }
        .sourced-home .plan-card {
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .sourced-home .plan-card:hover {
          border-color: rgba(167, 139, 250, 0.3);
        }
        .sourced-home .plan-card.featured:hover {
          border-color: var(--violet);
        }
      `}</style>
      <a href="#main-content" className="skip-link">Skip to content</a>

      <main id="main-content">
      <header className="hero">
        <div className="wrap hero-layout">
        <div className="hero-copy">
          <div className="drop-cadence"><span aria-hidden="true" /> Complaint research for your next build.</div>
          <h1 className="hero-title">
            Real problems.<br />
            <span className="hero-title-muted">Your next</span><br />
            <span className="hero-title-accent">weekend build.</span>
          </h1>
          <p className="hero-sub">
            Inspect the complaints, compare the alternatives,
            and choose a small problem to test before you build.
          </p>
          <div className="hero-cta-row">
            <DiscoverButton href="#sample" label="Read the complete free sample" />
            <Link className="hero-sample-link" href="/feed">Browse the feed <span aria-hidden="true">↗</span></Link>
          </div>
          <p className="hero-footnote"><span aria-hidden="true">✓</span> Real sources <span aria-hidden="true">·</span> Scoped MVPs <span aria-hidden="true">·</span> Agent-ready prompts</p>
        </div>

        <div className="brief-workbench" aria-label="Build brief preview">
          <div className="workbench-topline mono"><span><span className="workbench-dot" /> SOURCED / FIELD NOTES</span><span>01 — BUILD BRIEF</span></div>
          <div className="signal-ingress">
            <div className="hero-pipeline-wrap" aria-hidden="true">
              <PipelineField weights={[
                sourceTallies?.hackernews ?? 0,
                sourceTallies?.github ?? 0,
                sourceTallies?.stackexchange ?? 0,
                sourceTallies?.devto ?? 0,
                sourceTallies?.lobsters ?? 0,
              ]} />
              <div className="hero-veil" />
            </div>
            <div className="source-tally" aria-label="Tracked source signals">
              <div className="row">HN <span className="n">{sourceTallies?.hackernews ?? 0}</span></div>
              <div className="row">GH <span className="n">{sourceTallies?.github ?? 0}</span></div>
              <div className="row">SE <span className="n">{sourceTallies?.stackexchange ?? 0}</span></div>
              <div className="row">DEV <span className="n">{sourceTallies?.devto ?? 0}</span></div>
              <div className="row">LOB <span className="n">{sourceTallies?.lobsters ?? 0}</span></div>
            </div>
            <div className="pipeline-labels" aria-hidden="true">
              <span className="stage">ingest</span><span className="stage">embed</span>
              <span className="stage">cluster</span><span className="stage">draft</span><span className="stage">publish</span>
            </div>
          </div>
          <Link className="dossier-card" href="#sample">
            <div className="dossier-meta mono"><span>HISTORICAL WALKTHROUGH</span><span>↗</span></div>
            <h2>A migration review notebook for Prisma teams</h2>
            <p>Three linked discussions, current alternatives, a small MVP, and a first validation plan.</p>
            <div className="dossier-tags"><span>Developer tools</span><span>Complete free sample</span></div>
            <div className="dossier-footer"><span>Historical evidence → MVP → validation</span><span className="mono">brief.md</span></div>
          </Link>
          <div className="agent-block">
            <span className="agent-label mono">YOUR TOOL. YOUR WORKFLOW.</span>
            <div className="agent-picker" role="tablist" aria-label="Choose your build tool">
              {agents.map((a) => (
                <button
                  key={a.id}
                  role="tab"
                  id={`agent-tab-${a.id}`}
                  aria-selected={a.id === agentId}
                  aria-controls="agent-snippet-panel"
                  className={`agent-btn ${a.id === agentId ? "is-active" : ""}`}
                  tabIndex={a.id === agentId ? 0 : -1}
                  onKeyDown={(event) => {
                    const current = agents.findIndex((item) => item.id === a.id);
                    const next = event.key === "ArrowRight" ? (current + 1) % agents.length
                      : event.key === "ArrowLeft" ? (current - 1 + agents.length) % agents.length
                      : event.key === "Home" ? 0 : event.key === "End" ? agents.length - 1 : -1;
                    if (next < 0) return;
                    event.preventDefault();
                    setAgentId(agents[next].id);
                    document.getElementById(`agent-tab-${agents[next].id}`)?.focus();
                  }}
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
              tabIndex={0}
            >
              <span className="prompt">$</span>
              <span>{agent.cmd}</span>
            </div>
          </div>
        </div>

        </div>
      </header>

      <div className="masonry-peek">
        <div className="wrap collection-heading"><div><span className="eyebrow">THE IDEA SHELF</span><h2>A few problems worth solving.</h2></div><Link href="/feed">Explore all drops <span aria-hidden="true">↗</span></Link></div>
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
                      <span className="idea-index mono">BRIEF / {String(i + 1).padStart(2, "0")}</span>
                      <p className="idea-card-title">{c.title}</p>
                      <div className="idea-apis">⌁ {c.apis}</div>
                      <div className="idea-foot">
                        <span>{c.signals}</span>
                        <span className="idea-demand mono">{c.pct}<span>/100 demand</span></span>
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
            <h2>From someone&apos;s headache<br />to your head start.</h2>
            <p className="section-sub">Follow the evidence. Then open your editor.</p>
          </Reveal>
          <SplitShowcase items={[
            {
              eyebrow: "01 / THE SIGNAL",
              title: "A complaint is a starting point.",
              description: "We look for independent people describing the same problem, then cluster the signals and review the evidence.",
              href: "/methodology",
              action: "See how we source",
              visual: <div className="signal-stack"><span><b>HN</b> A recurring pain point <i>↗</i></span><span><b>GH</b> An unresolved issue <i>↗</i></span><span><b>SE</b> Another workaround <i>↗</i></span><small>3+ independent signals → one problem</small></div>,
            },
            {
              eyebrow: "02 / THE HEAD START",
              title: "A brief gets you building.",
              description: "Know who it is for, what to ship first, and which APIs to use. Take the scoped brief straight into your coding agent.",
              href: "#sample",
              action: "Open a sample brief",
              visual: <div className="brief-stack"><div className="brief-sheet"><span className="mono">brief.md <span>↗</span></span><strong>Your next build</strong><div><span>✓ Buyer & problem</span><span>✓ MVP scope</span><span>✓ APIs & agent prompts</span></div></div></div>,
            },
          ]} />
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
            <p className="section-sub">The right building blocks, already researched. Each brief is matched against the open-source public-apis directory, with docs and free-tier limits on Builder and above.</p>
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
          <div className="section-head"><h2>See the research before you subscribe.</h2><p className="section-sub">A complete example, including the reasons you might choose not to build it. No account required.</p></div>
          <ResearchSample />
        </div>
      </section>

      <section className="section" id="pricing">
        <div className="wrap">
          <Reveal className="section-head">
            <div className="eyebrow">Pricing</div>
            <h2>Inspect the sample. Then choose your access.</h2>
            <p className="section-sub">Cancel anytime. Every paid plan comes with a 7-day refund, no questions. <a href="#sample">Read the complete sample first →</a></p>
            <div
              className="currency-picker"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: "rgba(255, 255, 255, 0.05)",
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
                aria-pressed={currency === "USD"}
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
                  color: currency === "USD" ? "var(--bg)" : "var(--ink-soft)",
                  transition: "all 0.15s ease",
                }}
              >
                USD ($)
              </button>
              <button
                type="button"
                aria-pressed={currency === "INR"}
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
                  color: currency === "INR" ? "var(--bg)" : "var(--ink-soft)",
                  transition: "all 0.15s ease",
                }}
              >
                INR (₹)
              </button>
            </div>
          </Reveal>
          <p className="research-note">Studio currently provides unlimited brief access. Custom research requests, guaranteed turnaround, revisions, hosted databases, and early delivery are not available in this release.</p>
          <div className="pricing-grid">
            <Reveal delay={0} className="plan plan-card" onPointerMove={handleCardPointerMove}>
              <div className="plan-name">Free</div>
              <div className="plan-desc">Browse every idea and its evidence, no card required.</div>
              <div className="plan-price">
                <span className="amount">{currency === "INR" ? "₹0" : "$0"}</span>
                <span className="period">/month</span>
              </div>
              <ul className="plan-features">
                <li>1 full idea card / month</li>
                <li>Headlines of every other card</li>
                <li>API match: name only, no docs</li>
                <li>No card required</li>
              </ul>
              {freeStatus === "success" ? (
                <div
                  className="free-signup-success"
                  role="status"
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
                    aria-label="Email for free access"
                    aria-invalid={freeStatus === "error"}
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
                      background: "var(--bg)",
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
            <Reveal
              delay={0.08}
              className="plan plan-card featured"
              style={{ position: "relative" }}
              onPointerMove={handleCardPointerMove}
            >
              <BorderBeam duration={16} colorFrom="rgba(167, 139, 250, 0.65)" colorTo="rgba(124, 58, 237, 0.25)" />
              <div className="plan-tag">4 new unlocks / month</div>
              <div className="plan-name">Builder</div>
              <div className="plan-desc">For comparing scoped briefs and testing one project at a time.</div>
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
                <li>4 new full brief unlocks per calendar month</li>
                <li>Search the archive; revisit prior unlocks anytime</li>
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
            <Reveal delay={0.16} className="plan plan-card" onPointerMove={handleCardPointerMove}>
              <div className="plan-name">Studio</div>
              <div className="plan-desc">For teams and serial builders working the backlog.</div>
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
                <li>Unlimited full brief access</li>
                <li>Downloadable build specs and database schemas</li>
                <li>Launch-stack suggestions with provider limits to check</li>
                <li>Save opportunities and review evidence changes in Account</li>
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
              ? "USD figures are approximate display equivalents. Checkout charges INR: Builder ₹399/month; Studio ₹999/month. International payment activation is pending."
              : "Checkout charges INR via Razorpay: Builder ₹399/month; Studio ₹999/month. International payment activation is pending."}
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
                From a structured copy of the{" "}
                <a href="https://github.com/public-apis/public-apis" target="_blank" rel="noopener noreferrer">public-apis directory</a>
                , an MIT-licensed community list. We match categories to your
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
              <p>Complaints help identify problems to investigate. They do not establish willingness to pay, switching intent, or a viable market. Test the buyer and the smallest useful workflow before building.</p>
            </Reveal>
          </div>
        </div>
      </section>

      <Reveal scale className="cta-band">
        <span className="eyebrow">LESS GUESSING. MORE BUILDING.</span>
        <h2>Start with a problem<br />someone already has.</h2>
        <p>Your next build is waiting in the evidence.</p>
        <DiscoverButton href="/feed" label="Explore the idea feed" />
      </Reveal>

      <section className="newsletter-section" aria-labelledby="newsletter-heading">
        <div className="wrap">
          <div className="newsletter-panel">
            <div>
              <h2 id="newsletter-heading">Get the next published brief.</h2>
              <p>Join the newsletter for new drops. Your saved shortlist is reviewed in Account; it does not send automatic evidence alerts.</p>
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
    </div>
  );
}
