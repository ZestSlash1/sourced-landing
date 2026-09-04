"use client";

import { useState } from "react";

interface BuilderExportPanelProps {
  slug: string;
  contractMarkdown: string;
  cursorRules: string;
}

export default function BuilderExportPanel({
  slug,
  contractMarkdown,
  cursorRules,
}: BuilderExportPanelProps) {
  const [copiedSpec, setCopiedSpec] = useState(false);
  const [copiedCursor, setCopiedCursor] = useState(false);
  const [activeTab, setActiveTab] = useState<"claude" | "cursor">("claude");
  const [copiedCurl, setCopiedCurl] = useState(false);

  const claudeCurl = `curl -s https://www.getsourced.dev/api/ideas/${slug}/spec > CLAUDE.md`;
  const cursorCurl = `curl -s https://www.getsourced.dev/api/ideas/${slug}/cursorrules > .cursorrules`;

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
              Builder Export Suite (Claude Code & Cursor / Windsurf)
            </h4>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "var(--ink-soft)" }}>
            Inject production Postgres DDL, RLS security rules, strict MVP boundaries, and agent contracts directly into your IDE.
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
      </div>

      {/* Command & Quick Copy */}
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
            {activeTab === "claude" ? claudeCurl : cursorCurl}
          </code>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => copyText(activeTab === "claude" ? claudeCurl : cursorCurl, setCopiedCurl)}
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
          ) : (
            <button
              type="button"
              onClick={() => copyText(cursorRules, setCopiedCursor)}
              className={`prompt-copy-btn ${copiedCursor ? "is-copied" : ""}`}
              style={{ padding: "4px 10px", fontSize: 11.5 }}
            >
              {copiedCursor ? "Copied Rules!" : "Copy .cursorrules"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
