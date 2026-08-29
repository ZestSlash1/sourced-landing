"use client";

import { useState } from "react";

export default function CopyPromptButton({ label, prompt }: { label: string; prompt: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            padding: "5px 12px",
            fontSize: 12,
            fontWeight: 600,
            background: copied ? "var(--violet)" : "var(--bg)",
            color: copied ? "#fff" : "var(--ink)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-sm)",
            cursor: "pointer",
          }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre
        style={{
          whiteSpace: "pre-wrap",
          fontSize: 13,
          lineHeight: 1.5,
          background: "var(--surface, #fff)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-sm)",
          padding: "12px 14px",
          margin: 0,
          maxHeight: 260,
          overflowY: "auto",
        }}
      >
        {prompt}
      </pre>
    </div>
  );
}
