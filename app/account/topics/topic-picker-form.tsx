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

  function selectAll() {
    setSaved(false);
    setSelected(new Set(TOPICS));
  }

  function clearAll() {
    setSaved(false);
    setSelected(new Set());
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/account/topics", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topics: Array.from(selected) }),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>
          <strong style={{ color: "var(--ink)" }}>{selected.size}</strong> of {TOPICS.length} topics selected
        </span>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={selectAll}
            style={{ background: "none", border: "none", padding: 0, fontSize: 12.5, color: "var(--violet-deep)", cursor: "pointer", fontWeight: 600 }}
          >
            Select all
          </button>
          <span style={{ color: "var(--line)" }}>|</span>
          <button
            type="button"
            onClick={clearAll}
            style={{ background: "none", border: "none", padding: 0, fontSize: 12.5, color: "var(--ink-soft)", cursor: "pointer" }}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="topic-grid" style={{ marginBottom: 24 }}>
        {TOPICS.map((topic) => {
          const active = selected.has(topic);
          return (
            <button
              key={topic}
              type="button"
              onClick={() => toggle(topic)}
              className={`topic-chip ${active ? "is-active" : ""}`}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <span>{topic}</span>
              <span style={{ fontSize: 14, opacity: active ? 1 : 0.4 }}>
                {active ? "✓" : "+"}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary"
          style={{
            border: "none",
            cursor: saving ? "default" : "pointer",
            opacity: saving ? 0.7 : 1,
            padding: "10px 22px"
          }}
        >
          {saving ? "Saving preferences..." : "Save preferences"}
        </button>
        {saved && (
          <span style={{ fontSize: 13.5, color: "#10B981", fontWeight: 600 }}>
            ✓ Preferences saved
          </span>
        )}
      </div>
    </div>
  );
}
