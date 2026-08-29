"use client";

import { useEffect, useRef, useState, ReactNode } from "react";

const ideaCards = [
  { cover: "cover-1", tag: "Micro-SaaS", h: 56, title: "Client-ready P&L exports for solo bookkeepers", apis: "3 APIs matched", signals: "41 signals found", pct: 88, d: 0 },
  { cover: "cover-2", tag: "Chrome Ext", h: 80, title: "Auto-flag duplicate line items in shared Figma comment threads", apis: "1 API matched", signals: "19 signals", pct: 64, d: 0.08 },
  { cover: "cover-3", tag: "API Tool", h: 56, title: "Merge duplicate contacts across 3 CRMs in one call", apis: "4 APIs matched", signals: "27 signals", pct: 71, d: 0.16 },
  { cover: "cover-4", tag: "AI Wrapper", h: 80, title: "Turn a landlord's rent-roll spreadsheet into late-fee reminders, automatically", apis: "2 APIs matched", signals: "33 signals", pct: 80, d: 0.24 },
  { cover: "cover-5", tag: "Marketplace", h: 56, title: "Booking waitlist tool for niche tattoo studios", apis: "2 APIs matched", signals: "15 signals", pct: 52, d: 0.32 },
  { cover: "cover-6", tag: "Micro-SaaS", h: 56, title: "One-click GST invoice reconciliation for freelancers", apis: "3 APIs matched", signals: "52 signals", pct: 95, d: 0.4 },
];

const apiChips = [
  { name: "Open Exchange Rates", cat: "Finance" },
  { name: "REST Countries", cat: "Open Data" },
  { name: "Numverify", cat: "Phone" },
  { name: "PDFShift", cat: "Documents" },
  { name: "IPify", cat: "Geolocation" },
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
}: {
  children: ReactNode;
  delay?: number;
  scale?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`${scale ? "reveal-scale" : "reveal"} ${className}`}
      style={{ ["--d" as string]: `${delay}s` }}
    >
      {children}
    </div>
  );
}

export default function Home() {
  const navRef = useRef<HTMLElement | null>(null);
  const [agentId, setAgentId] = useState("claude");
  const agent = agents.find((a) => a.id === agentId)!;

  useEffect(() => {
    const nav = navRef.current;
    const onScroll = () => {
      if (!nav) return;
      if (window.scrollY > 12) nav.classList.add("scrolled");
      else nav.classList.remove("scrolled");
    };
    window.addEventListener("scroll", onScroll, { passive: true });

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
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
      cardIO.disconnect();
    };
  }, []);

  return (
    <>
      <nav ref={navRef}>
        <div className="brand">
          <div className="brand-mark">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M4 12L10 18L20 6" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="brand-name">Sourced</div>
        </div>
        <div className="nav-links">
          <a href="#how">How it works</a>
          <a href="#apis">API match</a>
          <a href="#sample">Sample idea</a>
          <a href="#pricing">Pricing</a>
        </div>
        <a className="nav-cta" href="#pricing">Get started</a>
      </nav>

      <header className="hero">
        <div className="wrap">
          <div className="hero-badge"><span className="dot"></span> New ideas dropped every Monday</div>
          <h1 className="hero-title">
            <span className="line"><span>You can build</span></span>
            <span className="line"><span className="accent">Stop guessing what.</span></span>
          </h1>
          <p className="hero-sub">
            Sourced hands vibe coders real problems people already complain about — with
            proof someone will pay for the fix, matching free APIs to build it with, and a
            brief ready for whichever tool you build with.
          </p>
          <div className="hero-cta-row">
            <a className="btn btn-primary" href="#pricing">Browse this week&apos;s ideas</a>
            <a className="btn btn-ghost" href="#sample">See a free one ↓</a>
          </div>

          <div className="agent-block">
            <span className="agent-label">Every brief exports ready for —</span>
            <div className="agent-picker" role="tablist" aria-label="Choose your build tool">
              {agents.map((a) => (
                <button
                  key={a.id}
                  className={`agent-btn ${a.id === agentId ? "is-active" : ""}`}
                  onClick={() => setAgentId(a.id)}
                >
                  {a.label}
                </button>
              ))}
            </div>
            <div className="agent-snippet mono">
              <span className="prompt">$</span>
              <span>{agent.cmd}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="masonry-peek">
        <div className="columns" id="masonry">
          {ideaCards.map((c, i) => (
            <div className="idea-card" key={i} style={{ ["--d" as string]: `${c.d}s` }}>
              <div className={`idea-cover ${c.cover}`} style={{ height: c.h }}>
                <span className="tag">{c.tag}</span>
              </div>
              <div className="idea-body">
                <h4>{c.title}</h4>
                <div className="idea-apis">⌁ {c.apis}</div>
                <div className="idea-foot">
                  <span>{c.signals}</span>
                  <div className="signal-bar" style={{ ["--pct" as string]: `${c.pct}%` }}><span></span></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <section className="strip">
        <div className="wrap">
          <Reveal>
            <div className="eyebrow">The problem</div>
            <h2>Idea generators give you fiction.</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p>
              &quot;Build a todo app for dog walkers&quot; isn&apos;t a business — it&apos;s
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
            <Reveal delay={0} className="stage">
              <div className="stage-icon">01 / HARVEST</div>
              <h3>Pulled from real complaints</h3>
              <p>Reddit threads, 1-star G2 reviews of paid tools, and recurring Upwork gigs — places people already describe what they&apos;d pay to fix.</p>
            </Reveal>
            <Reveal delay={0.08} className="stage">
              <div className="stage-icon">02 / VALIDATE</div>
              <h3>Scored before it ships</h3>
              <p>Ranked on repetition, an existing (mediocre) paid competitor, and whether a solo builder can actually ship it in weeks, not months.</p>
            </Reveal>
            <Reveal delay={0.16} className="stage">
              <div className="stage-icon">03 / PACKAGE</div>
              <h3>Handed to you build-ready</h3>
              <p>Buyer profile, proof-of-demand quote, MVP scope, matched APIs, and a step brief — formatted for the tool you picked above.</p>
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
              the public-apis directory — 470k+ stars, MIT-licensed, maintained by the
              open-source community — so you&apos;re never staring at a brief wondering what
              actually powers it.
            </p>
          </Reveal>
          <Reveal className="api-chip-row">
            {apiChips.map((a, i) => (
              <div className="api-chip" key={i}>{a.name} <span>· {a.cat}</span></div>
            ))}
          </Reveal>
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
          <Reveal scale className="feature-card">
            <div className="feature-cover">
              <span className="tag">Micro-SaaS</span>
              <span className="score">95% demand signal</span>
            </div>
            <div className="feature-body">
              <h3>Bookkeepers still hand-format P&amp;Ls in Excel for every client, every month.</h3>
              <p>
                41 separate complaints across r/Bookkeeping and r/Accounting in the last 90
                days, plus a cluster of one- and two-star G2 reviews on two mid-tier
                bookkeeping tools naming this exact gap. Several already pay a VA
                specifically to reformat exports by hand.
              </p>
              <div className="feature-meta">
                <div><div className="fm-label">Buyer</div><div className="fm-value">Solo bookkeepers</div></div>
                <div><div className="fm-label">Build time</div><div className="fm-value">~1 weekend</div></div>
                <div><div className="fm-label">Model</div><div className="fm-value">₹800/mo per seat</div></div>
                <div><div className="fm-label">Stack</div><div className="fm-value">Next.js + Supabase</div></div>
                <div><div className="fm-label">APIs matched</div><div className="fm-value">Open Exchange Rates, PDFShift</div></div>
                <div><div className="fm-label">Opens in</div><div className="fm-value">{agent.label}</div></div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section" id="pricing">
        <div className="wrap">
          <Reveal className="section-head">
            <div className="eyebrow">Pricing</div>
            <h2>Less than a coffee run, per idea</h2>
            <p className="section-sub">Cancel anytime. Every paid plan comes with a 7-day refund, no questions.</p>
          </Reveal>
          <div className="pricing-grid">
            <Reveal delay={0} className="plan">
              <div className="plan-name">Free</div>
              <div className="plan-tag">Try before you commit</div>
              <div className="plan-price">₹0</div>
              <ul className="plan-features">
                <li>1 full idea card / month</li>
                <li>Headlines of every other card</li>
                <li>API match: name only, no docs</li>
                <li>No card required</li>
              </ul>
              <button type="button" className="plan-btn">Start free</button>
            </Reveal>
            <Reveal delay={0.08} className="plan featured">
              <div className="plan-name">Builder</div>
              <div className="plan-tag">The full weekly feed · most common pick</div>
              <div className="plan-price">₹399<span>/mo</span></div>
              <div className="plan-old">or ₹3,499/yr — save ₹1,289</div>
              <ul className="plan-features">
                <li>4 full idea cards every month</li>
                <li>Full searchable archive</li>
                <li>Buyer profile + build brief on every card</li>
                <li>Full API match — auth type, free-tier limits, docs links</li>
              </ul>
              <button type="button" className="plan-btn">Get Builder</button>
            </Reveal>
            <Reveal delay={0.16} className="plan">
              <div className="plan-name">Studio</div>
              <div className="plan-tag">For your specific niche</div>
              <div className="plan-price">₹999<span>/mo</span></div>
              <ul className="plan-features">
                <li>Everything in Builder</li>
                <li>One custom idea request / month</li>
                <li>$0 launch stack — free-tier hosting, auth &amp; email picks per idea</li>
                <li>48-hour early access to new cards</li>
              </ul>
              <button type="button" className="plan-btn">Get Studio</button>
            </Reveal>
          </div>
          <Reveal className="founding">
            <span className="founding-label">Founding rate</span>
            <span>The first 100 subscribers keep <b>₹299/mo</b> on Builder for life. No expiry games, just first 100.</span>
          </Reveal>
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
              <h4>Where do the matched APIs come from?</h4>
              <p>
                From a structured, regularly-synced copy of the{" "}
                <a href="https://github.com/public-apis/public-apis" target="_blank" rel="noopener noreferrer">public-apis directory</a>{" "}
                — a 470k-star, MIT-licensed community list. We match categories to your
                idea&apos;s build brief; full docs links and rate limits ship on Builder and
                above.
              </p>
            </Reveal>
            <Reveal delay={0.05} className="faq-item">
              <h4>Which coding tool does this work with?</h4>
              <p>Any AI-assisted builder — Claude Code, Cursor, Windsurf, v0, Bolt, and more. Pick yours in the hero above and every build brief formats for it automatically.</p>
            </Reveal>
            <Reveal delay={0.1} className="faq-item">
              <h4>Is this just ChatGPT with extra steps?</h4>
              <p>No — every card starts from a real, sourced complaint, not a generated headline. You can see the source signal behind each idea, not just the pitch.</p>
            </Reveal>
            <Reveal delay={0.15} className="faq-item">
              <h4>What if I build one and it doesn&apos;t work?</h4>
              <p>Some won&apos;t — that&apos;s true of every idea anywhere. Sourced removes the guessing on whether anyone wants it in the first place; the execution risk is still yours, same as any build.</p>
            </Reveal>
          </div>
        </div>
      </section>

      <Reveal scale className="cta-band">
        <h2>Your next build is already out there complaining on Reddit.</h2>
        <p>Go find it — or let Sourced bring it to you every Monday.</p>
        <a className="btn btn-primary" href="#pricing">Browse this week&apos;s ideas</a>
      </Reveal>

      <footer>
        <div className="wrap">
          <p>SOURCED — Real problems, sourced. Ready to build.</p>
          <p className="credit">
            API matching built on the{" "}
            <a href="https://github.com/public-apis/public-apis" target="_blank" rel="noopener noreferrer">public-apis</a>{" "}
            directory (MIT) ↗
          </p>
        </div>
      </footer>
    </>
  );
}
