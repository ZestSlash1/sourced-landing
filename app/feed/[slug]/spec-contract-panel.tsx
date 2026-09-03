"use client";

import { useState } from "react";

export default function SpecContractPanel({
  slug,
  contractMarkdown,
}: {
  slug: string;
  contractMarkdown: string;
}) {
  const [copiedSpec, setCopiedSpec] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  const curlCommand = `curl -s https://www.getsourced.dev/api/ideas/${slug}/spec > CLAUDE.md`;

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

  function downloadSpec() {
    const blob = new Blob([contractMarkdown], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "CLAUDE.md");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div
      style={{
        marginTop: 20,
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-md)",
        padding: "18px 20px",
        boxShadow: "var(--shadow)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <div>
          <h5 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700 }}>
            Spec-Driven Agent Contract (CLAUDE.md / CURSOR.md)
          </h5>
          <p style={{ margin: 0, fontSize: 12.5, color: "var(--ink-soft)" }}>
            Includes production Postgres DDL, RLS security rules, API retry logic, and edge-case contracts.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => copyText(contractMarkdown, setCopiedSpec)}
            className={`prompt-copy-btn ${copiedSpec ? "is-copied" : ""}`}
          >
            {copiedSpec ? "Copied Spec!" : "Copy Spec"}
          </button>
          <button
            type="button"
            onClick={downloadSpec}
            className="prompt-copy-btn"
            style={{ background: "var(--violet)", color: "#fff", borderColor: "var(--violet)" }}
          >
            Download CLAUDE.md
          </button>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--bg)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-sm)",
          padding: "8px 12px",
          gap: 10,
        }}
      >
        <code className="mono" style={{ fontSize: 12, color: "var(--ink)" }}>
          <span style={{ color: "var(--violet-deep)", marginRight: 6 }}>$</span>
          {curlCommand}
        </code>
        <button
          type="button"
          onClick={() => copyText(curlCommand, setCopiedCurl)}
          className={`prompt-copy-btn ${copiedCurl ? "is-copied" : ""}`}
          style={{ padding: "4px 10px", fontSize: 11 }}
        >
          {copiedCurl ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
