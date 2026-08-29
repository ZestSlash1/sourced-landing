"use client";

import { useState } from "react";
import { TOPICS } from "@/lib/topics";

export default function TopicPickerForm({ initialTopics }: { initialTopics: string[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialTopics));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggle(topic: string) {
    setSaved(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(topic)) next.delete(topic);
      else next.add(topic);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/account/topics", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topics: Array.from(selected) }),
    });
    setSaving(false);
    setSaved(true);
  }

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {TOPICS.map((topic) => {
          const active = selected.has(topic);
          return (
            <button
              key={topic}
              type="button"
              onClick={() => toggle(topic)}
              style={{
                textAlign: "left",
                padding: "12px 16px",
                borderRadius: "var(--r-sm)",
                border: `1px solid ${active ? "var(--violet)" : "var(--line)"}`,
                background: active ? "var(--violet)" : "var(--bg)",
                color: active ? "#fff" : "inherit",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              {topic}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        style={{
          padding: "10px 20px",
          background: "var(--violet)",
          color: "#fff",
          border: "none",
          borderRadius: "var(--r-sm)",
          fontWeight: 600,
          cursor: saving ? "default" : "pointer",
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? "Saving..." : "Save topics"}
      </button>
      {saved && <span style={{ marginLeft: 12, fontSize: 13, color: "var(--ink-soft)" }}>Saved.</span>}
    </div>
  );
}
