"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import type { IdeaDrop } from "@/types/idea-drop";
import CompetitiveLandscapePanel from "./competitive-landscape-panel";
import ReviewActions from "./review-actions";

const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.99 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 240, damping: 28 } },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.2 } },
};

type FilterCategory = "all" | "crossPlatform" | "singleSource" | "competitor";
type SortOption = "demandDesc" | "demandAsc" | "evidenceDesc" | "titleAsc";

export default function PendingList({ ideas: initialIdeas }: { ideas: IdeaDrop[] }) {
  // Local mutable state for fast optimistic triage
  const [ideas, setIdeas] = useState<IdeaDrop[]>(initialIdeas);
  const [filter, setFilter] = useState<FilterCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("demandDesc");

  // Expanded brief inspection state (set of idea IDs)
  const [expandedBriefs, setExpandedBriefs] = useState<Record<string, boolean>>({});

  // Quick edit state per idea
  const [quickEditingId, setQuickEditingId] = useState<string | null>(null);
  const [quickEditData, setQuickEditData] = useState<{
    title: string;
    category: string;
    tier: IdeaDrop["tier"];
    demandScore: number;
    problemSummary: string;
  } | null>(null);
  const [quickEditSaving, setQuickEditSaving] = useState(false);
  const [quickEditError, setQuickEditError] = useState<string | null>(null);

  // Toggle expanded details
  const toggleBriefExpand = (id: string) => {
    setExpandedBriefs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Start inline quick edit
  const startQuickEdit = (idea: IdeaDrop) => {
    setQuickEditingId(idea.id);
    setQuickEditData({
      title: idea.title,
      category: idea.category,
      tier: idea.tier,
      demandScore: idea.demandScore,
      problemSummary: idea.problem?.summary || "",
    });
    setQuickEditError(null);
  };

  const cancelQuickEdit = () => {
    setQuickEditingId(null);
    setQuickEditData(null);
    setQuickEditError(null);
  };

  // Save inline quick edit
  async function saveQuickEdit(ideaId: string) {
    if (!quickEditData) return;
    setQuickEditSaving(true);
    setQuickEditError(null);

    const idea = ideas.find((i) => i.id === ideaId);
    if (!idea) return;

    try {
      const patch = {
        title: quickEditData.title,
        category: quickEditData.category,
        tier: quickEditData.tier,
        demandScore: Number(quickEditData.demandScore),
        problem: {
          ...idea.problem,
          summary: quickEditData.problemSummary,
        },
      };

      const res = await fetch(`/api/admin/ideas/${ideaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Save failed (${res.status})`);
      }

      // Optimistically update idea in local state
      setIdeas((prev) =>
        prev.map((i) =>
          i.id === ideaId
            ? {
                ...i,
                title: quickEditData.title,
                category: quickEditData.category,
                tier: quickEditData.tier,
                demandScore: quickEditData.demandScore,
                problem: {
                  ...i.problem,
                  summary: quickEditData.problemSummary,
                },
              }
            : i
        )
      );

      setQuickEditingId(null);
      setQuickEditData(null);
    } catch (err: unknown) {
      setQuickEditError(err instanceof Error ? err.message : "Failed to save quick edit");
    } finally {
      setQuickEditSaving(false);
    }
  }

  // Handle status change from ReviewActions (remove from pending queue optimistically)
  const handleStatusChange = (ideaId: string) => {
    // Smoothly remove item from active list after short grace
    setTimeout(() => {
      setIdeas((prev) => prev.filter((i) => i.id !== ideaId));
    }, 1200);
  };

  // Counts for filter pills
  const counts = useMemo(() => {
    let crossPlatform = 0;
    let singleSource = 0;
    let competitor = 0;

    for (const idea of ideas) {
      const pCount = idea.platformCount ?? new Set(idea.evidence.map((e) => e.platform)).size;
      if (pCount >= 2) crossPlatform++;
      else singleSource++;
      if (idea.competitiveLandscape?.verdict === "close_competitor_exists") competitor++;
    }

    return { all: ideas.length, crossPlatform, singleSource, competitor };
  }, [ideas]);

  // Filtered and sorted ideas
  const filteredIdeas = useMemo(() => {
    return ideas
      .filter((idea) => {
        const platformCount = idea.platformCount ?? new Set(idea.evidence.map((e) => e.platform)).size;
        const isCross = platformCount >= 2;
        const isCompetitor = idea.competitiveLandscape?.verdict === "close_competitor_exists";

        if (filter === "crossPlatform" && !isCross) return false;
        if (filter === "singleSource" && isCross) return false;
        if (filter === "competitor" && !isCompetitor) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = idea.title.toLowerCase().includes(q);
          const matchCategory = idea.category.toLowerCase().includes(q);
          const matchSummary = idea.problem?.summary?.toLowerCase().includes(q);
          const matchTags = idea.tags?.some((t) => t.toLowerCase().includes(q));
          const matchEvidence = idea.evidence?.some(
            (e) => e.quote.toLowerCase().includes(q) || e.platform.toLowerCase().includes(q)
          );
          if (!matchTitle && !matchCategory && !matchSummary && !matchTags && !matchEvidence) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "demandDesc") return (b.demandScore || 0) - (a.demandScore || 0);
        if (sortBy === "demandAsc") return (a.demandScore || 0) - (b.demandScore || 0);
        if (sortBy === "evidenceDesc") return (b.evidence?.length || 0) - (a.evidence?.length || 0);
        if (sortBy === "titleAsc") return a.title.localeCompare(b.title);
        return 0;
      });
  }, [ideas, filter, searchQuery, sortBy]);

  return (
    <div>
      {/* Search & Filter Toolbar */}
      <div
        className="admin-card"
        style={{
          padding: "16px 20px",
          marginBottom: 20,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
          {/* Filter Pills */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(
              [
                { id: "all", label: `All (${counts.all})` },
                { id: "crossPlatform", label: `Cross-Platform (${counts.crossPlatform})` },
                { id: "singleSource", label: `Single-Source (${counts.singleSource})` },
                { id: "competitor", label: `Competitor Flagged (${counts.competitor})` },
              ] as const
            ).map((tab) => {
              const isActive = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  style={{
                    border: "none",
                    background: isActive ? "var(--ink)" : "var(--surface)",
                    color: isActive ? "#fff" : "var(--ink-soft)",
                    padding: "6px 13px",
                    borderRadius: "var(--r-chip)",
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    boxShadow: isActive ? "0 2px 6px rgba(0,0,0,0.15)" : "none",
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: isActive ? "var(--ink)" : "var(--line)",
                    transition: "all 0.15s ease",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Sort Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Sort:</span>
            <select
              className="admin-input"
              style={{ width: "auto", fontSize: 12.5, padding: "5px 10px" }}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
            >
              <option value="demandDesc">Demand (High → Low)</option>
              <option value="demandAsc">Demand (Low → High)</option>
              <option value="evidenceDesc">Most Evidence Signals</option>
              <option value="titleAsc">Title (A → Z)</option>
            </select>
          </div>
        </div>

        {/* Live Search Input */}
        <div style={{ position: "relative" }}>
          <input
            className="admin-input"
            style={{ paddingLeft: 34, fontSize: 13 }}
            placeholder="Search pending candidates by title, category, problem thesis, tags, or complaint quotes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--ink-soft)",
              fontSize: 13,
              pointerEvents: "none",
            }}
          >
            🔍
          </span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: "var(--ink-soft)",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Empty Filter State */}
      {filteredIdeas.length === 0 && (
        <div className="admin-card" style={{ padding: "40px 20px", textAlign: "center" }}>
          <p style={{ margin: "0 0 10px", fontSize: 14, color: "var(--ink-soft)" }}>
            No pending idea drops match your current filter criteria.
          </p>
          <button
            type="button"
            onClick={() => {
              setFilter("all");
              setSearchQuery("");
            }}
            className="admin-btn admin-btn-ghost"
            style={{ fontSize: 12.5 }}
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Pending Idea Cards */}
      <motion.div variants={listVariants} initial="hidden" animate="show">
        <AnimatePresence>
          {filteredIdeas.map((idea) => {
            const platformCount = idea.platformCount ?? new Set(idea.evidence.map((e) => e.platform)).size;
            const crossPlatform = idea.crossPlatform ?? platformCount >= 2;
            const isExpanded = Boolean(expandedBriefs[idea.id]);
            const isQuickEditing = quickEditingId === idea.id;
            const hasCompetitor = idea.competitiveLandscape?.verdict === "close_competitor_exists";

            return (
              <motion.div
                key={idea.id}
                variants={cardVariants}
                exit="exit"
                layout
                className="admin-card"
                style={{
                  padding: 24,
                  marginBottom: 18,
                  borderLeft: crossPlatform
                    ? "3px solid var(--violet)"
                    : "1px solid var(--line)",
                }}
              >
                {/* Card Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 16,
                    flexWrap: "wrap",
                    marginBottom: 12,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                      <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{idea.title}</h2>
                      <span
                        className="mono"
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "var(--r-chip)",
                          background: crossPlatform ? "rgba(124, 58, 237, 0.12)" : "rgba(0,0,0,0.06)",
                          color: crossPlatform ? "var(--violet-deep)" : "var(--ink-soft)",
                        }}
                      >
                        {crossPlatform ? `⚡ ${platformCount}+ Platforms` : "1 Platform"}
                      </span>
                      {hasCompetitor && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: "var(--r-chip)",
                            background: "rgba(239, 68, 68, 0.12)",
                            color: "var(--coral-deep)",
                          }}
                        >
                          ⚠️ Close Competitor
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 12.5,
                        color: "var(--ink-soft)",
                        flexWrap: "wrap",
                      }}
                    >
                      <span>
                        <strong>{idea.category}</strong>
                      </span>
                      <span>·</span>
                      <span>
                        Demand: <strong style={{ color: "var(--ink)" }}>{idea.demandScore}/100</strong>
                        <span
                          className="admin-demand-bar"
                          style={{ width: 45, height: 5, verticalAlign: "middle", marginLeft: 4 }}
                        >
                          <span
                            className="admin-demand-fill"
                            style={{ width: `${Math.min(100, Math.max(0, idea.demandScore))}%` }}
                          />
                        </span>
                      </span>
                      <span>·</span>
                      <span
                        style={{
                          textTransform: "uppercase",
                          fontSize: 10.5,
                          fontWeight: 700,
                          padding: "1px 6px",
                          borderRadius: "var(--r-chip)",
                          background: "rgba(0,0,0,0.06)",
                        }}
                      >
                        {idea.tier}
                      </span>
                      {idea.tags && idea.tags.length > 0 && (
                        <>
                          <span>·</span>
                          <span>tags: {idea.tags.join(", ")}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Top Action Buttons: Quick Edit & Full Studio Link */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => (isQuickEditing ? cancelQuickEdit() : startQuickEdit(idea))}
                      className="admin-btn admin-btn-ghost"
                      style={{ fontSize: 12, padding: "5px 12px" }}
                    >
                      {isQuickEditing ? "Cancel Edit" : "Quick Edit"}
                    </button>
                    <Link
                      href={`/admin/ideas/${idea.id}`}
                      className="admin-btn-edit"
                      style={{ fontSize: 12, padding: "5px 12px" }}
                    >
                      Drop Studio ↗
                    </Link>
                  </div>
                </div>

                {/* ─── INLINE QUICK-EDIT FORM ─────────────────────────────────── */}
                <AnimatePresence>
                  {isQuickEditing && quickEditData && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{
                        padding: 16,
                        marginBottom: 16,
                        background: "var(--bg)",
                        borderRadius: "var(--r-md)",
                        border: "1px solid var(--violet)",
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "var(--violet-deep)" }}>
                        ✏️ Inline Quick Edit
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
                        <div>
                          <label className="admin-label">Title</label>
                          <input
                            className="admin-input"
                            value={quickEditData.title}
                            onChange={(e) =>
                              setQuickEditData((prev) => (prev ? { ...prev, title: e.target.value } : null))
                            }
                          />
                        </div>
                        <div>
                          <label className="admin-label">Category</label>
                          <input
                            className="admin-input"
                            value={quickEditData.category}
                            onChange={(e) =>
                              setQuickEditData((prev) => (prev ? { ...prev, category: e.target.value } : null))
                            }
                          />
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
                        <div>
                          <label className="admin-label">Tier</label>
                          <select
                            className="admin-input"
                            value={quickEditData.tier}
                            onChange={(e) =>
                              setQuickEditData((prev) =>
                                prev ? { ...prev, tier: e.target.value as IdeaDrop["tier"] } : null
                              )
                            }
                          >
                            <option value="free">free</option>
                            <option value="builder">builder</option>
                            <option value="studio">studio</option>
                          </select>
                        </div>
                        <div>
                          <label className="admin-label">Demand Score (0–100)</label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            className="admin-input"
                            value={quickEditData.demandScore}
                            onChange={(e) =>
                              setQuickEditData((prev) =>
                                prev ? { ...prev, demandScore: Number(e.target.value) } : null
                              )
                            }
                          />
                        </div>
                      </div>

                      <div style={{ marginBottom: 12 }}>
                        <label className="admin-label">Problem Summary</label>
                        <textarea
                          className="admin-input"
                          style={{ minHeight: 60, fontSize: 12.5 }}
                          value={quickEditData.problemSummary}
                          onChange={(e) =>
                            setQuickEditData((prev) =>
                              prev ? { ...prev, problemSummary: e.target.value } : null
                            )
                          }
                        />
                      </div>

                      {quickEditError && (
                        <p style={{ color: "var(--coral-deep)", fontSize: 12, margin: "0 0 10px" }}>
                          {quickEditError}
                        </p>
                      )}

                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          disabled={quickEditSaving}
                          onClick={() => saveQuickEdit(idea.id)}
                          className="admin-btn admin-btn-primary"
                          style={{ fontSize: 12, padding: "6px 16px" }}
                        >
                          {quickEditSaving ? "Saving..." : "Save Quick Edit"}
                        </button>
                        <button
                          type="button"
                          disabled={quickEditSaving}
                          onClick={cancelQuickEdit}
                          className="admin-btn admin-btn-ghost"
                          style={{ fontSize: 12 }}
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Problem Summary Thesis */}
                {!isQuickEditing && (
                  <p style={{ fontSize: 14, margin: "0 0 14px", lineHeight: 1.5, color: "var(--ink)" }}>
                    {idea.problem?.summary || "No problem summary recorded."}
                  </p>
                )}

                {/* Evidence Quotes Preview & Toggle */}
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)" }}>
                      Originating Complaints ({idea.evidence?.length || 0} signals across {platformCount} platforms):
                    </span>

                    <button
                      type="button"
                      onClick={() => toggleBriefExpand(idea.id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--violet-deep)",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {isExpanded ? "Collapse brief preview ▴" : "Expand full quotes & brief preview ▾"}
                    </button>
                  </div>

                  {/* Evidence List */}
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.5 }}>
                    {(idea.evidence || []).map((e, idx) => (
                      <li key={`${e.url}-${idx}`} style={{ marginBottom: 6 }}>
                        <a
                          href={e.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontWeight: 600, color: "var(--violet-deep)", textDecoration: "underline" }}
                        >
                          {e.platform}
                          {e.subforum ? `/${e.subforum}` : ""}
                        </a>
                        {" — "}
                        {isExpanded ? e.quote : `${e.quote.slice(0, 140)}${e.quote.length > 140 ? "..." : ""}`}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* ─── EXPANDED BUILD BRIEF INSPECTION CONSOLE ─────────────────── */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{
                        padding: 16,
                        marginBottom: 16,
                        background: "var(--bg)",
                        borderRadius: "var(--r-md)",
                        border: "1px solid var(--line)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          color: "var(--ink-soft)",
                          marginBottom: 12,
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        Deep-Dive Specification &amp; Build Brief Preview
                      </div>

                      {/* Who Feels It & Why Now */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                        <div>
                          <strong style={{ fontSize: 12, color: "var(--ink-soft)" }}>Target User:</strong>
                          <p style={{ margin: "3px 0 0", fontSize: 13 }}>
                            {idea.problem?.whoFeelsIt || "Not specified"}
                          </p>
                        </div>
                        <div>
                          <strong style={{ fontSize: 12, color: "var(--ink-soft)" }}>Why Now Catalyst:</strong>
                          <p style={{ margin: "3px 0 0", fontSize: 13 }}>{idea.whyNow || "Not specified"}</p>
                        </div>
                      </div>

                      {/* Core Loop steps */}
                      {idea.buildBrief?.coreLoop && idea.buildBrief.coreLoop.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          <strong style={{ fontSize: 12, color: "var(--ink-soft)" }}>Core Loop Steps:</strong>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                            {idea.buildBrief.coreLoop.map((step, sIdx) => (
                              <div key={sIdx} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                                <span
                                  className="mono"
                                  style={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: "50%",
                                    background: "var(--violet)",
                                    color: "#fff",
                                    fontSize: 10,
                                    fontWeight: 700,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                  }}
                                >
                                  {sIdx + 1}
                                </span>
                                <span>{step}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* MVP Scope & Explicitly Cut */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 12 }}>
                        <div>
                          <strong style={{ fontSize: 12, color: "#047857" }}>✓ MVP Scope:</strong>
                          <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 12 }}>
                            {(idea.buildBrief?.mvpScope || []).map((item, mIdx) => (
                              <li key={mIdx}>{item}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <strong style={{ fontSize: 12, color: "var(--coral-deep)" }}>✕ Explicitly Cut:</strong>
                          <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 12 }}>
                            {(idea.buildBrief?.explicitlyCut || []).map((item, cIdx) => (
                              <li key={cIdx}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Matched APIs */}
                      {idea.matchedApis && idea.matchedApis.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <strong style={{ fontSize: 12, color: "var(--ink-soft)" }}>Matched APIs:</strong>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                            {idea.matchedApis.map((api, aIdx) => (
                              <span
                                key={aIdx}
                                className="mono"
                                style={{
                                  fontSize: 11,
                                  padding: "3px 8px",
                                  borderRadius: "var(--r-chip)",
                                  background: "rgba(124, 58, 237, 0.08)",
                                  color: "var(--violet-deep)",
                                  border: "1px solid rgba(124, 58, 237, 0.2)",
                                }}
                              >
                                {api.name} ({api.freeTierLimit})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Competitive Landscape Check */}
                <CompetitiveLandscapePanel ideaId={idea.id} landscape={idea.competitiveLandscape} />

                {/* Review & Triage Actions */}
                <ReviewActions
                  ideaId={idea.id}
                  hasCloseCompetitor={hasCompetitor}
                  onStatusChange={() => handleStatusChange(idea.id)}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
