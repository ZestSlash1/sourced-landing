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
      <div className="topic-grid" style={{ marginBottom: 24 }}>
        {TOPICS.map((topic) => {
          const active = selected.has(topic);
          return (
            <button
              key={topic}
              type="button"
              onClick={() => toggle(topic)}
              className={`topic-chip ${active ? "is-active" : ""}`}
            >
              {topic}
            </button>
          );
        })}
      </div>

      <button type="button" onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ border: "none", cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}>
        {saving ? "Saving..." : "Save topics"}
      </button>
      {saved && <span style={{ marginLeft: 12, fontSize: 13, color: "var(--ink-soft)" }}>Saved.</span>}
    </div>
  );
}
