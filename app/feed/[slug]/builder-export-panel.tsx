"use client";

import { useState } from "react";

interface BuilderExportPanelProps {
  slug: string;
  contractMarkdown: string;
  cursorRules: string;
  sqlSchema: string;
}

export default function BuilderExportPanel({
  slug,
  contractMarkdown,
  cursorRules,
  sqlSchema,
}: BuilderExportPanelProps) {
  const [copiedSpec, setCopiedSpec] = useState(false);
  const [copiedCursor, setCopiedCursor] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [copiedDbUrl, setCopiedDbUrl] = useState(false);
  const [copiedPrismaPush, setCopiedPrismaPush] = useState(false);
  const [activeTab, setActiveTab] = useState<"claude" | "cursor" | "schema" | "database">("claude");
  const [copiedCurl, setCopiedCurl] = useState(false);

  const dbCleanName = slug.replace(/-/g, "_");
  const dbUrl = `postgresql://sourced_builder:live_dev_token@db.getsourced.dev:5432/${dbCleanName}_dev?sslmode=require`;
  const claudeCurl = `curl -s https://www.getsourced.dev/api/ideas/${slug}/spec > CLAUDE.md`;
  const cursorCurl = `curl -s https://www.getsourced.dev/api/ideas/${slug}/cursorrules > .cursorrules`;
  const schemaCurl = `curl -s https://www.getsourced.dev/api/ideas/${slug}/schema > schema.sql`;
  const currentCurl =
    activeTab === "claude"
      ? claudeCurl
      : activeTab === "cursor"
        ? cursorCurl
        : activeTab === "schema"
          ? schemaCurl
          : `DATABASE_URL="${dbUrl}"`;

  async function copyText(text: string, setter: (val: boolean) => void) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setter(true);
    setTimeout(() => setter(false), 2000);
  }

  function downloadFile(content: string, filename: string) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div
      style={{
        marginTop: 24,
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-md)",
        padding: "20px 24px",
        boxShadow: "var(--shadow)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span
              style={{
                background: "var(--violet)",
                color: "#fff",
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                padding: "2px 8px",
                borderRadius: 4,
              }}
            >
              1-Click Setup
            </span>
            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              Builder Export Suite (Claude Code, Cursor & Database)
            </h4>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "var(--ink-soft)" }}>
            Inject production Postgres DDL, RLS security rules, strict MVP boundaries, and instant database credentials directly into your IDE.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => downloadFile(contractMarkdown, "CLAUDE.md")}
            className="prompt-copy-btn"
            style={{
              background: "var(--violet)",
              color: "#fff",
              borderColor: "var(--violet)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>↓</span> Download CLAUDE.md
          </button>
          <button
            type="button"
            onClick={() => downloadFile(cursorRules, ".cursorrules")}
            className="prompt-copy-btn"
            style={{
              background: "var(--violet)",
              color: "#fff",
              borderColor: "var(--violet)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>↓</span> Download .cursorrules
          </button>
          <button
            type="button"
            onClick={() => downloadFile(sqlSchema, `${slug}-schema.sql`)}
            className="prompt-copy-btn"
            style={{
              background: "var(--violet)",
              color: "#fff",
              borderColor: "var(--violet)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>↓</span> Download schema.sql
          </button>
          <button
            type="button"
            onClick={() => downloadFile(`DATABASE_URL="${dbUrl}"\n`, ".env.local")}
            className="prompt-copy-btn"
            style={{
              background: "var(--surface)",
              color: "var(--ink)",
              borderColor: "var(--line)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>↓</span> Download .env
          </button>
        </div>
      </div>

      {/* Mode Switcher */}
      <div
        style={{
          display: "flex",
          gap: 8,
          borderBottom: "1px solid var(--line)",
          paddingBottom: 10,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("claude")}
          style={{
            background: activeTab === "claude" ? "var(--bg)" : "transparent",
            color: activeTab === "claude" ? "var(--ink)" : "var(--ink-soft)",
            border: activeTab === "claude" ? "1px solid var(--line)" : "1px solid transparent",
            fontWeight: activeTab === "claude" ? 700 : 500,
            fontSize: 13,
            padding: "6px 14px",
            borderRadius: "var(--r-sm)",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          Claude Code (CLAUDE.md)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("cursor")}
          style={{
            background: activeTab === "cursor" ? "var(--bg)" : "transparent",
            color: activeTab === "cursor" ? "var(--ink)" : "var(--ink-soft)",
            border: activeTab === "cursor" ? "1px solid var(--line)" : "1px solid transparent",
            fontWeight: activeTab === "cursor" ? 700 : 500,
            fontSize: 13,
            padding: "6px 14px",
            borderRadius: "var(--r-sm)",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          Cursor & Windsurf (.cursorrules)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("schema")}
          style={{
            background: activeTab === "schema" ? "var(--bg)" : "transparent",
            color: activeTab === "schema" ? "var(--ink)" : "var(--ink-soft)",
            border: activeTab === "schema" ? "1px solid var(--line)" : "1px solid transparent",
            fontWeight: activeTab === "schema" ? 700 : 500,
            fontSize: 13,
            padding: "6px 14px",
            borderRadius: "var(--r-sm)",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          Database Schema (schema.sql)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("database")}
          style={{
            background: activeTab === "database" ? "var(--bg)" : "transparent",
            color: activeTab === "database" ? "var(--violet)" : "var(--ink-soft)",
            border: activeTab === "database" ? "1px solid var(--violet)" : "1px solid transparent",
            fontWeight: activeTab === "database" ? 700 : 500,
            fontSize: 13,
            padding: "6px 14px",
            borderRadius: "var(--r-sm)",
            cursor: "pointer",
            transition: "all 0.15s ease",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>⚡</span> Instant Dev Database
        </button>
      </div>

      {activeTab === "database" ? (
        <div
          style={{
            background: "var(--bg)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-sm)",
            padding: "16px 18px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  background: "rgba(91, 79, 247, 0.12)",
                  color: "var(--violet)",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 4,
                }}
              >
                Studio & DB Bundle
              </span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Pre-configured PostgreSQL 16 with SSL</span>
            </div>
            <button
              type="button"
              onClick={() => copyText(dbUrl, setCopiedDbUrl)}
              className={`prompt-copy-btn ${copiedDbUrl ? "is-copied" : ""}`}
              style={{ padding: "5px 12px", fontSize: 12, background: "var(--violet)", color: "#fff", borderColor: "var(--violet)" }}
            >
              {copiedDbUrl ? "Copied Connection String!" : "Copy DATABASE_URL"}
            </button>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 4 }}>Paste into your project&apos;s <code>.env</code> file:</div>
            <div
              className="mono"
              style={{
                fontSize: 12,
                background: "var(--surface)",
                border: "1px solid var(--line)",
                padding: "8px 12px",
                borderRadius: 6,
                overflowX: "auto",
                whiteSpace: "nowrap",
                color: "var(--ink)",
              }}
            >
              DATABASE_URL=&quot;{dbUrl}&quot;
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>Apply schema with 1 command:</div>
            <button
              type="button"
              onClick={() => copyText("npx prisma db push", setCopiedPrismaPush)}
              className="mono"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: 4,
                padding: "3px 8px",
                fontSize: 11.5,
                cursor: "pointer",
                color: "var(--ink)",
              }}
            >
              {copiedPrismaPush ? "Copied!" : "$ npx prisma db push"}
            </button>
            <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>or</span>
            <code
              className="mono"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: 4,
                padding: "3px 8px",
                fontSize: 11.5,
                color: "var(--ink)",
              }}
            >
              $ psql $DATABASE_URL &lt; schema.sql
            </code>
          </div>
        </div>
      ) : (
        /* Command & Quick Copy */
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-sm)",
            padding: "10px 14px",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, overflowX: "auto", maxWidth: "100%" }}>
            <span className="mono" style={{ color: "var(--violet-deep)", fontWeight: 700 }}>
              $
            </span>
            <code className="mono" style={{ fontSize: 12.5, color: "var(--ink)", whiteSpace: "nowrap" }}>
              {currentCurl}
            </code>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => copyText(currentCurl, setCopiedCurl)}
              className={`prompt-copy-btn ${copiedCurl ? "is-copied" : ""}`}
              style={{ padding: "4px 10px", fontSize: 11.5 }}
            >
              {copiedCurl ? "Copied Command!" : "Copy Command"}
            </button>
            {activeTab === "claude" ? (
              <button
                type="button"
                onClick={() => copyText(contractMarkdown, setCopiedSpec)}
                className={`prompt-copy-btn ${copiedSpec ? "is-copied" : ""}`}
                style={{ padding: "4px 10px", fontSize: 11.5 }}
              >
                {copiedSpec ? "Copied Spec!" : "Copy CLAUDE.md"}
              </button>
            ) : activeTab === "cursor" ? (
              <button
                type="button"
                onClick={() => copyText(cursorRules, setCopiedCursor)}
                className={`prompt-copy-btn ${copiedCursor ? "is-copied" : ""}`}
                style={{ padding: "4px 10px", fontSize: 11.5 }}
              >
                {copiedCursor ? "Copied Rules!" : "Copy .cursorrules"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => copyText(sqlSchema, setCopiedSchema)}
                className={`prompt-copy-btn ${copiedSchema ? "is-copied" : ""}`}
                style={{ padding: "4px 10px", fontSize: 11.5 }}
              >
                {copiedSchema ? "Copied Schema!" : "Copy schema.sql"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
