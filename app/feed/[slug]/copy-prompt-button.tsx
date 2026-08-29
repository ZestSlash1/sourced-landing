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
    <div className="prompt-card">
      <div className="prompt-card-head">
        <span>{label}</span>
        <button
          type="button"
          onClick={handleCopy}
          className={`prompt-copy-btn ${copied ? "is-copied" : failed ? "is-failed" : ""}`}
        >
          {copied ? "Copied!" : failed ? "Couldn't copy" : "Copy"}
        </button>
      </div>
      <pre className="prompt-pre">
        <span className="prompt-prefix">$</span>
        {prompt}
      </pre>
    </div>
  );
}
