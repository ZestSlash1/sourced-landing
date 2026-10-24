"use client";

import { useState } from "react";
import Link from "next/link";
import CopyPromptButton from "@/app/feed/[slug]/copy-prompt-button";

const prompt = `Build a local-only Prisma migration review notebook in Next.js and TypeScript.
This is a prototype to test a workflow hypothesis, not a migration engine.
Let a developer paste a SQL migration, note externally managed tables, and complete a review checklist.
Show the pasted SQL beside notes about custom SQL, table ownership, deployment environment, and recovery planning.
Allow export of the checklist and notes as Markdown. Keep state in local storage with a clear reset button.
Never request database credentials, execute SQL, infer that a migration is safe, or generate automatic rollback SQL.
Test persistence after reload, export accuracy, empty input, and keyboard navigation.
Keep OAuth, billing, database connections, schema parsers, and multi-ORM support out of scope.
Before building beyond this prototype, test the checklist on a real anonymized migration with a consenting developer.`;

export default function ResearchSample() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(prompt);
        setCopied(true);
        setTimeout(() => setCopied(false), 2400);
      }
    } catch {
      // Fallback if clipboard API is unavailable
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    }
  };

  return (
    <article
      className="research-sample"
      id="sample"
      aria-labelledby="research-sample-title"
    >
      <style>{`
        .dossier-header-bar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 18px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--line);
          border-radius: var(--r-sm);
          margin-bottom: 24px;
        }
        .dossier-pills-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
        }
        .dossier-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          letter-spacing: 0.04em;
          padding: 3px 9px;
          background: rgba(16, 18, 26, 0.85);
          border: 1px solid var(--line);
          border-radius: 999px;
          color: var(--ink-soft);
          text-transform: uppercase;
        }
        .dossier-pill-accent {
          color: var(--violet-deep);
          border-color: rgba(124, 58, 237, 0.35);
          background: rgba(124, 58, 237, 0.08);
        }
        .dossier-pill-emerald {
          color: #10B981;
          border-color: rgba(16, 185, 129, 0.3);
          background: rgba(16, 185, 129, 0.08);
        }
        .sample-nav-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 20px 0 28px;
          padding: 6px;
          background: rgba(16, 18, 26, 0.6);
          border: 1px solid var(--line);
          border-radius: var(--r-md);
        }
        .sample-nav-link {
          display: inline-flex;
          align-items: center;
          padding: 6px 14px;
          font-size: 12.5px;
          font-weight: 500;
          color: var(--ink-soft);
          text-decoration: none !important;
          border-radius: var(--r-sm);
          transition: all 0.15s ease;
        }
        .sample-nav-link:hover {
          color: var(--ink);
          background: rgba(255, 255, 255, 0.06);
        }
        .evidence-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          margin: 20px 0;
        }
        .obsidian-card {
          position: relative;
          background: #0d0f16;
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: var(--r-md);
          padding: 20px 22px;
          transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
        }
        .obsidian-card:hover {
          border-color: rgba(167, 139, 250, 0.35);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
        }
        .evidence-card-header {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 12px;
        }
        .issue-badge {
          font-family: var(--font-jetbrains-mono), monospace;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 4px;
          background: rgba(124, 58, 237, 0.16);
          color: var(--violet-deep);
          border: 1px solid rgba(124, 58, 237, 0.3);
        }
        .badge-cyan {
          background: rgba(56, 189, 248, 0.14);
          color: #38BDF8;
          border-color: rgba(56, 189, 248, 0.3);
        }
        .badge-emerald {
          background: rgba(16, 185, 129, 0.14);
          color: #10B981;
          border-color: rgba(16, 185, 129, 0.3);
        }
        .evidence-time-row {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 12px;
          color: var(--ink-soft);
        }
        .verified-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #10B981;
          font-size: 11.5px;
          font-weight: 500;
        }
        .evidence-quote {
          margin: 10px 0;
          padding: 10px 14px;
          background: rgba(0, 0, 0, 0.35);
          border-left: 2.5px solid var(--violet-deep);
          border-radius: 0 var(--r-sm) var(--r-sm) 0;
          font-size: 13.5px;
          line-height: 1.6;
          color: var(--ink);
          font-style: italic;
        }
        .alt-cards-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin: 22px 0;
        }
        @media (max-width: 680px) {
          .alt-cards-grid {
            grid-template-columns: 1fr;
          }
        }
        .alt-card {
          background: #0d0f16;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--r-md);
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .alt-tool-name {
          font-size: 15px;
          font-weight: 600;
          color: var(--ink);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .alt-tool-name a {
          color: var(--ink) !important;
          text-decoration: none !important;
        }
        .alt-tool-name a:hover {
          color: var(--violet-deep) !important;
        }
        .alt-category {
          font-size: 11px;
          text-transform: uppercase;
          color: var(--ink-soft);
          letter-spacing: 0.05em;
        }
        .alt-gap {
          font-size: 13px;
          line-height: 1.55;
          color: var(--ink-soft);
          background: rgba(255, 255, 255, 0.02);
          border-left: 2px solid rgba(244, 114, 182, 0.4);
          padding: 6px 10px;
          border-radius: 0 var(--r-sm) var(--r-sm) 0;
          margin-top: auto;
        }
        .alt-gap strong {
          color: #f472b6;
          font-weight: 600;
        }
        .scope-card {
          background: #0d0f16;
          border-radius: var(--r-md);
          padding: 22px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .scope-card-in {
          border-color: rgba(16, 185, 129, 0.28);
          background: linear-gradient(180deg, rgba(16, 185, 129, 0.04) 0%, rgba(13, 15, 22, 0.98) 100%);
        }
        .scope-card-cut {
          border-color: rgba(255, 94, 126, 0.24);
          background: linear-gradient(180deg, rgba(255, 94, 126, 0.04) 0%, rgba(13, 15, 22, 0.98) 100%);
        }
        .scope-card-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
        }
        .scope-icon-in {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.18);
          color: #10B981;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
        }
        .scope-icon-cut {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: rgba(255, 94, 126, 0.18);
          color: #FF5E7E;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
        }
        .scope-items-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .scope-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 13.5px;
          line-height: 1.5;
        }
        .scope-bullet-in {
          color: #10B981;
          font-weight: bold;
          flex-shrink: 0;
        }
        .scope-bullet-cut {
          color: #FF5E7E;
          font-weight: bold;
          flex-shrink: 0;
        }
        .validation-protocol-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin: 22px 0;
        }
        @media (max-width: 768px) {
          .validation-protocol-cards {
            grid-template-columns: 1fr;
          }
        }
        .status-card {
          background: #0d0f16;
          border-radius: var(--r-md);
          padding: 18px 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .status-card-continue {
          border-color: rgba(16, 185, 129, 0.35);
          background: linear-gradient(180deg, rgba(16, 185, 129, 0.06) 0%, #0d0f16 100%);
        }
        .status-card-pivot {
          border-color: rgba(251, 191, 36, 0.35);
          background: linear-gradient(180deg, rgba(251, 191, 36, 0.06) 0%, #0d0f16 100%);
        }
        .status-card-stop {
          border-color: rgba(255, 94, 126, 0.35);
          background: linear-gradient(180deg, rgba(255, 94, 126, 0.06) 0%, #0d0f16 100%);
        }
        .status-card-badge {
          align-self: flex-start;
          font-family: var(--font-jetbrains-mono), monospace;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
          padding: 3px 8px;
          border-radius: 4px;
        }
        .badge-rule-continue {
          background: rgba(16, 185, 129, 0.16);
          color: #10B981;
        }
        .badge-rule-pivot {
          background: rgba(251, 191, 36, 0.16);
          color: #FBBF24;
        }
        .badge-rule-stop {
          background: rgba(255, 94, 126, 0.16);
          color: #FF5E7E;
        }
        .status-card-body {
          font-size: 13px;
          line-height: 1.55;
          color: var(--ink-soft);
        }
        .terminal-container {
          background: #090a10;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--r-md);
          overflow: hidden;
          margin: 20px 0;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
        }
        .terminal-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.04);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .terminal-dots {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .terminal-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        .terminal-filename {
          font-family: var(--font-jetbrains-mono), monospace;
          font-size: 12px;
          color: var(--ink-soft);
          letter-spacing: 0.02em;
        }
        .terminal-copy-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-jetbrains-mono), monospace;
          font-size: 12px;
          font-weight: 500;
          padding: 5px 12px;
          border-radius: var(--r-sm);
          background: rgba(124, 58, 237, 0.18);
          border: 1px solid rgba(124, 58, 237, 0.35);
          color: var(--violet-deep);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .terminal-copy-btn:hover {
          background: rgba(124, 58, 237, 0.28);
          color: #fff;
        }
        .terminal-copy-btn.copied {
          background: rgba(16, 185, 129, 0.2);
          border-color: rgba(16, 185, 129, 0.45);
          color: #10B981;
        }
        .sample-prompt-pre {
          margin: 0;
          padding: 18px 20px;
          font-family: var(--font-jetbrains-mono), monospace;
          font-size: 12.5px;
          line-height: 1.65;
          color: #d8dee9;
          background: transparent;
          overflow-x: auto;
          white-space: pre-wrap;
          word-break: break-word;
        }
      `}</style>

      {/* Top Dossier Header Bar */}
      <div className="dossier-header-bar" aria-label="Research metadata summary">
        <div className="dossier-pills-row">
          <span className="dossier-pill dossier-pill-accent mono">
            HISTORICAL WALKTHROUGH · PRISMA #4688
          </span>
          <span className="dossier-pill dossier-pill-emerald mono">
            3 GITHUB ISSUES VERIFIED
          </span>
          <span className="dossier-pill mono">
            CHECKED 14 OCT 2026
          </span>
        </div>
        <div className="mono" style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>
          DOSSIER / REF-4688
        </div>
      </div>

      <div className="sample-intro">
        <span className="tag">Historical research walkthrough · free in full</span>
        <h3 id="research-sample-title">A migration review notebook for Prisma teams</h3>
        <p>
          Backend developers handling custom SQL, externally managed tables, or private deployment
          environments need a reviewable migration plan. A small review tool is a hypothesis worth
          testing before building another migration engine.
        </p>
        <p className="research-note">
          Sources opened and checked 14 October 2026. Original discussions date from 2020–2021.
          This is an archived teaching example, outside our 90-day freshness bar for new drops.
          It is not fresh demand, a customer interview, or evidence of payment.
        </p>
      </div>

      {/* Pill-styled section jump links */}
      <nav className="sample-nav-pills" aria-label="Sample brief sections">
        <a href="#sample-evidence" className="sample-nav-link">
          01 / Evidence
        </a>
        <a href="#sample-alternatives" className="sample-nav-link">
          02 / Alternatives
        </a>
        <a href="#sample-mvp" className="sample-nav-link">
          03 / Scoped MVP
        </a>
        <a href="#sample-validation" className="sample-nav-link">
          04 / Validation
        </a>
        <a href="#sample-prompt" className="sample-nav-link">
          05 / Build Prompt
        </a>
      </nav>

      {/* 01 / EVIDENCE SECTION */}
      <section id="sample-evidence">
        <h4>Three discussions. One platform. Independence unverified.</h4>
        <p className="research-note" style={{ marginBottom: 16 }}>
          Raw GitHub issues clustered by migration friction patterns. Verified against upstream repositories.
        </p>

        <div className="evidence-grid">
          {/* Card 1: Issue #4688 */}
          <div className="obsidian-card">
            <div className="evidence-card-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="issue-badge">#4688</span>
                <span className="mono" style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                  GitHub · prisma/orm
                </span>
              </div>
              <div className="evidence-time-row">
                <time dateTime="2020-07-01">1 July 2020</time>
                <span className="verified-badge">✓ Verified</span>
              </div>
            </div>
            <h5 style={{ margin: "6px 0 8px", fontSize: 16 }}>
              <a
                href="https://github.com/prisma/orm/issues/4688"
                target="_blank"
                rel="noopener noreferrer"
              >
                Prisma #4688 · imperative migrations
              </a>
            </h5>
            <div className="evidence-quote">
              &ldquo;Need an imperative escape hatch for custom indexes, triggers, and custom data migrations during migrate deploy.&rdquo;
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 14 }}>
              The author asks for an imperative escape hatch for custom indexes and data migrations.
              This supports investigating review needs around custom SQL.
            </p>
          </div>

          {/* Card 2: Issue #7161 / #4703 */}
          <div className="obsidian-card">
            <div className="evidence-card-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="issue-badge badge-cyan">#7161</span>
                <span className="mono" style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                  GitHub · prisma/orm (#4703)
                </span>
              </div>
              <div className="evidence-time-row">
                <time dateTime="2020-05-05">5 May 2020</time>
                <span className="verified-badge">✓ Verified</span>
              </div>
            </div>
            <h5 style={{ margin: "6px 0 8px", fontSize: 16 }}>
              <a
                href="https://github.com/prisma/orm/issues/4703"
                target="_blank"
                rel="noopener noreferrer"
              >
                Prisma #7161 · programmatic migration commands (#4703)
              </a>
            </h5>
            <div className="evidence-quote">
              &ldquo;Currently SSHing into an EC2 instance to execute migrations inside a private VPC with zero auditable review log.&rdquo;
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 14 }}>
              The author describes SSHing into an EC2 instance to run migrations inside a VPC.
              This is a concrete workaround, not a measured market cost.
            </p>
          </div>

          {/* Card 3: Issue #12572 / #8864 */}
          <div className="obsidian-card">
            <div className="evidence-card-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="issue-badge badge-emerald">#12572</span>
                <span className="mono" style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                  GitHub · prisma/orm (#8864)
                </span>
              </div>
              <div className="evidence-time-row">
                <time dateTime="2021-08-23">23 August 2021</time>
                <span className="verified-badge">✓ Verified</span>
              </div>
            </div>
            <h5 style={{ margin: "6px 0 8px", fontSize: 16 }}>
              <a
                href="https://github.com/prisma/orm/issues/8864"
                target="_blank"
                rel="noopener noreferrer"
              >
                Prisma #12572 · dynamic &amp; externally managed tables (#8864)
              </a>
            </h5>
            <div className="evidence-quote">
              &ldquo;Schema engine creates drift on dynamic runtime tables and partitioned data outside Prisma schema control.&rdquo;
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 14 }}>
              The author reports drift with dynamic tables in SQL Server and describes a restricted
              database user workaround. Applicability to PostgreSQL needs separate testing.
            </p>
          </div>
        </div>

        <p className="research-note">
          These are distinct issue URLs with different original authors; they are related workflow
          requests, not three confirmations of the same product. Cross-posts, overlapping
          organizations, current pain, and buying authority have not been verified. No engagement
          count is treated as a buyer count.
        </p>
      </section>

      {/* 02 / ALTERNATIVES SECTION */}
      <section id="sample-alternatives">
        <h4>Start with the tools that already exist</h4>
        <p className="research-note" style={{ marginBottom: 16 }}>
          Evaluate existing tools and identify their exact functional boundaries before designing a new solution.
        </p>

        <div className="alt-cards-grid">
          {/* Card 1: Prisma Custom SQL */}
          <div className="alt-card">
            <div className="alt-category">Native ORM Workflow</div>
            <div className="alt-tool-name">
              <a
                href="https://www.prisma.io/docs/orm/migrations/editing-a-migration"
                target="_blank"
                rel="noopener noreferrer"
              >
                Prisma custom SQL migrations ↗
              </a>
            </div>
            <p style={{ fontSize: 13, margin: 0, color: "var(--ink-soft)" }}>
              Already supports manually editing generated SQL files before running migrations in staging or production.
            </p>
            <div className="alt-gap">
              <strong>Limitation gap:</strong> File-only editing; lacks pre-flight checklist, external table tracking, or team signoff.
            </div>
          </div>

          {/* Card 2: node-pg-migrate */}
          <div className="alt-card">
            <div className="alt-category">Node.js Migration Library</div>
            <div className="alt-tool-name">
              <a
                href="https://github.com/salsita/node-pg-migrate"
                target="_blank"
                rel="noopener noreferrer"
              >
                node-pg-migrate ↗
              </a>
            </div>
            <p style={{ fontSize: 13, margin: 0, color: "var(--ink-soft)" }}>
              Offers programmatic PostgreSQL migrations with full JavaScript and TypeScript control.
            </p>
            <div className="alt-gap">
              <strong>Limitation gap:</strong> PostgreSQL-only, code-heavy setup, no collaborative review notebook for engineering leads.
            </div>
          </div>

          {/* Card 3: dbmate */}
          <div className="alt-card">
            <div className="alt-category">Language-Agnostic CLI</div>
            <div className="alt-tool-name">
              <a
                href="https://github.com/amacneil/dbmate"
                target="_blank"
                rel="noopener noreferrer"
              >
                dbmate ↗
              </a>
            </div>
            <p style={{ fontSize: 13, margin: 0, color: "var(--ink-soft)" }}>
              Provides a framework-independent, plain SQL migration workflow for multiple relational databases.
            </p>
            <div className="alt-gap">
              <strong>Limitation gap:</strong> CLI-only execution runner; no peer review flow, deployment safety checklists, or drift notes.
            </div>
          </div>

          {/* Card 4: PR & Markdown Checklist */}
          <div className="alt-card">
            <div className="alt-category">Manual Process</div>
            <div className="alt-tool-name">
              <span>Shared Markdown &amp; PR Templates</span>
            </div>
            <p style={{ fontSize: 13, margin: 0, color: "var(--ink-soft)" }}>
              Standard team pull request templates and checklist documents stored in git repositories.
            </p>
            <div className="alt-gap">
              <strong>Limitation gap:</strong> Disconnected from live SQL context, frequently bypassed under release pressure, no schema sanity rules.
            </div>
          </div>
        </div>

        <p className="research-note">
          Alternatives checked 14 October 2026. The possible opening is a shared review checklist
          around an existing tool. We have not established that it beats a Markdown template or that
          anyone needs another paid product.
        </p>
      </section>

      {/* 03 / SCOPED MVP VS CUTS */}
      <span id="sample-scope" className="sr-only" aria-hidden="true" />
      <section id="sample-mvp">
        <h4>A deliberately small first build</h4>
        <p>
          <strong>Proposed first user:</strong> a backend developer who owns migration reviews for a
          small Prisma team. The prospective buyer would be the engineering lead; budget and purchase
          authority remain untested.
        </p>
        <p>
          <strong>Core loop:</strong> paste an anonymized migration → record table ownership and
          deployment constraints → review with a teammate → export a Markdown plan.
        </p>

        {/* .sample-scope-grid with In Scope and Explicitly Cut cards */}
        <div className="sample-scope-grid">
          <div className="scope-card scope-card-in">
            <div className="scope-card-header">
              <span className="scope-icon-in">✓</span>
              <div>
                <h5 style={{ margin: 0, color: "#10B981" }}>In Scope (Narrow MVP)</h5>
                <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                  What to build for the first hypothesis test
                </span>
              </div>
            </div>
            <ul className="scope-items-list">
              <li className="scope-item">
                <span className="scope-bullet-in">✓</span>
                <span>SQL input area and a structured manual review checklist</span>
              </li>
              <li className="scope-item">
                <span className="scope-bullet-in">✓</span>
                <span>Notes for externally managed tables, deployment environment, and recovery plans</span>
              </li>
              <li className="scope-item">
                <span className="scope-bullet-in">✓</span>
                <span>Local draft persistence in browser storage and clean Markdown export</span>
              </li>
              <li className="scope-item">
                <span className="scope-bullet-in">✓</span>
                <span>Keyboard navigation, empty state handling, and clear state reset</span>
              </li>
            </ul>
          </div>

          <div className="scope-card scope-card-cut">
            <div className="scope-card-header">
              <span className="scope-icon-cut">✕</span>
              <div>
                <h5 style={{ margin: 0, color: "#FF5E7E" }}>Explicitly Cut</h5>
                <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                  Deliberately deferred to prevent premature complexity
                </span>
              </div>
            </div>
            <ul className="scope-items-list">
              <li className="scope-item">
                <span className="scope-bullet-cut">✕</span>
                <span>Database credentials or live SQL execution</span>
              </li>
              <li className="scope-item">
                <span className="scope-bullet-cut">✕</span>
                <span>Automatic rollback or automated safety certification</span>
              </li>
              <li className="scope-item">
                <span className="scope-bullet-cut">✕</span>
                <span>ORM schema parsers, multi-database engines, or custom ASTs</span>
              </li>
              <li className="scope-item">
                <span className="scope-bullet-cut">✕</span>
                <span>Cloud hosting, user accounts, OAuth, billing, and team integrations</span>
              </li>
            </ul>
          </div>
        </div>

        <p>
          <strong>Data:</strong> one local ReviewDraft with migration text, checklist answers,
          notes, and updatedAt. <strong>API needs:</strong> none for this prototype. Use anonymized
          SQL; do not upload company secrets. Build effort is unmeasured.
        </p>
      </section>

      {/* 04 / VALIDATION PROTOCOL */}
      <section id="sample-validation">
        <h4>Validate the review job before writing the engine</h4>
        <p>
          Ask five consenting Prisma developers who reviewed a migration recently to walk through an
          anonymized example. Recruit through your own network or communities that permit research
          requests; issue authors have not agreed to be contacted.
        </p>

        <ol className="brief-list" style={{ margin: "18px 0" }}>
          <li>
            Ask what failed or needed review last time, how they handled it, and how much work it
            caused. Record observed facts separately from opinions.
          </li>
          <li>
            Run the checklist manually against their example. Compare it with their existing review
            process and the alternatives above.
          </li>
          <li>
            Ask whether they will try it on their next migration and who could approve a paid pilot.
            A compliment or hypothetical price answer is not a purchase.
          </li>
        </ol>

        {/* 3 Status Decision Cards: Emerald Continue, Amber Change Direction, Coral Stop */}
        <div className="validation-protocol-cards">
          <div className="status-card status-card-continue">
            <span className="status-card-badge badge-rule-continue">CONTINUE</span>
            <strong style={{ fontSize: 14, color: "#10B981" }}>Voluntary Reuse &amp; Pilot</strong>
            <p className="status-card-body" style={{ margin: 0 }}>
              Continue if developers voluntarily reuse the checklist on real work and a budget holder
              agrees to a concrete paid pilot.
            </p>
          </div>

          <div className="status-card status-card-pivot">
            <span className="status-card-badge badge-rule-pivot">CHANGE DIRECTION</span>
            <strong style={{ fontSize: 14, color: "#FBBF24" }}>Narrow Value Focus</strong>
            <p className="status-card-body" style={{ margin: 0 }}>
              Change direction if only one narrow review step matters (e.g. only custom SQL escape
              hatches or dynamic table drift notes).
            </p>
          </div>

          <div className="status-card status-card-stop">
            <span className="status-card-badge badge-rule-stop">STOP</span>
            <strong style={{ fontSize: 14, color: "#FF5E7E" }}>Template Is Sufficient</strong>
            <p className="status-card-body" style={{ margin: 0 }}>
              Stop if existing tooling or a shared Markdown template solves the problem without
              requiring custom software.
            </p>
          </div>
        </div>

        <p className="research-note">
          These are proposed decision rules, not test results.
        </p>
      </section>

      {/* REJECTION LOG NOTE */}
      <section>
        <h4>What we would reject</h4>
        <p>
          The broader &ldquo;one engine for migrations, rollback, every ORM, and private-network
          deployments&rdquo; concept bundles different requests into one large product. We would
          reject that scope for a first build: the evidence does not establish a common buyer or a
          need to replace the existing engines. This is editorial judgment about this example, not
          a fabricated pipeline rejection.
        </p>
        <Link href="/rejected" style={{ fontWeight: 600 }}>
          Inspect the actual pipeline rejection log →
        </Link>
      </section>

      {/* 05 / BUILD PROMPT */}
      <section id="sample-prompt">
        <h4>Try the scoped prototype</h4>
        <p className="research-note" style={{ marginBottom: 14 }}>
          Ready-to-run prompt formatted for modern AI coding agents. Run directly in your CLI or workspace.
        </p>

        {/* Terminal Window with Live Copy Prompt Button */}
        <div className="terminal-container">
          <div className="terminal-bar">
            <div className="terminal-dots">
              <span className="terminal-dot" style={{ background: "#FF5F56" }} />
              <span className="terminal-dot" style={{ background: "#FFBD2E" }} />
              <span className="terminal-dot" style={{ background: "#27C93F" }} />
              <span className="terminal-filename" style={{ marginLeft: 8 }}>
                prisma-review-notebook.prompt.md
              </span>
            </div>
            <button
              type="button"
              className={`terminal-copy-btn ${copied ? "copied" : ""}`}
              onClick={handleCopy}
              aria-label="Copy prompt to clipboard"
            >
              {copied ? (
                <>
                  <span aria-hidden="true">✓</span> Copied to clipboard ✓
                </>
              ) : (
                <>
                  <span aria-hidden="true">📋</span> Copy Prompt
                </>
              )}
            </button>
          </div>

          <pre className="sample-prompt-pre">
            <code>{prompt}</code>
          </pre>
        </div>

        <div style={{ marginTop: 14 }}>
          <CopyPromptButton
            label="Codex / Claude Code / Cursor / Windsurf"
            prompt={prompt}
          />
        </div>

        <p className="research-note" style={{ marginTop: 14 }}>
          This proposed prompt has not been used to build or validate the migration tool.
        </p>
      </section>

      {/* NEXT STEP CTA */}
      <div className="sample-next">
        <h4>Use the same scrutiny on your next idea</h4>
        <p>
          Browse the published briefs, save an opportunity to your account, and revisit its current
          evidence before committing to a build. Builder provides four new brief unlocks per
          calendar month; previously unlocked briefs remain available.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginTop: 16 }}>
          <Link className="btn btn-primary" href="/feed">
            Find an opportunity to investigate
          </Link>
          <a href="#pricing" style={{ fontSize: 14, color: "var(--ink-soft)" }}>
            Compare plans →
          </a>
        </div>
      </div>
    </article>
  );
}
