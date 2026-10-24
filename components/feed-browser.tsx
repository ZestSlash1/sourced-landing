"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import TriangulationBadge from "@/app/feed/triangulation-badge";
import type { TriangulationStats } from "@/types/idea-drop";
import { MagicCard } from "@/components/magicui/magic-card";

export interface FeedCardData {
  id: string;
  slug: string;
  title: string;
  category: string;
  demandScore: number;
  problemSummary: string;
  tier: string;
  soloWeekendProject?: boolean;
  estimatedHours?: number;
  skillFloor?: string;
  signalCount?: number;
  kind: "full" | "signed-out" | "tier-locked" | "quota-locked";
  triangulationStats?: TriangulationStats;
}

const COVERS = ["cover-1", "cover-2", "cover-3", "cover-4", "cover-5", "cover-6"];

type SortOption = "demand" | "signals" | "title";
type TierFilter = "all" | "free" | "builder";

export default function FeedBrowser({ items }: { items: FeedCardData[] }) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [weekendOnly, setWeekendOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("demand");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global `/` keyboard shortcut to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toUpperCase() || "";
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(activeTag)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = items.filter((item) => {
      // Category filter
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }
      // Tier filter
      if (tierFilter === "free" && item.tier !== "free") {
        return false;
      }
      if (tierFilter === "builder" && item.tier === "free") {
        return false;
      }
      // Weekend filter
      if (weekendOnly && !item.soloWeekendProject) {
        return false;
      }
      // Search query
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.problemSummary.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });

    // Sorting
    return result.sort((a, b) => {
      if (sortBy === "signals") {
        const sigA = a.signalCount ?? a.triangulationStats?.signalCount ?? 0;
        const sigB = b.signalCount ?? b.triangulationStats?.signalCount ?? 0;
        return sigB - sigA;
      }
      if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      }
      // Default: demand score descending
      return b.demandScore - a.demandScore;
    });
  }, [items, search, selectedCategory, tierFilter, weekendOnly, sortBy]);

  const hasActiveFilters =
    search.trim() !== "" ||
    selectedCategory !== "all" ||
    tierFilter !== "all" ||
    weekendOnly ||
    sortBy !== "demand";

  const handleResetFilters = () => {
    setSearch("");
    setSelectedCategory("all");
    setTierFilter("all");
    setWeekendOnly(false);
    setSortBy("demand");
  };

  return (
    <div style={{ marginTop: 24 }}>
      {/* Obsidian Command & Filter Bar */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-lg)",
          padding: "20px 22px",
          boxShadow: "var(--shadow)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          marginBottom: 28,
        }}
      >
        {/* Row 1: Search, Sort Dropdown & Solo Weekend Toggle */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          {/* Search Box with Search Icon, Clear button and Keyboard shortcut pill */}
          <div
            style={{
              flex: "1 1 300px",
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}
          >
            <span
              style={{
                position: "absolute",
                left: 14,
                color: "var(--ink-soft)",
                pointerEvents: "none",
                display: "flex",
                alignItems: "center",
              }}
              aria-hidden="true"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search briefs by problem, title, stack, or target buyer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "11px 40px 11px 38px",
                borderRadius: "var(--r-md)",
                border: "1px solid var(--line)",
                background: "var(--bg)",
                fontSize: 13.5,
                fontFamily: "inherit",
                color: "var(--ink)",
                outline: "none",
                transition: "border-color 0.18s ease, box-shadow 0.18s ease",
              }}
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{
                  position: "absolute",
                  right: 12,
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "none",
                  borderRadius: "50%",
                  width: 22,
                  height: 22,
                  color: "var(--ink-soft)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  padding: 0,
                }}
                aria-label="Clear search"
              >
                ✕
              </button>
            ) : (
              <span
                style={{
                  position: "absolute",
                  right: 12,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "2px 6px",
                  borderRadius: 4,
                  border: "1px solid var(--line)",
                  background: "rgba(255, 255, 255, 0.04)",
                  fontSize: 11,
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  color: "var(--ink-soft)",
                  pointerEvents: "none",
                }}
                title="Press '/' to search"
              >
                /
              </span>
            )}
          </div>

          {/* Sort Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 500 }}>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              style={{
                background: "var(--bg)",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-md)",
                color: "var(--ink)",
                fontSize: 12.5,
                padding: "9px 12px",
                fontFamily: "inherit",
                cursor: "pointer",
                outline: "none",
              }}
              aria-label="Sort research briefs"
            >
              <option value="demand">Demand Score ↓</option>
              <option value="signals">Most Signals ↓</option>
              <option value="title">Title A–Z</option>
            </select>
          </div>

          {/* Tier Filter Pills */}
          <div
            style={{
              display: "inline-flex",
              background: "var(--bg)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-chip)",
              padding: 3,
              gap: 2,
            }}
          >
            {(
              [
                { id: "all", label: "All Tiers" },
                { id: "free", label: "Free" },
                { id: "builder", label: "Builder+" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTierFilter(t.id)}
                style={{
                  cursor: "pointer",
                  padding: "6px 12px",
                  borderRadius: "var(--r-chip)",
                  border: "none",
                  fontSize: 12,
                  fontFamily: "inherit",
                  fontWeight: tierFilter === t.id ? 600 : 400,
                  background: tierFilter === t.id ? "var(--surface-elevated)" : "transparent",
                  color: tierFilter === t.id ? "#fff" : "var(--ink-soft)",
                  boxShadow: tierFilter === t.id ? "0 1px 3px rgba(0,0,0,0.4)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Solo Weekend Toggle Pill */}
          <button
            type="button"
            onClick={() => setWeekendOnly((prev) => !prev)}
            style={{
              cursor: "pointer",
              background: weekendOnly ? "rgba(124, 58, 237, 0.2)" : "var(--bg)",
              color: weekendOnly ? "#C4B5FD" : "var(--ink-soft)",
              borderColor: weekendOnly ? "rgba(124, 58, 237, 0.6)" : "var(--line)",
              fontWeight: weekendOnly ? 600 : 500,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: "var(--r-chip)",
              border: "1px solid",
              fontSize: 12.5,
              transition: "all 0.15s ease",
            }}
          >
            <span>⚡ Solo Weekend Only</span>
          </button>
        </div>

        {/* Row 2: Category Pills */}
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            style={{
              cursor: "pointer",
              padding: "5px 12px",
              borderRadius: "var(--r-chip)",
              border: "1px solid",
              fontSize: 11.5,
              fontFamily: "inherit",
              background: selectedCategory === "all" ? "var(--ink)" : "var(--bg)",
              color: selectedCategory === "all" ? "#0A0C14" : "var(--ink-soft)",
              borderColor: selectedCategory === "all" ? "var(--ink)" : "var(--line)",
              fontWeight: selectedCategory === "all" ? 600 : 400,
              transition: "all 0.15s ease",
            }}
          >
            All Categories ({items.length})
          </button>
          {categories.map(([cat, count]) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              style={{
                cursor: "pointer",
                padding: "5px 12px",
                borderRadius: "var(--r-chip)",
                border: "1px solid",
                fontSize: 11.5,
                fontFamily: "inherit",
                background: selectedCategory === cat ? "rgba(124, 58, 237, 0.2)" : "var(--bg)",
                color: selectedCategory === cat ? "#DDD6FE" : "var(--ink-soft)",
                borderColor: selectedCategory === cat ? "var(--violet)" : "var(--line)",
                fontWeight: selectedCategory === cat ? 600 : 400,
                transition: "all 0.15s ease",
              }}
            >
              {cat} ({count})
            </button>
          ))}
        </div>

        {/* Row 3: Active Results Counter & Reset Action */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 12,
            borderTop: "1px solid var(--line)",
            fontSize: 12,
            color: "var(--ink-soft)",
          }}
        >
          <span>
            Showing <strong style={{ color: "var(--ink)" }}>{filtered.length}</strong> of{" "}
            <strong style={{ color: "var(--ink)" }}>{items.length}</strong> research briefs
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                background: "none",
                border: "none",
                color: "var(--violet-deep)",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                padding: 0,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              Reset all filters ✕
            </button>
          )}
        </div>
      </div>

      {/* Grid or Empty State */}
      {filtered.length === 0 ? (
        <div
          className="empty-state"
          style={{
            padding: "48px 24px",
            textAlign: "center",
            background: "var(--surface)",
            borderRadius: "var(--r-md)",
            border: "1px solid var(--line)",
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
          <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>
            No research briefs match your filters.
          </p>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--ink-soft)" }}>
            Try clearing the search query or loosening the tier and weekend filters.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="btn btn-primary"
            style={{ fontSize: 13, padding: "7px 18px" }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="feed-grid">
          {filtered.map((item, i) => {
            const badge =
              item.kind === "tier-locked" ? (
                <span
                  className="feed-badge"
                  style={{
                    background: "rgba(124, 58, 237, 0.18)",
                    color: "#C4B5FD",
                    border: "1px solid rgba(124, 58, 237, 0.35)",
                  }}
                >
                  🔒 {item.tier}+
                </span>
              ) : item.kind === "quota-locked" ? (
                <span
                  className="feed-badge"
                  style={{
                    background: "rgba(245, 158, 11, 0.14)",
                    color: "#FCD34D",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                  }}
                >
                  ⏳ Limit reached
                </span>
              ) : item.kind === "signed-out" ? (
                <span
                  className="feed-badge"
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    color: "#E2E8F0",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                  }}
                >
                  🔒 Sign in
                </span>
              ) : (
                <span
                  className="feed-badge"
                  style={{
                    background: "rgba(16, 185, 129, 0.14)",
                    color: "#34D399",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                  }}
                >
                  Free
                </span>
              );

            const href =
              item.kind === "tier-locked"
                ? "/#pricing"
                : item.kind === "quota-locked"
                  ? "/account"
                  : `/feed/${item.slug}`;

            return (
              <MagicCard key={item.id} className="feed-card" gradientColor="rgba(124, 58, 237, 0.2)">
                <Link href={href} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                  <div className={`feed-card-cover ${COVERS[i % COVERS.length]}`}>
                    <span className="tag">{item.category}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="score">{item.demandScore}% demand</span>
                      <div
                        style={{
                          width: 52,
                          height: 5,
                          background: "rgba(255, 255, 255, 0.2)",
                          borderRadius: 999,
                          overflow: "hidden",
                        }}
                        title={`Demand Score: ${item.demandScore}%`}
                      >
                        <div
                          style={{
                            width: `${Math.min(100, item.demandScore)}%`,
                            height: "100%",
                            background: "#fff",
                            borderRadius: 999,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="feed-card-body">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <h2 style={{ margin: "0 0 6px", fontSize: 16.5, lineHeight: 1.35 }}>{item.title}</h2>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        {item.soloWeekendProject && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                              fontSize: 10.5,
                              padding: "3px 8px",
                              borderRadius: "var(--r-chip)",
                              background: "rgba(139, 92, 246, 0.15)",
                              color: "#C4B5FD",
                              border: "1px solid rgba(139, 92, 246, 0.3)",
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                            }}
                          >
                            ⚡ Weekend
                          </span>
                        )}
                        {badge}
                      </div>
                    </div>
                    <p style={{ margin: "4px 0 10px", fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.55 }}>
                      {item.problemSummary}
                    </p>
                    {item.triangulationStats ? (
                      <div style={{ marginTop: 8 }}>
                        <TriangulationBadge stats={item.triangulationStats} />
                      </div>
                    ) : null}
                  </div>
                </Link>
              </MagicCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
