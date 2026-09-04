"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import type { IdeaDrop } from "@/types/idea-drop";

const STATUS_STYLE: Record<string, { fg: string; bg: string; label: string }> = {
  draft: { fg: "var(--ink-soft)", bg: "var(--bg)", label: "Draft" },
  needs_evidence: { fg: "#C4432F", bg: "rgba(255,111,94,0.14)", label: "Needs Evidence" },
  pending_review: { fg: "#8A5A00", bg: "rgba(255,184,77,0.18)", label: "Pending Review" },
  published: { fg: "var(--violet-deep)", bg: "rgba(91,79,247,0.12)", label: "Published" },
};

const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const rowVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 28 } },
};

type FilterStatus = "all" | "published" | "pending_review" | "draft";

export default function IdeasList({ ideas }: { ideas: IdeaDrop[] }) {
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");

  const filteredIdeas = useMemo(() => {
    return ideas.filter((idea) => {
      // Status filter
      if (filter === "published" && idea.status !== "published") return false;
      if (filter === "pending_review" && idea.status !== "pending_review") return false;
      if (filter === "draft" && idea.status !== "draft" && idea.status !== "needs_evidence") return false;

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = idea.title.toLowerCase().includes(q);
        const matchCat = idea.category.toLowerCase().includes(q);
        const matchTag = idea.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchCat && !matchTag) return false;
      }

      return true;
    });
  }, [ideas, filter, search]);

  const counts = useMemo(() => {
    return {
      all: ideas.length,
      published: ideas.filter((i) => i.status === "published").length,
      pending_review: ideas.filter((i) => i.status === "pending_review").length,
      draft: ideas.filter((i) => i.status === "draft" || i.status === "needs_evidence").length,
    };
  }, [ideas]);

  return (
    <div>
      {/* Search & Filter Toolbar */}
      <div className="admin-toolbar">
        <div className="admin-tabs-filter">
          <button
            type="button"
            className={`admin-tab-btn ${filter === "all" ? "is-active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All ({counts.all})
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${filter === "published" ? "is-active" : ""}`}
            onClick={() => setFilter("published")}
          >
            Published ({counts.published})
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${filter === "pending_review" ? "is-active" : ""}`}
            onClick={() => setFilter("pending_review")}
          >
            Pending ({counts.pending_review})
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${filter === "draft" ? "is-active" : ""}`}
            onClick={() => setFilter("draft")}
          >
            Drafts ({counts.draft})
          </button>
        </div>

        <div className="admin-search-box">
          <svg
            className="admin-search-icon"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search by title, category, tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
                fontSize: 14,
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Ideas Card / List */}
      <div className="admin-card" style={{ overflow: "hidden" }}>
        {filteredIdeas.length === 0 ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--ink-soft)" }}>
            <p style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 500 }}>No idea drops match your criteria.</p>
            {(search || filter !== "all") && (
              <button
                type="button"
                className="admin-btn admin-btn-ghost"
                style={{ marginTop: 8 }}
                onClick={() => {
                  setFilter("all");
                  setSearch("");
                }}
              >
                Reset filters
              </button>
            )}
          </div>
        ) : (
          <motion.div variants={listVariants} initial="hidden" animate="show">
            {filteredIdeas.map((idea) => {
              const status = STATUS_STYLE[idea.status] ?? STATUS_STYLE.draft;
              const signalsCount = idea.evidence?.length ?? 0;
              const demandPercent = Math.min(100, Math.max(0, idea.demandScore));

              return (
                <motion.div key={idea.id} variants={rowVariants} whileHover={{ x: 3 }}>
                  <Link
                    href={`/admin/ideas/${idea.id}`}
                    className="admin-list-row"
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <div style={{ minWidth: 0, flex: 1, paddingRight: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                        <span className="admin-list-title" style={{ margin: 0 }}>
                          {idea.title}
                        </span>
                        {idea.featured && (
                          <span
                            style={{
                              fontSize: 10.5,
                              fontFamily: "'JetBrains Mono'",
                              fontWeight: 700,
                              background: "rgba(198,255,61,0.3)",
                              color: "#3F6B00",
                              padding: "2px 6px",
                              borderRadius: "var(--r-chip)",
                              textTransform: "uppercase",
                            }}
                          >
                            Featured
                          </span>
                        )}
                      </div>
                      <div className="admin-list-meta" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span>{idea.category}</span>
                        <span>·</span>
                        <span style={{ textTransform: "capitalize" }}>{idea.tier} Tier</span>
                        <span>·</span>
                        <span style={{ display: "inline-flex", alignItems: "center" }}>
                          Demand {idea.demandScore}
                          <span className="admin-demand-bar">
                            <span className="admin-demand-fill" style={{ width: `${demandPercent}%` }} />
                          </span>
                        </span>
                        <span>·</span>
                        <span>{signalsCount} signals</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                      <span className="admin-status-chip" style={{ color: status.fg, background: status.bg }}>
                        {status.label}
                      </span>
                      <span style={{ color: "var(--ink-soft)", fontSize: 13, fontWeight: 600 }}>
                        Edit →
                      </span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
