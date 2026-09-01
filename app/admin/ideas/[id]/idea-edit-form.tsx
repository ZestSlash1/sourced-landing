"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { IdeaDrop } from "@/types/idea-drop";
import Link from "next/link";

const textareaStyle: React.CSSProperties = {
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
  "competitiveLandscape",
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
        JSON_FIELDS.map((field) => [field, JSON.stringify(idea[field] ?? null, null, 2)]),
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24, flexWrap: "wrap", gap: 8 }}>
        <h1 className="display" style={{ fontSize: 22, margin: 0 }}>
          Edit idea
        </h1>
        <Link href="/admin" style={{ fontSize: 13, color: "var(--ink-soft)" }}>
          Back to list
        </Link>
      </div>

      <label className="admin-label">Title</label>
      <input className="admin-input" style={{ marginBottom: 16 }} value={title} onChange={(e) => setTitle(e.target.value)} required />

      <label className="admin-label">Category</label>
      <input className="admin-input" style={{ marginBottom: 16 }} value={category} onChange={(e) => setCategory(e.target.value)} required />

      <label className="admin-label">Tags (comma-separated)</label>
      <input className="admin-input" style={{ marginBottom: 16 }} value={tags} onChange={(e) => setTags(e.target.value)} />

      <div className="admin-form-grid" style={{ marginBottom: 16 }}>
        <div>
          <label className="admin-label">Demand score</label>
          <input
            className="admin-input"
            type="number"
            min={0}
            max={100}
            value={demandScore}
            onChange={(e) => setDemandScore(e.target.value)}
          />
        </div>
        <div>
          <label className="admin-label">Tier</label>
          <select className="admin-input" value={tier} onChange={(e) => setTier(e.target.value as IdeaDrop["tier"])}>
            <option value="free">free</option>
            <option value="builder">builder</option>
            <option value="studio">studio</option>
          </select>
        </div>
        <div>
          <label className="admin-label">Status</label>
          <select className="admin-input" value={status} onChange={(e) => setStatus(e.target.value as IdeaDrop["status"])}>
            <option value="draft">draft</option>
            <option value="needs_evidence">needs_evidence</option>
            <option value="pending_review">pending_review</option>
            <option value="published">published</option>
          </select>
        </div>
      </div>

      <label className="admin-label">Published at (YYYY-MM-DD, leave blank if draft)</label>
      <input
        className="admin-input"
        style={{ marginBottom: 16 }}
        type="date"
        value={publishedAt}
        onChange={(e) => setPublishedAt(e.target.value)}
      />

      <label className="admin-label" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
        Featured (shown in the curated logged-out feed default)
      </label>

      <label className="admin-label">Why now</label>
      <textarea
        className="admin-input"
        style={{ marginBottom: 16, minHeight: 60, fontFamily: "inherit", fontSize: "inherit" }}
        value={whyNow}
        onChange={(e) => setWhyNow(e.target.value)}
      />

      <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "24px 0 8px" }}>
        Structured fields below are edited as raw JSON. Malformed JSON blocks save.
      </p>

      {JSON_FIELDS.map((field) => (
        <div key={field} style={{ marginBottom: 16 }}>
          <label className="admin-label">{field}</label>
          <textarea
            className="admin-input"
            style={textareaStyle}
            value={jsonFields[field]}
            onChange={(e) => setJsonFields((prev) => ({ ...prev, [field]: e.target.value }))}
            spellCheck={false}
          />
        </div>
      ))}

      {idea.validationErrors && idea.validationErrors.length > 0 && (
        <div className="admin-error-banner" style={{ marginBottom: 16 }}>
          <p style={{ margin: "0 0 4px" }}>Currently blocked from publishing:</p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {idea.validationErrors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className="admin-error-banner"
            style={{ marginBottom: 16 }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <motion.button
        type="submit"
        disabled={saving}
        className="admin-btn admin-btn-primary"
        style={{ padding: "10px 18px", borderRadius: "var(--r-sm)" }}
        whileHover={saving ? undefined : { scale: 1.02 }}
        whileTap={saving ? undefined : { scale: 0.98 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
      >
        {saving ? "Saving..." : "Save"}
      </motion.button>
    </form>
  );
}
