"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import type { IdeaDrop } from "@/types/idea-drop";

const STATUS_STYLE: Record<string, { fg: string; bg: string; border: string; label: string }> = {
  draft: {
    fg: "var(--ink-soft)",
    bg: "rgba(255, 255, 255, 0.04)",
    border: "rgba(255, 255, 255, 0.1)",
    label: "Draft",
  },
  needs_evidence: {
    fg: "var(--coral-deep)",
    bg: "rgba(255, 51, 102, 0.12)",
    border: "rgba(255, 51, 102, 0.28)",
    label: "Needs Evidence",
  },
  pending_review: {
    fg: "#F59E0B",
    bg: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.28)",
    label: "Pending Review",
  },
  published: {
    fg: "var(--violet-deep)",
    bg: "rgba(124, 58, 237, 0.12)",
    border: "rgba(124, 58, 237, 0.3)",
    label: "Published",
  },
};

const TIER_BADGE_STYLE: Record<string, { fg: string; bg: string }> = {
  free: { fg: "var(--ink-soft)", bg: "rgba(255, 255, 255, 0.05)" },
  builder: { fg: "var(--violet-deep)", bg: "rgba(124, 58, 237, 0.15)" },
  studio: { fg: "var(--lime)", bg: "rgba(16, 185, 129, 0.15)" },
};

const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.03 } },
};

const rowVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 280, damping: 28 } },
};

type FilterStatus = "all" | "published" | "pending_review" | "draft";
type TierFilter = "all" | "free" | "builder" | "studio";
type SortOption = "demand-desc" | "signals-desc" | "updated-desc" | "title-asc";

export default function IdeasList({ ideas }: { ideas: IdeaDrop[] }) {
  // Maintain local state synced from prop so inline quick actions update immediately!
  const [localIdeas, setLocalIdeas] = useState<IdeaDrop[]>(ideas);
  useEffect(() => {
    setLocalIdeas(ideas);
  }, [ideas]);

  // Filters & Search
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("demand-desc");
  const [search, setSearch] = useState("");

  // Loading & error states for inline mutations
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Derive unique categories from local state
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const item of localIdeas) {
      if (item.category && item.category.trim()) {
        set.add(item.category.trim());
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [localIdeas]);

  // Status counts
  const counts = useMemo(() => {
    return {
      all: localIdeas.length,
      published: localIdeas.filter((i) => i.status === "published").length,
      pending_review: localIdeas.filter((i) => i.status === "pending_review").length,
      draft: localIdeas.filter((i) => i.status === "draft" || i.status === "needs_evidence").length,
    };
  }, [localIdeas]);

  // Filter & Sort
  const filteredIdeas = useMemo(() => {
    let list = localIdeas.filter((idea) => {
      // Status filter
      if (filter === "published" && idea.status !== "published") return false;
      if (filter === "pending_review" && idea.status !== "pending_review") return false;
      if (filter === "draft" && idea.status !== "draft" && idea.status !== "needs_evidence") return false;

      // Tier filter
      if (tierFilter !== "all" && idea.tier !== tierFilter) return false;

      // Category filter
      if (categoryFilter !== "all" && idea.category !== categoryFilter) return false;

      // Featured-only toggle
      if (featuredOnly && !idea.featured) return false;

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = idea.title?.toLowerCase().includes(q);
        const matchCat = idea.category?.toLowerCase().includes(q);
        const matchSlug = idea.slug?.toLowerCase().includes(q);
        const matchId = idea.id?.toLowerCase().includes(q);
        const matchTag = idea.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchCat && !matchSlug && !matchId && !matchTag) return false;
      }

      return true;
    });

    // Sorting
    list = [...list].sort((a, b) => {
      if (sortBy === "demand-desc") {
        return (b.demandScore ?? 0) - (a.demandScore ?? 0);
      }
      if (sortBy === "signals-desc") {
        return (b.evidence?.length ?? 0) - (a.evidence?.length ?? 0);
      }
      if (sortBy === "updated-desc") {
        const dateA = Date.parse(a.updatedAt || a.publishedAt || "1970-01-01");
        const dateB = Date.parse(b.updatedAt || b.publishedAt || "1970-01-01");
        return dateB - dateA;
      }
      if (sortBy === "title-asc") {
        return (a.title || "").localeCompare(b.title || "");
      }
      return 0;
    });

    return list;
  }, [localIdeas, filter, tierFilter, categoryFilter, featuredOnly, sortBy, search]);

  const hasActiveFilters =
    filter !== "all" ||
    tierFilter !== "all" ||
    categoryFilter !== "all" ||
    featuredOnly ||
    Boolean(search.trim());

  function resetAllFilters() {
    setFilter("all");
    setTierFilter("all");
    setCategoryFilter("all");
    setFeaturedOnly(false);
    setSortBy("demand-desc");
    setSearch("");
  }

  // Quick Action: Toggle featured with optimistic update
  async function handleToggleFeatured(idea: IdeaDrop, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const nextFeatured = !idea.featured;
    setMutatingId(idea.id);
    setActionError(null);

    // Optimistic update
    setLocalIdeas((prev) =>
      prev.map((i) => (i.id === idea.id ? { ...i, featured: nextFeatured } : i))
    );

    try {
      const res = await fetch(`/api/admin/ideas/${encodeURIComponent(idea.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featured: nextFeatured }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        throw new Error(typeof data.error === "string" ? data.error : `HTTP ${res.status}`);
      }
      const saved = (await res.json()) as IdeaDrop;
      setLocalIdeas((prev) => prev.map((i) => (i.id === idea.id ? saved : i)));
    } catch (err) {
      // Revert on error
      setLocalIdeas((prev) =>
        prev.map((i) => (i.id === idea.id ? { ...i, featured: idea.featured } : i))
      );
      setActionError(err instanceof Error ? err.message : "Failed to toggle featured status");
    } finally {
      setMutatingId(null);
    }
  }

  // Quick Action: Toggle status (e.g. published <-> draft, or pending -> published)
  async function handleToggleStatus(idea: IdeaDrop, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const nextStatus: IdeaDrop["status"] = idea.status === "published" ? "draft" : "published";
    setMutatingId(idea.id);
    setActionError(null);

    // Optimistic update
    setLocalIdeas((prev) =>
      prev.map((i) => (i.id === idea.id ? { ...i, status: nextStatus } : i))
    );

    try {
      const res = await fetch(`/api/admin/ideas/${encodeURIComponent(idea.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        throw new Error(typeof data.error === "string" ? data.error : `HTTP ${res.status}`);
      }
      const saved = (await res.json()) as IdeaDrop;
      // Saved item may be "needs_evidence" if publication bar check failed
      setLocalIdeas((prev) => prev.map((i) => (i.id === idea.id ? saved : i)));
    } catch (err) {
      // Revert on error
      setLocalIdeas((prev) =>
        prev.map((i) => (i.id === idea.id ? { ...i, status: idea.status } : i))
      );
      setActionError(err instanceof Error ? err.message : "Failed to update idea status");
    } finally {
      setMutatingId(null);
    }
  }

  return (
    <div>
      {/* Error Banner */}
      {actionError && (
        <div
          className="admin-error-banner"
          style={{
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(255, 51, 102, 0.12)",
            border: "1px solid rgba(255, 51, 102, 0.3)",
            color: "var(--coral-deep)",
            borderRadius: "var(--r-md)",
            padding: "10px 14px",
            fontSize: 13,
          }}
        >
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            style={{
              background: "none",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              fontSize: 15,
              padding: "0 4px",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Multi-Facet Filter Toolbar */}
      <div
        className="admin-toolbar"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          marginBottom: 18,
        }}
      >
        {/* Row 1: Status Tabs + Search */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            width: "100%",
          }}
        >
          {/* Status Tabs */}
          <div
            className="admin-tabs-filter"
            style={{
              display: "flex",
              gap: 4,
              background: "rgba(22, 24, 36, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              padding: "3px",
              borderRadius: "var(--r-chip)",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.4)",
            }}
          >
            <button
              type="button"
              className={`admin-tab-btn ${filter === "all" ? "is-active" : ""}`}
              onClick={() => setFilter("all")}
              style={{
                fontSize: 12.5,
                padding: "6px 12px",
                borderRadius: "var(--r-chip)",
                background: filter === "all" ? "var(--violet)" : "transparent",
                color: filter === "all" ? "#fff" : "var(--ink-soft)",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                transition: "all 0.15s ease",
              }}
            >
              All ({counts.all})
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${filter === "published" ? "is-active" : ""}`}
              onClick={() => setFilter("published")}
              style={{
                fontSize: 12.5,
                padding: "6px 12px",
                borderRadius: "var(--r-chip)",
                background: filter === "published" ? "var(--violet)" : "transparent",
                color: filter === "published" ? "#fff" : "var(--ink-soft)",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                transition: "all 0.15s ease",
              }}
            >
              Published ({counts.published})
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${filter === "pending_review" ? "is-active" : ""}`}
              onClick={() => setFilter("pending_review")}
              style={{
                fontSize: 12.5,
                padding: "6px 12px",
                borderRadius: "var(--r-chip)",
                background: filter === "pending_review" ? "var(--violet)" : "transparent",
                color: filter === "pending_review" ? "#fff" : "var(--ink-soft)",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                transition: "all 0.15s ease",
              }}
            >
              Pending ({counts.pending_review})
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${filter === "draft" ? "is-active" : ""}`}
              onClick={() => setFilter("draft")}
              style={{
                fontSize: 12.5,
                padding: "6px 12px",
                borderRadius: "var(--r-chip)",
                background: filter === "draft" ? "var(--violet)" : "transparent",
                color: filter === "draft" ? "#fff" : "var(--ink-soft)",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                transition: "all 0.15s ease",
              }}
            >
              Drafts ({counts.draft})
            </button>
          </div>

          {/* Search Box */}
          <div className="admin-search-box" style={{ position: "relative", minWidth: 260, flex: 1, maxWidth: 380 }}>
            <svg
              className="admin-search-icon"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink-soft)" }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="admin-search-input"
              placeholder="Search by title, category, tag, ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 30px 8px 34px",
                borderRadius: "var(--r-chip)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                background: "rgba(22, 24, 36, 0.7)",
                color: "var(--ink)",
                fontSize: 12.5,
                fontFamily: "inherit",
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--ink-soft)",
                  padding: 2,
                  fontSize: 13,
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Multi-Facet Filters (Tier, Category, Featured toggle, Sort selector) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
            width: "100%",
            fontSize: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {/* Tier Filter */}
            <select
              aria-label="Filter by Tier"
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value as TierFilter)}
              style={{
                padding: "6px 10px",
                borderRadius: "var(--r-chip)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                background: "rgba(22, 24, 36, 0.7)",
                color: tierFilter !== "all" ? "var(--violet-deep)" : "var(--ink-soft)",
                fontSize: 12,
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value="all">All Tiers</option>
              <option value="free">Free Tier</option>
              <option value="builder">Builder Tier</option>
              <option value="studio">Studio Tier</option>
            </select>

            {/* Category Filter */}
            <select
              aria-label="Filter by Category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: "var(--r-chip)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                background: "rgba(22, 24, 36, 0.7)",
                color: categoryFilter !== "all" ? "var(--violet-deep)" : "var(--ink-soft)",
                fontSize: 12,
                cursor: "pointer",
                outline: "none",
                maxWidth: 170,
              }}
            >
              <option value="all">All Categories ({categories.length})</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Featured-Only Toggle */}
            <button
              type="button"
              onClick={() => setFeaturedOnly((v) => !v)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 12px",
                borderRadius: "var(--r-chip)",
                border: featuredOnly
                  ? "1px solid rgba(251, 191, 36, 0.4)"
                  : "1px solid rgba(255, 255, 255, 0.08)",
                background: featuredOnly ? "rgba(251, 191, 36, 0.12)" : "rgba(22, 24, 36, 0.7)",
                color: featuredOnly ? "#FBBF24" : "var(--ink-soft)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <span>{featuredOnly ? "★" : "☆"}</span>
              <span>Featured</span>
            </button>

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="admin-btn admin-btn-ghost"
                style={{
                  fontSize: 11.5,
                  padding: "5px 10px",
                  color: "var(--ink-soft)",
                  borderRadius: "var(--r-chip)",
                }}
              >
                Reset filters ✕
              </button>
            )}
          </div>

          {/* Right: Sort Selector & Readout */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>
              {filteredIdeas.length} of {localIdeas.length} drops
            </span>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                Sort:
              </span>
              <select
                aria-label="Sort ideas"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                style={{
                  padding: "6px 10px",
                  borderRadius: "var(--r-chip)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  background: "rgba(22, 24, 36, 0.7)",
                  color: "var(--ink)",
                  fontSize: 12,
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option value="demand-desc">Demand ↓</option>
                <option value="signals-desc">Signals ↓</option>
                <option value="updated-desc">Updated ↓</option>
                <option value="title-asc">Title A–Z</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Ideas Card / Multi-Facet Operations List */}
      <div
        className="admin-card"
        style={{
          overflow: "hidden",
          background: "linear-gradient(180deg, rgba(22, 24, 36, 0.85) 0%, rgba(16, 18, 26, 0.95) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "var(--r-xl)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
        }}
      >
        {filteredIdeas.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--ink-soft)" }}>
            <p style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 500, color: "var(--ink)" }}>
              No idea drops match the selected criteria.
            </p>
            <p className="mono" style={{ fontSize: 12, margin: "0 0 16px" }}>
              Try adjusting your search terms, tier, or status filters.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                className="admin-btn admin-btn-ghost"
                onClick={resetAllFilters}
                style={{ fontSize: 12 }}
              >
                Reset all filters
              </button>
            )}
          </div>
        ) : (
          <motion.div variants={listVariants} initial="hidden" animate="show">
            {filteredIdeas.map((idea) => {
              const statusStyle = STATUS_STYLE[idea.status] ?? STATUS_STYLE.draft;
              const tierBadge = TIER_BADGE_STYLE[idea.tier] ?? TIER_BADGE_STYLE.free;
              const signalsCount = idea.evidence?.length ?? 0;
              const demandPercent = Math.min(100, Math.max(0, idea.demandScore ?? 0));
              const isMutating = mutatingId === idea.id;

              return (
                <motion.div
                  key={idea.id}
                  variants={rowVariants}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                    padding: "14px 18px",
                    borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                    transition: "background 0.16s ease",
                    position: "relative",
                  }}
                  whileHover={{ backgroundColor: "rgba(124, 58, 237, 0.04)" }}
                >
                  {/* Left Column: Star toggle + Title + Metadata */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, minWidth: 0, flex: 1 }}>
                    {/* Star Button for Featured Toggle */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleFeatured(idea, e)}
                      disabled={isMutating}
                      title={idea.featured ? "Featured drop (click to unfeature)" : "Click to mark as featured"}
                      style={{
                        background: idea.featured ? "rgba(251, 191, 36, 0.12)" : "rgba(255, 255, 255, 0.03)",
                        border: idea.featured
                          ? "1px solid rgba(251, 191, 36, 0.35)"
                          : "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: "var(--r-sm)",
                        color: idea.featured ? "#FBBF24" : "var(--ink-soft)",
                        width: 28,
                        height: 28,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        cursor: "pointer",
                        flexShrink: 0,
                        marginTop: 1,
                        transition: "all 0.15s ease",
                      }}
                    >
                      {idea.featured ? "★" : "☆"}
                    </button>

                    {/* Idea Information & Link */}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 4,
                          flexWrap: "wrap",
                        }}
                      >
                        <Link
                          href={`/admin/ideas/${idea.id}`}
                          style={{
                            fontWeight: 600,
                            fontSize: 14.5,
                            color: "var(--ink)",
                            textDecoration: "none",
                            lineHeight: 1.3,
                            display: "inline-block",
                          }}
                          className="admin-list-title"
                        >
                          {idea.title}
                        </Link>

                        {idea.featured && (
                          <span
                            className="mono"
                            style={{
                              fontSize: 9.5,
                              fontWeight: 700,
                              background: "rgba(251, 191, 36, 0.15)",
                              color: "#FBBF24",
                              border: "1px solid rgba(251, 191, 36, 0.3)",
                              padding: "1px 6px",
                              borderRadius: "var(--r-chip)",
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            Featured
                          </span>
                        )}

                        <span
                          className="mono"
                          style={{
                            fontSize: 9.5,
                            fontWeight: 700,
                            background: tierBadge.bg,
                            color: tierBadge.fg,
                            border: `1px solid ${tierBadge.fg}33`,
                            padding: "1px 6px",
                            borderRadius: "var(--r-chip)",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                          }}
                        >
                          {idea.tier}
                        </span>
                      </div>

                      {/* Metadata Row */}
                      <div
                        className="admin-list-meta"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                          fontSize: 12,
                          color: "var(--ink-soft)",
                        }}
                      >
                        <span>{idea.category}</span>
                        <span>·</span>
                        <span style={{ display: "inline-flex", alignItems: "center" }}>
                          Demand {idea.demandScore ?? 0}
                          <span
                            className="admin-demand-bar"
                            style={{
                              width: 52,
                              height: 5,
                              background: "rgba(255, 255, 255, 0.08)",
                              borderRadius: 100,
                              overflow: "hidden",
                              display: "inline-block",
                              marginLeft: 6,
                            }}
                          >
                            <span
                              className="admin-demand-fill"
                              style={{
                                display: "block",
                                height: "100%",
                                width: `${demandPercent}%`,
                                background: "linear-gradient(90deg, var(--violet), #A78BFA)",
                              }}
                            />
                          </span>
                        </span>
                        <span>·</span>
                        <span>{signalsCount} signals</span>
                        {idea.updatedAt && (
                          <>
                            <span>·</span>
                            <span className="mono" style={{ fontSize: 10.5 }}>
                              updated {new Date(idea.updatedAt).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Inline Quick Actions + Status Badge + Edit */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexShrink: 0,
                      flexWrap: "wrap",
                      justifyContent: "flex-end",
                    }}
                  >
                    {/* Direct link to public view on live feed when published */}
                    {idea.status === "published" && (
                      <a
                        href={`/feed/${idea.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        title="View live drop on feed"
                        className="admin-btn-ghost"
                        style={{
                          fontSize: 11.5,
                          fontFamily: "var(--font-jetbrains-mono), monospace",
                          padding: "4px 9px",
                          borderRadius: "var(--r-chip)",
                          textDecoration: "none",
                          color: "var(--violet-deep)",
                          borderColor: "rgba(124, 58, 237, 0.3)",
                          background: "rgba(124, 58, 237, 0.08)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        Feed ↗
                      </a>
                    )}

                    {/* Quick Publish / Unpublish Toggle Button */}
                    <button
                      type="button"
                      disabled={isMutating}
                      onClick={(e) => handleToggleStatus(idea, e)}
                      title={
                        idea.status === "published"
                          ? "Unpublish to draft"
                          : idea.status === "pending_review"
                          ? "Approve and publish live"
                          : "Publish drop live"
                      }
                      style={{
                        fontSize: 11.5,
                        padding: "4px 10px",
                        borderRadius: "var(--r-chip)",
                        border:
                          idea.status === "published"
                            ? "1px solid rgba(255, 255, 255, 0.12)"
                            : idea.status === "pending_review"
                            ? "1px solid rgba(245, 158, 11, 0.4)"
                            : "1px solid rgba(124, 58, 237, 0.4)",
                        background:
                          idea.status === "published"
                            ? "transparent"
                            : idea.status === "pending_review"
                            ? "rgba(245, 158, 11, 0.15)"
                            : "rgba(124, 58, 237, 0.18)",
                        color:
                          idea.status === "published"
                            ? "var(--ink-soft)"
                            : idea.status === "pending_review"
                            ? "#F59E0B"
                            : "var(--violet-deep)",
                        cursor: isMutating ? "default" : "pointer",
                        fontWeight: 600,
                        transition: "all 0.15s ease",
                      }}
                    >
                      {isMutating
                        ? "…"
                        : idea.status === "published"
                        ? "Unpublish"
                        : idea.status === "pending_review"
                        ? "Approve"
                        : "Publish"}
                    </button>

                    {/* Current Status Badge */}
                    <span
                      className="admin-status-chip mono"
                      style={{
                        color: statusStyle.fg,
                        background: statusStyle.bg,
                        border: `1px solid ${statusStyle.border}`,
                        fontSize: 11,
                        padding: "3px 9px",
                      }}
                    >
                      {statusStyle.label}
                    </span>

                    {/* Edit Page Link */}
                    <Link
                      href={`/admin/ideas/${idea.id}`}
                      className="admin-btn-edit"
                      style={{
                        fontSize: 12,
                        padding: "4px 10px",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "var(--r-chip)",
                        background: "rgba(255, 255, 255, 0.03)",
                        color: "var(--ink)",
                        textDecoration: "none",
                        fontWeight: 600,
                        transition: "all 0.15s ease",
                      }}
                    >
                      Edit →
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
