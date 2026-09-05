"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import TriangulationBadge from "@/app/feed/triangulation-badge";
import type { TriangulationStats } from "@/types/idea-drop";

export interface FeedCardData {
  id: string;
  slug: string;
  title: string;
  category: string;
  demandScore: number;
  problemSummary: string;
  tier: string;
  soloWeekendProject?: boolean;
  kind: "full" | "signed-out" | "tier-locked" | "quota-locked";
  triangulationStats?: TriangulationStats;
}

const COVERS = ["cover-1", "cover-2", "cover-3", "cover-4", "cover-5", "cover-6"];

export default function FeedBrowser({ items }: { items: FeedCardData[] }) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [weekendOnly, setWeekendOnly] = useState(false);

  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }
      if (weekendOnly && !item.soloWeekendProject) {
        return false;
      }
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.problemSummary.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [items, search, selectedCategory, weekendOnly]);

  return (
    <div>
      {/* Search & Filter Controls */}
      <div
        style={{
          margin: "24px 0 32px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div
            style={{
              flex: "1 1 280px",
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}
          >
            <input
              type="text"
              placeholder="Search drops by problem, title, or stack…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 16px",
                paddingRight: search ? "36px" : "16px",
                borderRadius: "var(--r-sm)",
                border: "1px solid var(--line)",
                background: "var(--surface)",
                fontSize: 14,
                fontFamily: "inherit",
                color: "var(--ink)",
                outline: "none",
                boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
              }}
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{
                  position: "absolute",
                  right: 10,
                  background: "none",
                  border: "none",
                  color: "var(--ink-soft)",
                  cursor: "pointer",
                  fontSize: 16,
                  padding: 4,
                }}
                aria-label="Clear search"
              >
                ✕
              </button>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setWeekendOnly((prev) => !prev)}
            className="facet-chip"
            style={{
              cursor: "pointer",
              background: weekendOnly ? "var(--violet)" : "var(--surface)",
              color: weekendOnly ? "#fff" : "var(--ink)",
              borderColor: weekendOnly ? "var(--violet)" : "var(--line)",
              fontWeight: weekendOnly ? 600 : 400,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: "var(--r-chip)",
              border: "1px solid",
              fontSize: 13,
            }}
          >
            <span>⚡ Solo Weekend Only</span>
          </button>
        </div>

        {/* Category Pills */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            style={{
              cursor: "pointer",
              padding: "6px 14px",
              borderRadius: "var(--r-chip)",
              border: "1px solid",
              fontSize: 12,
              fontFamily: "inherit",
              background: selectedCategory === "all" ? "var(--ink)" : "var(--surface)",
              color: selectedCategory === "all" ? "#fff" : "var(--ink)",
              borderColor: selectedCategory === "all" ? "var(--ink)" : "var(--line)",
              fontWeight: selectedCategory === "all" ? 600 : 400,
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
                padding: "6px 14px",
                borderRadius: "var(--r-chip)",
                border: "1px solid",
                fontSize: 12,
                fontFamily: "inherit",
                background: selectedCategory === cat ? "var(--violet)" : "var(--surface)",
                color: selectedCategory === cat ? "#fff" : "var(--ink)",
                borderColor: selectedCategory === cat ? "var(--violet)" : "var(--line)",
                fontWeight: selectedCategory === cat ? 600 : 400,
              }}
            >
              {cat} ({count})
            </button>
          ))}
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
          <p style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600 }}>
            No idea drops match your search or filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setSelectedCategory("all");
              setWeekendOnly(false);
            }}
            className="btn btn-primary"
            style={{ fontSize: 13, padding: "6px 16px" }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="feed-grid">
          {filtered.map((item, i) => {
            const badge =
              item.kind === "tier-locked" ? (
                <span className="feed-badge">🔒 {item.tier}+</span>
              ) : item.kind === "quota-locked" ? (
                <span className="feed-badge">⏳ Limit reached</span>
              ) : item.kind === "signed-out" ? (
                <span className="feed-badge">🔒 Sign in</span>
              ) : (
                <span className="feed-badge" style={{ background: "rgba(198,255,61,0.2)", color: "#547e00" }}>
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
              <Link key={item.id} href={href} className="feed-card">
                <div className={`feed-card-cover ${COVERS[i % COVERS.length]}`}>
                  <span className="tag">{item.category}</span>
                  <span className="score">{item.demandScore}% demand</span>
                </div>
                <div className="feed-card-body">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <h2>{item.title}</h2>
                    {badge}
                  </div>
                  <p>{item.problemSummary}</p>
                  {item.triangulationStats ? (
                    <div style={{ marginTop: 10 }}>
                      <TriangulationBadge stats={item.triangulationStats} />
                    </div>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
