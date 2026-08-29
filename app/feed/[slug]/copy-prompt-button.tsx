"use client";

import { useState } from "react";

export default function CopyPromptButton({ label, prompt }: { label: string; prompt: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      // Clipboard API can fail (permissions, insecure context, unfocused
      // document) — fall back to the legacy selection-based copy rather
      // than silently doing nothing.
      const textarea = document.createElement("textarea");
      textarea.value = prompt;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (!ok) {
        setFailed(true);
        setTimeout(() => setFailed(false), 2000);
        return;
      }
    }
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
          {copied ? "Copied!" : failed ? "Couldn't copy" : "Copy"}
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
