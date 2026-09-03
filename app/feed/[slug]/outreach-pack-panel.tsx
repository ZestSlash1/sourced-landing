"use client";

import { useState } from "react";
import type { OutreachPack } from "@/lib/idea-drops/outreach";

export default function OutreachPackPanel({ pack }: { pack: OutreachPack }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleCopy(id: string, text: string) {
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
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="brief-section">
      <div className="eyebrow" style={{ color: "var(--violet-deep)" }}>
        Day-1 Customer Outreach Pack
      </div>
      <p style={{ margin: "0 0 14px", fontSize: 13.5, color: "var(--ink-soft)" }}>
        {pack.launchAdvice}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {pack.items.map((item) => (
          <div
            key={item.id}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md)",
              padding: "16px 18px",
              boxShadow: "var(--shadow)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  className="mono"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: "var(--violet-deep)",
                    background: "rgba(91, 79, 247, 0.08)",
                    padding: "3px 8px",
                    borderRadius: "var(--r-chip)",
                  }}
                >
                  {item.platform}
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>
                  Target: {item.targetHandle}
                </span>
                <a
                  href={item.threadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 11.5,
                    color: "var(--violet-deep)",
                    textDecoration: "underline",
                    textUnderlineOffset: 2,
                  }}
                >
                  Original thread ↗
                </a>
              </div>

              <button
                type="button"
                onClick={() => handleCopy(item.id, item.templateBody)}
                className={`prompt-copy-btn ${copiedId === item.id ? "is-copied" : ""}`}
              >
                {copiedId === item.id ? "Copied Script!" : "Copy Script"}
              </button>
            </div>

            <pre
              className="mono"
              style={{
                fontSize: 12,
                lineHeight: 1.6,
                background: "var(--bg)",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-sm)",
                padding: "12px 14px",
                margin: "0 0 10px",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                color: "var(--ink)",
              }}
            >
              {item.templateBody}
            </pre>

            <div
              style={{
                fontSize: 11.5,
                color: "var(--ink-soft)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <strong style={{ color: "var(--ink)" }}>Etiquette Rule:</strong> {item.etiquetteTip}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
