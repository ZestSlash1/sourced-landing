"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type {
  IdeaDrop,
  Evidence,
  DataEntity,
  MatchedApi,
  StackItem,
  CompetitiveLandscape,
} from "@/types/idea-drop";
import Link from "next/link";

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

type JsonFieldName = (typeof JSON_FIELDS)[number];

const SUPPORTED_PLATFORMS: Evidence["platform"][] = [
  "hackernews",
  "reddit",
  "github",
  "devto",
  "lobsters",
  "stackexchange",
  "twitter",
  "devrant",
  "youtube",
  "codeberg",
  "discourse",
  "mastodon",
  "bluesky",
  "g2",
  "upwork",
  "appstore",
  "other",
];

const STACK_LAYERS: StackItem["layer"][] = [
  "hosting",
  "auth",
  "database",
  "payments",
  "storage",
  "email",
  "other",
];

type StudioTab = "core" | "problem" | "brief" | "evidence" | "stack" | "prompts" | "raw";

export default function IdeaEditForm({ idea }: { idea: IdeaDrop }) {
  const router = useRouter();

  // Mode: "visual" or "json"
  const [editorMode, setEditorMode] = useState<"visual" | "json">("visual");
  const [activeTab, setActiveTab] = useState<StudioTab>("core");

  // Core metadata fields
  const [title, setTitle] = useState(idea.title);
  const [category, setCategory] = useState(idea.category);
  const [tags, setTags] = useState(idea.tags.join(", "));
  const [tagInput, setTagInput] = useState("");
  const [demandScore, setDemandScore] = useState<number>(idea.demandScore);
  const [tier, setTier] = useState<IdeaDrop["tier"]>(idea.tier);
  const [status, setStatus] = useState<IdeaDrop["status"]>(idea.status);
  const [publishedAt, setPublishedAt] = useState(idea.publishedAt ?? "");
  const [whyNow, setWhyNow] = useState(idea.whyNow);
  const [featured, setFeatured] = useState(idea.featured ?? false);

  // Raw JSON fields source of truth
  const [jsonFields, setJsonFields] = useState<Record<JsonFieldName, string>>(() =>
    Object.fromEntries(
      JSON_FIELDS.map((field) => [field, JSON.stringify(idea[field] ?? null, null, 2)])
    ) as Record<JsonFieldName, string>
  );

  // Status & notifications
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Broadcast modal state
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [dryRunning, setDryRunning] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<{
    recipientCount: number;
    preview?: { subject: string; text: string };
  } | null>(null);
  const [broadcastResult, setBroadcastResult] = useState<{ recipientCount: number } | null>(null);

  // Active prompt sub-tab
  const [activePromptTab, setActivePromptTab] = useState<"claudeCode" | "cursorWindsurf" | "v0Bolt">("claudeCode");
  const [promptCopied, setPromptCopied] = useState<string | null>(null);

  // Check JSON validity for each field
  const jsonErrors = useMemo(() => {
    const errors: Partial<Record<JsonFieldName, string>> = {};
    for (const field of JSON_FIELDS) {
      try {
        JSON.parse(jsonFields[field]);
      } catch (err: unknown) {
        errors[field] = err instanceof Error ? err.message : "Syntax error";
      }
    }
    return errors;
  }, [jsonFields]);

  const hasJsonErrors = Object.keys(jsonErrors).length > 0;

  // Safe parsing helper with fallback
  const safeParse = useCallback(
    <T,>(field: JsonFieldName, fallback: T): T => {
      try {
        return JSON.parse(jsonFields[field]) as T;
      } catch {
        return fallback;
      }
    },
    [jsonFields]
  );

  // Update a structured JSON field and sync to jsonFields
  const updateJsonField = useCallback(
    <T,>(field: JsonFieldName, updater: (current: T) => T, fallback: T) => {
      const current = safeParse<T>(field, fallback);
      const updated = updater(current);
      setJsonFields((prev) => ({
        ...prev,
        [field]: JSON.stringify(updated, null, 2),
      }));
    },
    [safeParse]
  );

  // Structured representations
  const problemData = useMemo(
    () =>
      safeParse<{ summary: string; whoFeelsIt: string }>(
        "problem",
        idea.problem || { summary: "", whoFeelsIt: "" }
      ),
    [safeParse, idea.problem]
  );

  const difficultyData = useMemo(
    () =>
      safeParse<{
        soloWeekendProject: boolean;
        estimatedHours: number;
        skillFloor: "beginner" | "intermediate" | "advanced";
      }>("difficulty", idea.difficulty || { soloWeekendProject: true, estimatedHours: 12, skillFloor: "intermediate" }),
    [safeParse, idea.difficulty]
  );

  const buildBriefData = useMemo(
    () =>
      safeParse<{
        coreLoop: string[];
        mvpScope: string[];
        explicitlyCut: string[];
        dataModel: DataEntity[];
      }>("buildBrief", idea.buildBrief || { coreLoop: [], mvpScope: [], explicitlyCut: [], dataModel: [] }),
    [safeParse, idea.buildBrief]
  );

  const evidenceData = useMemo(
    () => safeParse<Evidence[]>("evidence", idea.evidence || []),
    [safeParse, idea.evidence]
  );

  const matchedApisData = useMemo(
    () => safeParse<MatchedApi[]>("matchedApis", idea.matchedApis || []),
    [safeParse, idea.matchedApis]
  );

  const launchStackData = useMemo(
    () => safeParse<StackItem[]>("launchStack", idea.launchStack || []),
    [safeParse, idea.launchStack]
  );

  const agentPromptsData = useMemo(
    () =>
      safeParse<{
        claudeCode: string;
        cursorWindsurf: string;
        v0Bolt: string;
      }>("agentPrompts", idea.agentPrompts || { claudeCode: "", cursorWindsurf: "", v0Bolt: "" }),
    [safeParse, idea.agentPrompts]
  );

  // Tag chip handlers
  const parsedTags = useMemo(
    () => tags.split(",").map((t) => t.trim()).filter(Boolean),
    [tags]
  );

  const addTag = (newTag: string) => {
    const trimmed = newTag.trim();
    if (!trimmed || parsedTags.includes(trimmed)) return;
    const next = [...parsedTags, trimmed];
    setTags(next.join(", "));
    setTagInput("");
  };

  const removeTag = (tagToRemove: string) => {
    const next = parsedTags.filter((t) => t !== tagToRemove);
    setTags(next.join(", "));
  };

  // Broadcast handlers
  async function runBroadcastDryRun() {
    setDryRunning(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/ideas/${idea.id}/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Dry run check failed");
      setDryRunResult({
        recipientCount: data.recipientCount ?? 0,
        preview: data.preview,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to run dry run check");
    } finally {
      setDryRunning(false);
    }
  }

  async function executeBroadcastLive() {
    setBroadcasting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/ideas/${idea.id}/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Broadcast failed");
      setBroadcastResult({ recipientCount: data.recipientCount ?? 0 });
      setShowBroadcastModal(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to broadcast");
    } finally {
      setBroadcasting(false);
    }
  }

  // Format single JSON field
  function formatField(field: JsonFieldName) {
    try {
      const parsed = JSON.parse(jsonFields[field]);
      setJsonFields((prev) => ({
        ...prev,
        [field]: JSON.stringify(parsed, null, 2),
      }));
    } catch {
      // Ignored if invalid
    }
  }

  // Format all valid JSON fields
  function formatAllFields() {
    setJsonFields((prev) => {
      const next = { ...prev };
      for (const field of JSON_FIELDS) {
        try {
          const parsed = JSON.parse(next[field]);
          next[field] = JSON.stringify(parsed, null, 2);
        } catch {
          // Leave invalid as-is
        }
      }
      return next;
    });
  }

  // Copy prompt helper
  async function copyPrompt(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setPromptCopied(key);
      setTimeout(() => setPromptCopied(null), 2500);
    } catch {
      // Clipboard fallback
    }
  }

  // Form submit handler
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaveSuccess(false);

    const patch: Record<string, unknown> = {
      title,
      category,
      tags: parsedTags,
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
        setError(`"${field}" contains malformed JSON. Please fix in Raw JSON mode.`);
        setActiveTab("raw");
        setEditorMode("json");
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

    setSaveSuccess(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{ position: "relative" }}>
      {/* Top Header & Command Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
          paddingBottom: 16,
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <h1 className="display" style={{ fontSize: 22, margin: 0 }}>
              Drop Studio
            </h1>
            <span
              className="mono"
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: "var(--r-chip)",
                background: "rgba(124, 58, 237, 0.08)",
                color: "var(--violet-deep)",
                border: "1px solid rgba(124, 58, 237, 0.2)",
              }}
            >
              {idea.id}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: "var(--r-chip)",
                background:
                  status === "published"
                    ? "rgba(16, 185, 129, 0.12)"
                    : status === "needs_evidence"
                    ? "rgba(255, 111, 94, 0.12)"
                    : "rgba(0, 0, 0, 0.06)",
                color:
                  status === "published"
                    ? "#047857"
                    : status === "needs_evidence"
                    ? "var(--coral-deep)"
                    : "var(--ink)",
              }}
            >
              {status}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "var(--ink-soft)" }}>
            Structured editor with live JSON synchronization and validation
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Mode Switcher */}
          <div
            style={{
              display: "inline-flex",
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-chip)",
              padding: 3,
              gap: 2,
            }}
          >
            <button
              type="button"
              onClick={() => setEditorMode("visual")}
              style={{
                border: "none",
                background: editorMode === "visual" ? "var(--ink)" : "transparent",
                color: editorMode === "visual" ? "#fff" : "var(--ink-soft)",
                borderRadius: "var(--r-chip)",
                padding: "5px 12px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Visual Studio
            </button>
            <button
              type="button"
              onClick={() => {
                setEditorMode("json");
                setActiveTab("raw");
              }}
              style={{
                border: "none",
                background: editorMode === "json" ? "var(--ink)" : "transparent",
                color: editorMode === "json" ? "#fff" : "var(--ink-soft)",
                borderRadius: "var(--r-chip)",
                padding: "5px 12px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                transition: "all 0.15s ease",
              }}
            >
              Raw JSON
              {hasJsonErrors && (
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#EF4444",
                  }}
                />
              )}
            </button>
          </div>

          {/* Broadcast button (if published) */}
          {idea.status === "published" && (
            <button
              type="button"
              onClick={() => setShowBroadcastModal(true)}
              disabled={broadcasting}
              className="admin-btn"
              style={{
                background: broadcastResult
                  ? "rgba(52, 211, 153, 0.12)"
                  : "rgba(124, 58, 237, 0.1)",
                color: broadcastResult ? "#059669" : "var(--violet-deep)",
                border: broadcastResult
                  ? "1px solid rgba(52, 211, 153, 0.4)"
                  : "1px solid rgba(124, 58, 237, 0.3)",
                fontSize: 12,
                padding: "6px 12px",
                borderRadius: "var(--r-chip)",
                cursor: "pointer",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {broadcastResult
                ? `✓ Broadcasted (${broadcastResult.recipientCount})`
                : "📢 Broadcast Drop"}
            </button>
          )}

          {/* Save Button */}
          <button
            type="submit"
            disabled={saving}
            className="admin-btn admin-btn-primary"
            style={{
              padding: "7px 18px",
              borderRadius: "var(--r-chip)",
              fontSize: 13,
            }}
          >
            {saving ? "Saving..." : saveSuccess ? "✓ Saved" : "Save Changes"}
          </button>

          <Link
            href="/admin"
            style={{
              fontSize: 13,
              color: "var(--ink-soft)",
              textDecoration: "none",
              padding: "6px 10px",
            }}
          >
            Back
          </Link>
        </div>
      </div>

      {/* JSON Syntax Error Alert Banner */}
      {hasJsonErrors && (
        <div
          className="admin-error-banner"
          style={{
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div>
            <strong>Syntax error detected:</strong> The following raw JSON fields have syntax errors:{" "}
            <span className="mono">{Object.keys(jsonErrors).join(", ")}</span>.
          </div>
          <button
            type="button"
            onClick={() => {
              setEditorMode("json");
              setActiveTab("raw");
            }}
            style={{
              background: "var(--coral-deep)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--r-chip)",
              padding: "4px 10px",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Inspect in Raw JSON Mode →
          </button>
        </div>
      )}

      {/* Validation Errors from Ingest */}
      {idea.validationErrors && idea.validationErrors.length > 0 && (
        <div className="admin-error-banner" style={{ marginBottom: 16 }}>
          <p style={{ margin: "0 0 4px", fontWeight: 600 }}>Currently blocked from publishing:</p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {idea.validationErrors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Save Success / Error banners */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="admin-error-banner"
            style={{ marginBottom: 16 }}
          >
            {error}
          </motion.div>
        )}
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              marginBottom: 16,
              padding: "10px 14px",
              borderRadius: "var(--r-sm)",
              background: "rgba(16, 185, 129, 0.12)",
              color: "#047857",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            ✓ Changes saved successfully.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Visual Mode Navigation Tabs */}
      {editorMode === "visual" && (
        <div
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            paddingBottom: 8,
            marginBottom: 20,
            borderBottom: "1px solid var(--line)",
          }}
        >
          {(
            [
              { id: "core", label: "1. Core & Publishing" },
              { id: "problem", label: "2. Problem & Difficulty" },
              { id: "brief", label: `3. Build Brief (${buildBriefData.coreLoop?.length || 0})` },
              { id: "evidence", label: `4. Evidence (${evidenceData.length})` },
              { id: "stack", label: `5. APIs & Stack (${matchedApisData.length + launchStackData.length})` },
              { id: "prompts", label: "6. Agent Prompts" },
            ] as const
          ).map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                style={{
                  border: "none",
                  background: isActive ? "var(--surface)" : "transparent",
                  color: isActive ? "var(--violet-deep)" : "var(--ink-soft)",
                  fontWeight: isActive ? 700 : 500,
                  fontSize: 12.5,
                  padding: "7px 14px",
                  borderRadius: "var(--r-chip)",
                  borderBottom: isActive ? "2px solid var(--violet)" : "2px solid transparent",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ─── VISUAL MODE PANELS ────────────────────────────────────────── */}
      {editorMode === "visual" && (
        <div>
          {/* TAB 1: CORE METADATA & PUBLISHING */}
          {activeTab === "core" && (
            <div className="admin-card" style={{ padding: 24, marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, margin: "0 0 16px", fontWeight: 600 }}>
                Core Metadata &amp; Publishing
              </h2>

              <div style={{ marginBottom: 16 }}>
                <label className="admin-label">Drop Title</label>
                <input
                  className="admin-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Micro-SaaS for Cloud Cost Guardrails"
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label className="admin-label">Category</label>
                  <input
                    className="admin-input"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Developer Tools, B2B SaaS"
                    required
                  />
                </div>

                <div>
                  <label className="admin-label">Tier Access</label>
                  <select
                    className="admin-input"
                    value={tier}
                    onChange={(e) => setTier(e.target.value as IdeaDrop["tier"])}
                  >
                    <option value="free">free (Open to all visitors)</option>
                    <option value="builder">builder (Builder subscribers)</option>
                    <option value="studio">studio (Studio tier only)</option>
                  </select>
                </div>
              </div>

              {/* Tags with Interactive Chips */}
              <div style={{ marginBottom: 16 }}>
                <label className="admin-label">Tags (Type &amp; press Enter or comma)</label>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 10px",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--r-sm)",
                    background: "var(--surface)",
                  }}
                >
                  {parsedTags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 11.5,
                        padding: "2px 8px",
                        borderRadius: "var(--r-chip)",
                        background: "rgba(124, 58, 237, 0.09)",
                        color: "var(--violet-deep)",
                        border: "1px solid rgba(124, 58, 237, 0.2)",
                      }}
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                          fontSize: 11,
                          color: "var(--violet-deep)",
                          lineHeight: 1,
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addTag(tagInput);
                      }
                    }}
                    placeholder={parsedTags.length === 0 ? "Add tags (e.g. ai, nextjs, devtools)..." : "Add tag..."}
                    style={{
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      fontSize: 12.5,
                      fontFamily: "inherit",
                      color: "var(--ink)",
                      minWidth: 120,
                      flex: 1,
                    }}
                  />
                </div>
              </div>

              {/* Demand Score (Slider + Input) */}
              <div style={{ marginBottom: 16, padding: "14px 16px", background: "var(--bg)", borderRadius: "var(--r-sm)", border: "1px solid var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <label className="admin-label" style={{ margin: 0, fontWeight: 600 }}>
                    Demand Score: <span className="mono" style={{ color: "var(--violet-deep)", fontSize: 15 }}>{demandScore}</span> / 100
                  </label>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: "var(--r-chip)",
                      background:
                        demandScore >= 80
                          ? "rgba(16, 185, 129, 0.12)"
                          : demandScore >= 60
                          ? "rgba(124, 58, 237, 0.12)"
                          : "rgba(245, 158, 11, 0.12)",
                      color:
                        demandScore >= 80 ? "#047857" : demandScore >= 60 ? "var(--violet-deep)" : "#B45309",
                    }}
                  >
                    {demandScore >= 80 ? "High Demand" : demandScore >= 60 ? "Solid Traction" : "Emerging Signal"}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={demandScore}
                    onChange={(e) => setDemandScore(Number(e.target.value))}
                    style={{ flex: 1, accentColor: "var(--violet)" }}
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={demandScore}
                    onChange={(e) => setDemandScore(Math.min(100, Math.max(0, Number(e.target.value))))}
                    className="admin-input"
                    style={{ width: 75, textAlign: "center", fontWeight: 700 }}
                  />
                </div>
              </div>

              {/* Status & Publishing Date */}
              <div className="admin-form-grid" style={{ marginBottom: 16 }}>
                <div>
                  <label className="admin-label">Status</label>
                  <select
                    className="admin-input"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as IdeaDrop["status"])}
                  >
                    <option value="draft">draft</option>
                    <option value="needs_evidence">needs_evidence</option>
                    <option value="pending_review">pending_review</option>
                    <option value="published">published</option>
                  </select>
                </div>

                <div>
                  <label className="admin-label">Published At</label>
                  <input
                    type="date"
                    className="admin-input"
                    value={publishedAt}
                    onChange={(e) => setPublishedAt(e.target.value)}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", paddingBottom: 6 }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={featured}
                      onChange={(e) => setFeatured(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: "var(--violet)" }}
                    />
                    <strong>Featured Drop</strong> (Homepage showcase)
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROBLEM, WHY NOW & DIFFICULTY */}
          {activeTab === "problem" && (
            <div className="admin-card" style={{ padding: 24, marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, margin: "0 0 16px", fontWeight: 600 }}>
                Problem Thesis, Why Now &amp; Difficulty
              </h2>

              <div style={{ marginBottom: 16 }}>
                <label className="admin-label">Problem Summary (1–2 crisp sentences)</label>
                <textarea
                  className="admin-input"
                  style={{ minHeight: 70 }}
                  value={problemData.summary || ""}
                  onChange={(e) =>
                    updateJsonField(
                      "problem",
                      (curr: { summary: string; whoFeelsIt: string }) => ({
                        ...curr,
                        summary: e.target.value,
                      }),
                      { summary: "", whoFeelsIt: "" }
                    )
                  }
                  placeholder="What is the core user complaint or bottleneck?"
                  required
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="admin-label">Who Feels It (Target Audience persona)</label>
                <input
                  className="admin-input"
                  value={problemData.whoFeelsIt || ""}
                  onChange={(e) =>
                    updateJsonField(
                      "problem",
                      (curr: { summary: string; whoFeelsIt: string }) => ({
                        ...curr,
                        whoFeelsIt: e.target.value,
                      }),
                      { summary: "", whoFeelsIt: "" }
                    )
                  }
                  placeholder="e.g. Solo Next.js founders, B2B sales engineers"
                  required
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label className="admin-label">Why Now (Catalyst, new API, or market shift)</label>
                <textarea
                  className="admin-input"
                  style={{ minHeight: 70 }}
                  value={whyNow}
                  onChange={(e) => setWhyNow(e.target.value)}
                  placeholder="Why is this buildable or urgent right now?"
                />
              </div>

              <h3 style={{ fontSize: 14, margin: "0 0 12px", fontWeight: 600, color: "var(--ink)" }}>
                Difficulty &amp; Build Velocity
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 16,
                  padding: 16,
                  background: "var(--bg)",
                  borderRadius: "var(--r-sm)",
                  border: "1px solid var(--line)",
                }}
              >
                <div>
                  <label className="admin-label">Solo Weekend Viable?</label>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                      marginTop: 8,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(difficultyData.soloWeekendProject)}
                      onChange={(e) =>
                        updateJsonField(
                          "difficulty",
                          (curr: typeof difficultyData) => ({
                            ...curr,
                            soloWeekendProject: e.target.checked,
                          }),
                          { soloWeekendProject: true, estimatedHours: 12, skillFloor: "intermediate" }
                        )
                      }
                      style={{ width: 16, height: 16, accentColor: "var(--violet)" }}
                    />
                    <span>Yes, viable in 1 weekend</span>
                  </label>
                </div>

                <div>
                  <label className="admin-label">Estimated Build Hours</label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    className="admin-input"
                    value={difficultyData.estimatedHours || 12}
                    onChange={(e) =>
                      updateJsonField(
                        "difficulty",
                        (curr: typeof difficultyData) => ({
                          ...curr,
                          estimatedHours: Number(e.target.value),
                        }),
                        { soloWeekendProject: true, estimatedHours: 12, skillFloor: "intermediate" }
                      )
                    }
                  />
                </div>

                <div>
                  <label className="admin-label">Skill Floor</label>
                  <select
                    className="admin-input"
                    value={difficultyData.skillFloor || "intermediate"}
                    onChange={(e) =>
                      updateJsonField(
                        "difficulty",
                        (curr: typeof difficultyData) => ({
                          ...curr,
                          skillFloor: e.target.value as "beginner" | "intermediate" | "advanced",
                        }),
                        { soloWeekendProject: true, estimatedHours: 12, skillFloor: "intermediate" }
                      )
                    }
                  >
                    <option value="beginner">beginner</option>
                    <option value="intermediate">intermediate</option>
                    <option value="advanced">advanced</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BUILD BRIEF */}
          {activeTab === "brief" && (
            <div className="admin-card" style={{ padding: 24, marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, margin: "0 0 16px", fontWeight: 600 }}>
                Build Brief (Execution Specification)
              </h2>

              {/* Core Loop string[] */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <label className="admin-label" style={{ margin: 0, fontWeight: 600 }}>
                    Core Loop (Ordered steps 1–5)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      updateJsonField(
                        "buildBrief",
                        (curr: typeof buildBriefData) => ({
                          ...curr,
                          coreLoop: [...(curr.coreLoop || []), ""],
                        }),
                        { coreLoop: [], mvpScope: [], explicitlyCut: [], dataModel: [] }
                      )
                    }
                    className="admin-btn admin-btn-ghost"
                    style={{ fontSize: 11, padding: "3px 10px" }}
                  >
                    + Add Step
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(buildBriefData.coreLoop || []).map((step, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        className="mono"
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          background: "var(--violet)",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {idx + 1}
                      </span>
                      <input
                        className="admin-input"
                        value={step}
                        placeholder={`Step ${idx + 1}...`}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateJsonField(
                            "buildBrief",
                            (curr: typeof buildBriefData) => {
                              const next = [...(curr.coreLoop || [])];
                              next[idx] = val;
                              return { ...curr, coreLoop: next };
                            },
                            { coreLoop: [], mvpScope: [], explicitlyCut: [], dataModel: [] }
                          );
                        }}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateJsonField(
                            "buildBrief",
                            (curr: typeof buildBriefData) => ({
                              ...curr,
                              coreLoop: curr.coreLoop.filter((_, i) => i !== idx),
                            }),
                            { coreLoop: [], mvpScope: [], explicitlyCut: [], dataModel: [] }
                          )
                        }
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "var(--coral-deep)",
                          cursor: "pointer",
                          fontSize: 14,
                          padding: "4px 8px",
                        }}
                        title="Remove step"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* MVP Scope & Explicitly Cut 2-Column Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
                {/* MVP Scope */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <label className="admin-label" style={{ margin: 0, fontWeight: 600, color: "#047857" }}>
                      ✓ MVP Scope (What&apos;s IN)
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        updateJsonField(
                          "buildBrief",
                          (curr: typeof buildBriefData) => ({
                            ...curr,
                            mvpScope: [...(curr.mvpScope || []), ""],
                          }),
                          { coreLoop: [], mvpScope: [], explicitlyCut: [], dataModel: [] }
                        )
                      }
                      className="admin-btn admin-btn-ghost"
                      style={{ fontSize: 11, padding: "2px 8px" }}
                    >
                      + Add Item
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {(buildBriefData.mvpScope || []).map((item, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ color: "#10B981", fontSize: 13, flexShrink: 0 }}>✓</span>
                        <input
                          className="admin-input"
                          style={{ fontSize: 12.5 }}
                          value={item}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateJsonField(
                              "buildBrief",
                              (curr: typeof buildBriefData) => {
                                const next = [...(curr.mvpScope || [])];
                                next[idx] = val;
                                return { ...curr, mvpScope: next };
                              },
                              { coreLoop: [], mvpScope: [], explicitlyCut: [], dataModel: [] }
                            );
                          }}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateJsonField(
                              "buildBrief",
                              (curr: typeof buildBriefData) => ({
                                ...curr,
                                mvpScope: curr.mvpScope.filter((_, i) => i !== idx),
                              }),
                              { coreLoop: [], mvpScope: [], explicitlyCut: [], dataModel: [] }
                            )
                          }
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "var(--ink-soft)",
                            cursor: "pointer",
                            fontSize: 12,
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Explicitly Cut */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <label className="admin-label" style={{ margin: 0, fontWeight: 600, color: "var(--coral-deep)" }}>
                      ✕ Explicitly Cut (What&apos;s OUT)
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        updateJsonField(
                          "buildBrief",
                          (curr: typeof buildBriefData) => ({
                            ...curr,
                            explicitlyCut: [...(curr.explicitlyCut || []), ""],
                          }),
                          { coreLoop: [], mvpScope: [], explicitlyCut: [], dataModel: [] }
                        )
                      }
                      className="admin-btn admin-btn-ghost"
                      style={{ fontSize: 11, padding: "2px 8px" }}
                    >
                      + Add Item
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {(buildBriefData.explicitlyCut || []).map((item, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ color: "var(--coral-deep)", fontSize: 13, flexShrink: 0 }}>✕</span>
                        <input
                          className="admin-input"
                          style={{ fontSize: 12.5 }}
                          value={item}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateJsonField(
                              "buildBrief",
                              (curr: typeof buildBriefData) => {
                                const next = [...(curr.explicitlyCut || [])];
                                next[idx] = val;
                                return { ...curr, explicitlyCut: next };
                              },
                              { coreLoop: [], mvpScope: [], explicitlyCut: [], dataModel: [] }
                            );
                          }}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateJsonField(
                              "buildBrief",
                              (curr: typeof buildBriefData) => ({
                                ...curr,
                                explicitlyCut: curr.explicitlyCut.filter((_, i) => i !== idx),
                              }),
                              { coreLoop: [], mvpScope: [], explicitlyCut: [], dataModel: [] }
                            )
                          }
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "var(--ink-soft)",
                            cursor: "pointer",
                            fontSize: 12,
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Data Model Entities */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <label className="admin-label" style={{ margin: 0, fontWeight: 600 }}>
                    Data Model Schema ({buildBriefData.dataModel?.length || 0} Entities)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      updateJsonField(
                        "buildBrief",
                        (curr: typeof buildBriefData) => ({
                          ...curr,
                          dataModel: [...(curr.dataModel || []), { name: "", fields: "" }],
                        }),
                        { coreLoop: [], mvpScope: [], explicitlyCut: [], dataModel: [] }
                      )
                    }
                    className="admin-btn admin-btn-ghost"
                    style={{ fontSize: 11, padding: "3px 10px" }}
                  >
                    + Add Entity
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(buildBriefData.dataModel || []).map((entity, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "180px 1fr auto",
                        gap: 10,
                        alignItems: "center",
                        padding: 8,
                        background: "var(--bg)",
                        borderRadius: "var(--r-sm)",
                        border: "1px solid var(--line)",
                      }}
                    >
                      <input
                        className="admin-input mono"
                        placeholder="Entity Name (e.g. Lead)"
                        value={entity.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateJsonField(
                            "buildBrief",
                            (curr: typeof buildBriefData) => {
                              const next = [...(curr.dataModel || [])];
                              next[idx] = { ...next[idx], name: val };
                              return { ...curr, dataModel: next };
                            },
                            { coreLoop: [], mvpScope: [], explicitlyCut: [], dataModel: [] }
                          );
                        }}
                      />
                      <input
                        className="admin-input mono"
                        placeholder="Fields (e.g. id, team_id, email, score, created_at)"
                        value={entity.fields}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateJsonField(
                            "buildBrief",
                            (curr: typeof buildBriefData) => {
                              const next = [...(curr.dataModel || [])];
                              next[idx] = { ...next[idx], fields: val };
                              return { ...curr, dataModel: next };
                            },
                            { coreLoop: [], mvpScope: [], explicitlyCut: [], dataModel: [] }
                          );
                        }}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateJsonField(
                            "buildBrief",
                            (curr: typeof buildBriefData) => ({
                              ...curr,
                              dataModel: curr.dataModel.filter((_, i) => i !== idx),
                            }),
                            { coreLoop: [], mvpScope: [], explicitlyCut: [], dataModel: [] }
                          )
                        }
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "var(--coral-deep)",
                          cursor: "pointer",
                          padding: "4px 8px",
                        }}
                        title="Delete entity"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: EVIDENCE SIGNALS */}
          {activeTab === "evidence" && (
            <div className="admin-card" style={{ padding: 24, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 16, margin: "0 0 4px", fontWeight: 600 }}>
                    Evidence Signals ({evidenceData.length})
                  </h2>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--ink-soft)" }}>
                    Minimum 3 cross-platform complaint signals required for auto-publishing gate
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newSignal: Evidence = {
                      platform: "hackernews",
                      subforum: "",
                      quote: "",
                      url: "https://",
                      date: new Date().toISOString().slice(0, 10),
                    };
                    updateJsonField(
                      "evidence",
                      (curr: Evidence[]) => [...curr, newSignal],
                      []
                    );
                  }}
                  className="admin-btn admin-btn-primary"
                  style={{ fontSize: 12, padding: "5px 12px" }}
                >
                  + Add Evidence Signal
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {evidenceData.map((ev, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: 16,
                      background: "var(--bg)",
                      borderRadius: "var(--r-md)",
                      border: "1px solid var(--line)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 10,
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span
                          className="mono"
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: "var(--r-chip)",
                            background: "rgba(124, 58, 237, 0.12)",
                            color: "var(--violet-deep)",
                          }}
                        >
                          Signal #{idx + 1}
                        </span>

                        <select
                          className="admin-input"
                          style={{ width: "auto", fontSize: 12, padding: "4px 8px" }}
                          value={ev.platform}
                          onChange={(e) => {
                            const val = e.target.value as Evidence["platform"];
                            updateJsonField(
                              "evidence",
                              (curr: Evidence[]) => {
                                const next = [...curr];
                                next[idx] = { ...next[idx], platform: val };
                                return next;
                              },
                              []
                            );
                          }}
                        >
                          {SUPPORTED_PLATFORMS.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>

                        <input
                          className="admin-input"
                          style={{ width: 140, fontSize: 12, padding: "4px 8px" }}
                          placeholder="Subforum / Repo"
                          value={ev.subforum || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateJsonField(
                              "evidence",
                              (curr: Evidence[]) => {
                                const next = [...curr];
                                next[idx] = { ...next[idx], subforum: val };
                                return next;
                              },
                              []
                            );
                          }}
                        />

                        <input
                          type="date"
                          className="admin-input"
                          style={{ width: 140, fontSize: 12, padding: "4px 8px" }}
                          value={ev.date || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateJsonField(
                              "evidence",
                              (curr: Evidence[]) => {
                                const next = [...curr];
                                next[idx] = { ...next[idx], date: val };
                                return next;
                              },
                              []
                            );
                          }}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          updateJsonField(
                            "evidence",
                            (curr: Evidence[]) => curr.filter((_, i) => i !== idx),
                            []
                          )
                        }
                        className="admin-btn admin-btn-danger"
                        style={{ fontSize: 11, padding: "3px 8px" }}
                      >
                        Remove
                      </button>
                    </div>

                    <div style={{ marginBottom: 8 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                          className="admin-input mono"
                          style={{ fontSize: 12, padding: "6px 8px", flex: 1 }}
                          placeholder="URL (https://...)"
                          value={ev.url}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateJsonField(
                              "evidence",
                              (curr: Evidence[]) => {
                                const next = [...curr];
                                next[idx] = { ...next[idx], url: val };
                                return next;
                              },
                              []
                            );
                          }}
                          required
                        />
                        {ev.url && ev.url.startsWith("http") && (
                          <a
                            href={ev.url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              fontSize: 12,
                              color: "var(--violet-deep)",
                              textDecoration: "none",
                              padding: "4px 8px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Open Link ↗
                          </a>
                        )}
                      </div>
                    </div>

                    <div>
                      <textarea
                        className="admin-input"
                        style={{ minHeight: 60, fontSize: 12.5 }}
                        placeholder="Quoted complaint or paraphrased frustration..."
                        value={ev.quote}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateJsonField(
                            "evidence",
                            (curr: Evidence[]) => {
                              const next = [...curr];
                              next[idx] = { ...next[idx], quote: val };
                              return next;
                            },
                            []
                          );
                        }}
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: APIS & LAUNCH STACK */}
          {activeTab === "stack" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Matched APIs */}
              <div className="admin-card" style={{ padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <h2 style={{ fontSize: 16, margin: "0 0 4px", fontWeight: 600 }}>
                      Matched Public APIs ({matchedApisData.length})
                    </h2>
                    <p style={{ margin: 0, fontSize: 12, color: "var(--ink-soft)" }}>
                      Curated APIs enabling this specific drop with generous free limits
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newApi: MatchedApi = {
                        name: "",
                        purpose: "",
                        freeTierLimit: "",
                        sourceUrl: "https://",
                      };
                      updateJsonField(
                        "matchedApis",
                        (curr: MatchedApi[]) => [...curr, newApi],
                        []
                      );
                    }}
                    className="admin-btn admin-btn-ghost"
                    style={{ fontSize: 12, padding: "4px 10px" }}
                  >
                    + Add Matched API
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {matchedApisData.map((api, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "140px 1fr 140px 1fr auto",
                        gap: 8,
                        alignItems: "center",
                        padding: 10,
                        background: "var(--bg)",
                        borderRadius: "var(--r-sm)",
                        border: "1px solid var(--line)",
                      }}
                    >
                      <input
                        className="admin-input"
                        placeholder="API Name"
                        value={api.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateJsonField(
                            "matchedApis",
                            (curr: MatchedApi[]) => {
                              const next = [...curr];
                              next[idx] = { ...next[idx], name: val };
                              return next;
                            },
                            []
                          );
                        }}
                      />
                      <input
                        className="admin-input"
                        placeholder="Specific Purpose for this Idea"
                        value={api.purpose}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateJsonField(
                            "matchedApis",
                            (curr: MatchedApi[]) => {
                              const next = [...curr];
                              next[idx] = { ...next[idx], purpose: val };
                              return next;
                            },
                            []
                          );
                        }}
                      />
                      <input
                        className="admin-input"
                        placeholder="Free tier limit"
                        value={api.freeTierLimit}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateJsonField(
                            "matchedApis",
                            (curr: MatchedApi[]) => {
                              const next = [...curr];
                              next[idx] = { ...next[idx], freeTierLimit: val };
                              return next;
                            },
                            []
                          );
                        }}
                      />
                      <input
                        className="admin-input mono"
                        placeholder="Documentation URL"
                        value={api.sourceUrl}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateJsonField(
                            "matchedApis",
                            (curr: MatchedApi[]) => {
                              const next = [...curr];
                              next[idx] = { ...next[idx], sourceUrl: val };
                              return next;
                            },
                            []
                          );
                        }}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateJsonField(
                            "matchedApis",
                            (curr: MatchedApi[]) => curr.filter((_, i) => i !== idx),
                            []
                          )
                        }
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "var(--coral-deep)",
                          cursor: "pointer",
                          padding: "4px 8px",
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Launch Stack */}
              <div className="admin-card" style={{ padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <h2 style={{ fontSize: 16, margin: "0 0 4px", fontWeight: 600 }}>
                      Zero-Marginal-Cost Launch Stack ({launchStackData.length})
                    </h2>
                    <p style={{ margin: 0, fontSize: 12, color: "var(--ink-soft)" }}>
                      Recommended components across hosting, auth, DB, payments
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newStack: StackItem = {
                        layer: "hosting",
                        tool: "",
                        freeTierNote: "",
                        sourceUrl: "https://",
                      };
                      updateJsonField(
                        "launchStack",
                        (curr: StackItem[]) => [...curr, newStack],
                        []
                      );
                    }}
                    className="admin-btn admin-btn-ghost"
                    style={{ fontSize: 12, padding: "4px 10px" }}
                  >
                    + Add Stack Item
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {launchStackData.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "130px 140px 1fr 1fr auto",
                        gap: 8,
                        alignItems: "center",
                        padding: 10,
                        background: "var(--bg)",
                        borderRadius: "var(--r-sm)",
                        border: "1px solid var(--line)",
                      }}
                    >
                      <select
                        className="admin-input"
                        value={item.layer}
                        onChange={(e) => {
                          const val = e.target.value as StackItem["layer"];
                          updateJsonField(
                            "launchStack",
                            (curr: StackItem[]) => {
                              const next = [...curr];
                              next[idx] = { ...next[idx], layer: val };
                              return next;
                            },
                            []
                          );
                        }}
                      >
                        {STACK_LAYERS.map((layer) => (
                          <option key={layer} value={layer}>
                            {layer}
                          </option>
                        ))}
                      </select>
                      <input
                        className="admin-input"
                        placeholder="Tool (e.g. Supabase)"
                        value={item.tool}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateJsonField(
                            "launchStack",
                            (curr: StackItem[]) => {
                              const next = [...curr];
                              next[idx] = { ...next[idx], tool: val };
                              return next;
                            },
                            []
                          );
                        }}
                      />
                      <input
                        className="admin-input"
                        placeholder="Free tier quota note"
                        value={item.freeTierNote}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateJsonField(
                            "launchStack",
                            (curr: StackItem[]) => {
                              const next = [...curr];
                              next[idx] = { ...next[idx], freeTierNote: val };
                              return next;
                            },
                            []
                          );
                        }}
                      />
                      <input
                        className="admin-input mono"
                        placeholder="Source URL"
                        value={item.sourceUrl || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateJsonField(
                            "launchStack",
                            (curr: StackItem[]) => {
                              const next = [...curr];
                              next[idx] = { ...next[idx], sourceUrl: val };
                              return next;
                            },
                            []
                          );
                        }}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateJsonField(
                            "launchStack",
                            (curr: StackItem[]) => curr.filter((_, i) => i !== idx),
                            []
                          )
                        }
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "var(--coral-deep)",
                          cursor: "pointer",
                          padding: "4px 8px",
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: TURNKEY AGENT PROMPTS */}
          {activeTab === "prompts" && (
            <div className="admin-card" style={{ padding: 24, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 16, margin: "0 0 4px", fontWeight: 600 }}>
                    Turnkey Agent Prompts
                  </h2>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--ink-soft)" }}>
                    Ready-to-paste prompts tailored for Claude Code, Cursor/Windsurf, and v0/Bolt
                  </p>
                </div>
              </div>

              {/* Sub-tabs */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginBottom: 16,
                  borderBottom: "1px solid var(--line)",
                  paddingBottom: 8,
                }}
              >
                {(
                  [
                    { key: "claudeCode", label: "Claude Code CLI" },
                    { key: "cursorWindsurf", label: "Cursor / Windsurf" },
                    { key: "v0Bolt", label: "v0 / Bolt Prompt" },
                  ] as const
                ).map((tab) => {
                  const isActive = activePromptTab === tab.key;
                  const promptLen = (agentPromptsData[tab.key] || "").length;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActivePromptTab(tab.key)}
                      style={{
                        border: "none",
                        background: isActive ? "var(--violet)" : "var(--surface)",
                        color: isActive ? "#fff" : "var(--ink)",
                        padding: "6px 14px",
                        borderRadius: "var(--r-chip)",
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        boxShadow: isActive ? "0 2px 8px rgba(124, 58, 237, 0.3)" : "none",
                      }}
                    >
                      {tab.label}
                      <span
                        style={{
                          fontSize: 10,
                          opacity: 0.8,
                          padding: "1px 5px",
                          borderRadius: 10,
                          background: isActive ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.06)",
                        }}
                      >
                        {promptLen} chars
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Prompt Editor Box */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <span className="mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                    {activePromptTab === "claudeCode" && "Optimized for Claude Code CLI terminal session"}
                    {activePromptTab === "cursorWindsurf" && "Optimized for Cursor / Windsurf system context"}
                    {activePromptTab === "v0Bolt" && "Optimized for v0.dev / Bolt.new prompt-to-app generator"}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyPrompt(agentPromptsData[activePromptTab] || "", activePromptTab)
                    }
                    className="admin-btn admin-btn-ghost"
                    style={{ fontSize: 11, padding: "3px 10px" }}
                  >
                    {promptCopied === activePromptTab ? "✓ Copied to clipboard!" : "Copy Prompt"}
                  </button>
                </div>

                <textarea
                  className="admin-input mono"
                  style={{
                    minHeight: 280,
                    fontSize: 12.5,
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    background: "var(--bg)",
                  }}
                  value={agentPromptsData[activePromptTab] || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateJsonField(
                      "agentPrompts",
                      (curr: typeof agentPromptsData) => ({
                        ...curr,
                        [activePromptTab]: val,
                      }),
                      { claudeCode: "", cursorWindsurf: "", v0Bolt: "" }
                    );
                  }}
                  placeholder={`Write or paste the turnkey ${activePromptTab} prompt here...`}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── RAW JSON MODE (WITH SYNTAX CHECK & FORMAT BUTTONS) ─────── */}
      {editorMode === "json" && (
        <div className="admin-card" style={{ padding: 24, marginBottom: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div>
              <h2 style={{ fontSize: 16, margin: "0 0 4px", fontWeight: 600 }}>
                Raw JSON Field Inspector
              </h2>
              <p style={{ margin: 0, fontSize: 12, color: "var(--ink-soft)" }}>
                Directly edit JSON fields. Malformed JSON blocks saving and flags live syntax errors.
              </p>
            </div>
            <button
              type="button"
              onClick={formatAllFields}
              className="admin-btn admin-btn-ghost"
              style={{ fontSize: 12, padding: "5px 12px" }}
            >
              Format All Valid JSON
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {JSON_FIELDS.map((field) => {
              const fieldError = jsonErrors[field];
              const isValid = !fieldError;

              return (
                <div
                  key={field}
                  style={{
                    padding: 14,
                    background: "var(--bg)",
                    borderRadius: "var(--r-md)",
                    border: isValid ? "1px solid var(--line)" : "1px solid var(--coral-deep)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <label className="admin-label mono" style={{ margin: 0, fontWeight: 700 }}>
                        {field}
                      </label>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: "var(--r-chip)",
                          background: isValid
                            ? "rgba(16, 185, 129, 0.12)"
                            : "rgba(255, 111, 94, 0.12)",
                          color: isValid ? "#047857" : "var(--coral-deep)",
                        }}
                      >
                        {isValid ? "Valid JSON ✓" : "Syntax Error ✕"}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={!isValid}
                      onClick={() => formatField(field)}
                      className="admin-btn admin-btn-ghost"
                      style={{ fontSize: 11, padding: "2px 8px" }}
                    >
                      Format JSON
                    </button>
                  </div>

                  {fieldError && (
                    <p style={{ color: "var(--coral-deep)", fontSize: 11, margin: "0 0 6px" }}>
                      {fieldError}
                    </p>
                  )}

                  <textarea
                    className="admin-input mono"
                    style={{
                      fontSize: 12,
                      minHeight: 140,
                      whiteSpace: "pre",
                      background: "var(--surface)",
                      borderColor: isValid ? "var(--line)" : "var(--coral-deep)",
                    }}
                    value={jsonFields[field]}
                    onChange={(e) =>
                      setJsonFields((prev) => ({ ...prev, [field]: e.target.value }))
                    }
                    spellCheck={false}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating / Bottom Save Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 20px",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-lg)",
          boxShadow: "var(--shadow)",
          position: "sticky",
          bottom: 20,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>
            {hasJsonErrors ? (
              <span style={{ color: "var(--coral-deep)", fontWeight: 600 }}>
                ⚠️ Cannot save with syntax errors
              </span>
            ) : (
              "All fields synchronized and valid"
            )}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link
            href="/admin"
            className="admin-btn admin-btn-ghost"
            style={{ textDecoration: "none" }}
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving || hasJsonErrors}
            className="admin-btn admin-btn-primary"
            style={{ padding: "8px 22px", fontSize: 13 }}
          >
            {saving ? "Saving Changes..." : "Save Drop"}
          </button>
        </div>
      </div>

      {/* ─── INLINE BROADCAST CONFIRMATION MODAL ────────────────────── */}
      <AnimatePresence>
        {showBroadcastModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 100,
              padding: 20,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{
                width: "100%",
                maxWidth: 520,
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-xl)",
                padding: 24,
                boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <h2 style={{ fontSize: 18, margin: 0, fontWeight: 700 }}>
                  📢 Broadcast to Active Subscribers
                </h2>
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "var(--ink-soft)",
                    cursor: "pointer",
                    fontSize: 16,
                  }}
                >
                  ✕
                </button>
              </div>

              <p style={{ fontSize: 13.5, color: "var(--ink)", margin: "0 0 16px", lineHeight: 1.5 }}>
                You are about to broadcast drop <strong>&quot;{title}&quot;</strong> to all active subscribers.
                Run a safe dry run check first to verify recipient audience size and preview the email template.
              </p>

              {/* Dry Run Telemetry Box */}
              {dryRunResult && (
                <div
                  style={{
                    padding: 14,
                    background: "rgba(124, 58, 237, 0.08)",
                    border: "1px solid rgba(124, 58, 237, 0.25)",
                    borderRadius: "var(--r-sm)",
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--violet-deep)" }}>
                      ✓ Dry Run Telemetry:
                    </span>
                    <span className="mono" style={{ fontSize: 12, color: "var(--ink)" }}>
                      <strong>{dryRunResult.recipientCount}</strong> active subscriber(s) targeted
                    </span>
                  </div>
                  {dryRunResult.preview && (
                    <div style={{ fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.4 }}>
                      <p style={{ margin: "0 0 4px" }}>
                        <strong>Subject:</strong> {dryRunResult.preview.subject}
                      </p>
                      <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                        <strong>Preview:</strong> {dryRunResult.preview.text?.slice(0, 160)}...
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <button
                  type="button"
                  disabled={dryRunning || broadcasting}
                  onClick={runBroadcastDryRun}
                  className="admin-btn admin-btn-ghost"
                  style={{ fontSize: 12.5, padding: "8px 14px" }}
                >
                  {dryRunning ? "Checking..." : "1. Run Dry Run Check"}
                </button>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setShowBroadcastModal(false)}
                    className="admin-btn admin-btn-ghost"
                    style={{ fontSize: 12.5 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={broadcasting}
                    onClick={executeBroadcastLive}
                    className="admin-btn admin-btn-primary"
                    style={{
                      fontSize: 12.5,
                      padding: "8px 16px",
                      background: "var(--violet)",
                    }}
                  >
                    {broadcasting ? "Broadcasting..." : "2. Confirm & Send Live"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </form>
  );
}
