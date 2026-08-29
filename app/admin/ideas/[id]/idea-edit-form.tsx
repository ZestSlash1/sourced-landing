"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { IdeaDrop } from "@/types/idea-drop";
import Link from "next/link";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-sm)",
  font: "inherit",
  marginBottom: 16,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  marginBottom: 6,
  color: "var(--ink-soft)",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 12,
  minHeight: 120,
  whiteSpace: "pre",
};

/** JSON-shaped fields, left as raw editable JSON rather than bespoke sub-forms for each nested type. */
const JSON_FIELDS = [
  "problem",
  "evidence",
  "buildBrief",
  "matchedApis",
  "launchStack",
  "agentPrompts",
  "difficulty",
] as const;

export default function IdeaEditForm({ idea }: { idea: IdeaDrop }) {
  const router = useRouter();

  const [title, setTitle] = useState(idea.title);
  const [category, setCategory] = useState(idea.category);
  const [tags, setTags] = useState(idea.tags.join(", "));
  const [demandScore, setDemandScore] = useState(String(idea.demandScore));
  const [tier, setTier] = useState<IdeaDrop["tier"]>(idea.tier);
  const [status, setStatus] = useState<IdeaDrop["status"]>(idea.status);
  const [publishedAt, setPublishedAt] = useState(idea.publishedAt ?? "");
  const [whyNow, setWhyNow] = useState(idea.whyNow);
  const [featured, setFeatured] = useState(idea.featured ?? false);

  const [jsonFields, setJsonFields] = useState<Record<(typeof JSON_FIELDS)[number], string>>(
    () =>
      Object.fromEntries(
        JSON_FIELDS.map((field) => [field, JSON.stringify(idea[field], null, 2)]),
      ) as Record<(typeof JSON_FIELDS)[number], string>,
  );

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const patch: Record<string, unknown> = {
      title,
      category,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      demandScore: Number(demandScore),
      tier,
      status,
      publishedAt: publishedAt || null,
      whyNow,
      featured,
    };

    for (const field of JSON_FIELDS) {
      try {
        patch[field] = JSON.parse(jsonFields[field]);
      } catch {
        setError(`"${field}" is not valid JSON`);
        return;
      }
    }

    setSaving(true);
    const res = await fetch(`/api/admin/ideas/${idea.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setSaving(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? `Save failed (${res.status})`);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24 }}>
        <h1 className="display" style={{ fontSize: 22, margin: 0 }}>
          Edit idea
        </h1>
        <Link href="/admin" style={{ fontSize: 13, color: "var(--ink-soft)" }}>
          Back to list
        </Link>
      </div>

      <label style={labelStyle}>Title</label>
      <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} required />

      <label style={labelStyle}>Category</label>
      <input style={inputStyle} value={category} onChange={(e) => setCategory(e.target.value)} required />

      <label style={labelStyle}>Tags (comma-separated)</label>
      <input style={inputStyle} value={tags} onChange={(e) => setTags(e.target.value)} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <div>
          <label style={labelStyle}>Demand score</label>
          <input
            style={inputStyle}
            type="number"
            min={0}
            max={100}
            value={demandScore}
            onChange={(e) => setDemandScore(e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>Tier</label>
          <select
            style={inputStyle}
            value={tier}
            onChange={(e) => setTier(e.target.value as IdeaDrop["tier"])}
          >
            <option value="free">free</option>
            <option value="builder">builder</option>
            <option value="studio">studio</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Status</label>
          <select
            style={inputStyle}
            value={status}
            onChange={(e) => setStatus(e.target.value as IdeaDrop["status"])}
          >
            <option value="draft">draft</option>
            <option value="needs_evidence">needs_evidence</option>
            <option value="pending_review">pending_review</option>
            <option value="published">published</option>
          </select>
        </div>
      </div>

      <label style={labelStyle}>Published at (YYYY-MM-DD, leave blank if draft)</label>
      <input
        style={inputStyle}
        type="date"
        value={publishedAt}
        onChange={(e) => setPublishedAt(e.target.value)}
      />

      <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 8 }}>
        <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
        Featured (shown in the curated logged-out feed default)
      </label>

      <label style={labelStyle}>Why now</label>
      <textarea
        style={{ ...inputStyle, minHeight: 60, fontFamily: "inherit", fontSize: "inherit" }}
        value={whyNow}
        onChange={(e) => setWhyNow(e.target.value)}
      />

      <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "24px 0 8px" }}>
        Structured fields below are edited as raw JSON — malformed JSON blocks save.
      </p>

      {JSON_FIELDS.map((field) => (
        <div key={field}>
          <label style={labelStyle}>{field}</label>
          <textarea
            style={textareaStyle}
            value={jsonFields[field]}
            onChange={(e) => setJsonFields((prev) => ({ ...prev, [field]: e.target.value }))}
            spellCheck={false}
          />
        </div>
      ))}

      {idea.validationErrors && idea.validationErrors.length > 0 && (
        <div style={{ marginBottom: 16, fontSize: 13, color: "var(--coral)" }}>
          <p style={{ margin: "0 0 4px" }}>Currently blocked from publishing:</p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {idea.validationErrors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p style={{ color: "var(--coral)", fontSize: 13, marginBottom: 16 }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={saving}
        style={{
          padding: "10px 18px",
          background: "var(--violet)",
          color: "#fff",
          border: "none",
          borderRadius: "var(--r-sm)",
          fontWeight: 600,
          cursor: saving ? "default" : "pointer",
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
