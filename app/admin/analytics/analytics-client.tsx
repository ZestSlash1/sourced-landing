"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView, useMotionValue, useSpring, type Variants } from "framer-motion";
import type { Breakdown } from "@/lib/analytics/queries";
import type { PipelineRunRow } from "@/lib/ingest/pipeline-runs-repository";
import { ACCENTS } from "./accents";
import { statCardVariants } from "./stat-card";

const gridVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

export function StatGrid({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="admin-stat-grid"
      style={{ marginBottom: 20 }}
      variants={gridVariants}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );
}

function BreakdownBar({ fraction, color }: { fraction: number; color: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const progress = useMotionValue(0);
  const spring = useSpring(progress, { stiffness: 220, damping: 28 });

  useEffect(() => {
    if (isInView) progress.set(fraction);
  }, [isInView, fraction, progress]);

  return (
    <motion.div
      style={{
        height: "100%",
        width: "100%",
        transformOrigin: "left",
        background: color,
        scaleX: spring,
        borderRadius: "var(--r-chip, 100px)",
      }}
      ref={ref}
    />
  );
}

export function BreakdownCard({
  title,
  rows,
  accent,
}: {
  title: string;
  rows: Breakdown[];
  accent: keyof typeof ACCENTS;
}) {
  const colors = ACCENTS[accent];
  const top = rows.slice(0, 8);
  const max = top.length > 0 ? top[0].count : 0;
  const totalCount = useMemo(() => rows.reduce((sum, r) => sum + r.count, 0), [rows]);

  return (
    <motion.div
      variants={statCardVariants}
      className="admin-card is-interactive"
      style={{
        position: "relative",
        padding: "20px 22px",
        background: "var(--surface, #10121A)",
        border: "1px solid var(--line, rgba(255, 255, 255, 0.08))",
        borderRadius: "var(--r-xl, 20px)",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.35)",
        overflow: "hidden",
      }}
    >
      {/* Subtle top border accent beam */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent 0%, ${colors.bar} 45%, ${colors.fg} 55%, transparent 100%)`,
          opacity: 0.8,
          pointerEvents: "none",
        }}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontSize: 14.5, fontWeight: 600, margin: 0, color: "var(--ink, #F4F4F6)" }}>
          {title}
        </h2>
        {totalCount > 0 && (
          <span
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-soft, #9496A6)",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid var(--line, rgba(255, 255, 255, 0.08))",
              padding: "2px 8px",
              borderRadius: "var(--r-chip, 100px)",
            }}
          >
            total: {totalCount.toLocaleString()}
          </span>
        )}
      </div>

      {top.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--ink-soft, #9496A6)", margin: 0 }}>No data yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {top.map((row) => {
            const fraction = max > 0 ? Math.max(0.06, row.count / max) : 0;
            const pct = totalCount > 0 ? (row.count / totalCount) * 100 : 0;
            return (
              <div key={row.label}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 13,
                    marginBottom: 5,
                    gap: 12,
                  }}
                >
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: "var(--ink, #F4F4F6)",
                      fontWeight: 500,
                    }}
                    title={row.label}
                  >
                    {row.label || "Direct / Unknown"}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span
                      className="mono"
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: colors.fg,
                        background: colors.tint,
                        padding: "1px 6px",
                        borderRadius: "var(--r-chip, 100px)",
                        border: `1px solid ${colors.bar}25`,
                      }}
                    >
                      {pct.toFixed(1)}%
                    </span>
                    <span
                      className="mono"
                      style={{
                        color: "var(--ink-soft, #9496A6)",
                        fontSize: 12.5,
                        fontVariantNumeric: "tabular-nums",
                        minWidth: 42,
                        textAlign: "right",
                      }}
                    >
                      {row.count.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    height: 5,
                    borderRadius: "var(--r-chip, 100px)",
                    background: "rgba(255, 255, 255, 0.05)",
                    overflow: "hidden",
                  }}
                >
                  <BreakdownBar fraction={fraction} color={colors.bar} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

export function BreakdownGrid({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="admin-breakdown-grid"
      variants={gridVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
    >
      {children}
    </motion.div>
  );
}

export function ProviderMixCard({ pipelineRuns }: { pipelineRuns: PipelineRunRow[] }) {
  const ollamaCalls = pipelineRuns.reduce((sum, r) => sum + r.ollamaCalls, 0);
  const openrouterCalls = pipelineRuns.reduce((sum, r) => sum + r.openrouterCalls, 0);
  const fallbacks = pipelineRuns.reduce((sum, r) => sum + r.classifierFallbacks, 0);
  const totalClassifierCalls = ollamaCalls + openrouterCalls;
  const ollamaPct = totalClassifierCalls > 0 ? (ollamaCalls / totalClassifierCalls) * 100 : 0;
  const openrouterPct = totalClassifierCalls > 0 ? 100 - ollamaPct : 0;

  // Drafting provider metrics
  const omnirouteCalls = pipelineRuns.reduce((sum, r) => sum + (r.omnirouteCalls || 0), 0);
  const draftOpenrouterCalls = pipelineRuns.reduce((sum, r) => sum + (r.draftOpenrouterCalls || 0), 0);
  const totalDraftCalls = omnirouteCalls + draftOpenrouterCalls;
  const omniroutePct = totalDraftCalls > 0 ? (omnirouteCalls / totalDraftCalls) * 100 : 0;
  const draftOpenrouterPct = totalDraftCalls > 0 ? 100 - omniroutePct : 0;

  return (
    <motion.div
      variants={statCardVariants}
      className="admin-card is-interactive"
      style={{
        position: "relative",
        padding: "22px 24px",
        marginTop: 20,
        background: "var(--surface, #10121A)",
        border: "1px solid var(--line, rgba(255, 255, 255, 0.08))",
        borderRadius: "var(--r-xl, 20px)",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.35)",
        overflow: "hidden",
      }}
    >
      {/* Top accent beam */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: "linear-gradient(90deg, transparent 0%, #38BDF8 35%, #7C3AED 65%, transparent 100%)",
          opacity: 0.85,
          pointerEvents: "none",
        }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px", color: "var(--ink, #F4F4F6)" }}>
            Classification & Drafting Provider Mix
          </h2>
          <p className="mono" style={{ fontSize: 11.5, color: "var(--ink-soft, #9496A6)", margin: 0 }}>
            Last {pipelineRuns.length} runs · Local Ollama/OmniRoute (free) vs OpenRouter (cloud fallback)
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span
            className="mono"
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "3px 9px",
              borderRadius: "var(--r-chip, 100px)",
              background: "rgba(56, 189, 248, 0.12)",
              color: "#38BDF8",
              border: "1px solid rgba(56, 189, 248, 0.25)",
            }}
          >
            Local: {ollamaPct.toFixed(1)}%
          </span>
          <span
            className="mono"
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "3px 9px",
              borderRadius: "var(--r-chip, 100px)",
              background: "rgba(255, 111, 94, 0.12)",
              color: "var(--coral, #FF5E7E)",
              border: "1px solid rgba(255, 111, 94, 0.25)",
            }}
          >
            Cloud: {openrouterPct.toFixed(1)}%
          </span>
        </div>
      </div>

      {totalClassifierCalls === 0 && totalDraftCalls === 0 ? (
        <p style={{ fontSize: 13, color: "var(--ink-soft, #9496A6)", margin: 0 }}>
          No classification or drafting calls recorded yet.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Section 1: Classification Calls */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7, fontSize: 12 }}>
              <span className="mono" style={{ color: "var(--ink-soft, #9496A6)", textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 10.5 }}>
                1. Signal Classification ({totalClassifierCalls.toLocaleString()} calls)
              </span>
              <span className="mono" style={{ color: "var(--ink-soft, #9496A6)", fontSize: 11 }}>
                Fallbacks triggered: <strong style={{ color: fallbacks > 0 ? "var(--coral, #FF5E7E)" : "#10B981" }}>{fallbacks}</strong>
              </span>
            </div>

            <div
              style={{
                display: "flex",
                height: 10,
                borderRadius: "var(--r-chip, 100px)",
                overflow: "hidden",
                background: "rgba(255, 255, 255, 0.06)",
                marginBottom: 10,
                border: "1px solid rgba(255, 255, 255, 0.05)",
              }}
            >
              {ollamaPct > 0 && (
                <div
                  style={{
                    width: `${ollamaPct}%`,
                    background: "linear-gradient(90deg, #0284C7, #38BDF8)",
                    transition: "width 0.4s ease",
                  }}
                  title={`Ollama: ${ollamaCalls} (${ollamaPct.toFixed(1)}%)`}
                />
              )}
              {openrouterPct > 0 && (
                <div
                  style={{
                    width: `${openrouterPct}%`,
                    background: "linear-gradient(90deg, #F43F5E, #FB7185)",
                    transition: "width 0.4s ease",
                  }}
                  title={`OpenRouter: ${openrouterCalls} (${openrouterPct.toFixed(1)}%)`}
                />
              )}
            </div>

            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 12.5 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: "#38BDF8" }} />
                <span>Ollama (Local):</span>
                <span className="mono" style={{ fontWeight: 600, color: "var(--ink, #F4F4F6)" }}>
                  {ollamaCalls.toLocaleString()}
                </span>
                <span
                  className="mono"
                  style={{
                    fontSize: 11,
                    background: "rgba(56, 189, 248, 0.12)",
                    color: "#38BDF8",
                    padding: "1px 6px",
                    borderRadius: "var(--r-chip, 100px)",
                  }}
                >
                  {ollamaPct.toFixed(1)}%
                </span>
              </span>

              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: "#FB7185" }} />
                <span>OpenRouter (Cloud):</span>
                <span className="mono" style={{ fontWeight: 600, color: "var(--ink, #F4F4F6)" }}>
                  {openrouterCalls.toLocaleString()}
                </span>
                <span
                  className="mono"
                  style={{
                    fontSize: 11,
                    background: "rgba(255, 111, 94, 0.12)",
                    color: "var(--coral, #FF5E7E)",
                    padding: "1px 6px",
                    borderRadius: "var(--r-chip, 100px)",
                  }}
                >
                  {openrouterPct.toFixed(1)}%
                </span>
              </span>
            </div>
          </div>

          {/* Section 2: Draft Generation Calls (if recorded) */}
          {totalDraftCalls > 0 && (
            <div style={{ paddingTop: 12, borderTop: "1px solid var(--line, rgba(255,255,255,0.06))" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7, fontSize: 12 }}>
                <span className="mono" style={{ color: "var(--ink-soft, #9496A6)", textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 10.5 }}>
                  2. Idea Drop Synthesis ({totalDraftCalls.toLocaleString()} calls)
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  height: 10,
                  borderRadius: "var(--r-chip, 100px)",
                  overflow: "hidden",
                  background: "rgba(255, 255, 255, 0.06)",
                  marginBottom: 10,
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                }}
              >
                {omniroutePct > 0 && (
                  <div
                    style={{
                      width: `${omniroutePct}%`,
                      background: "linear-gradient(90deg, #7C3AED, #A78BFA)",
                      transition: "width 0.4s ease",
                    }}
                    title={`OmniRoute: ${omnirouteCalls} (${omniroutePct.toFixed(1)}%)`}
                  />
                )}
                {draftOpenrouterPct > 0 && (
                  <div
                    style={{
                      width: `${draftOpenrouterPct}%`,
                      background: "linear-gradient(90deg, #F59E0B, #FBBF24)",
                      transition: "width 0.4s ease",
                    }}
                    title={`OpenRouter Drafts: ${draftOpenrouterCalls} (${draftOpenrouterPct.toFixed(1)}%)`}
                  />
                )}
              </div>

              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 12.5 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: "#A78BFA" }} />
                  <span>OmniRoute (Self-hosted):</span>
                  <span className="mono" style={{ fontWeight: 600, color: "var(--ink, #F4F4F6)" }}>
                    {omnirouteCalls.toLocaleString()}
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: 11,
                      background: "rgba(124, 58, 237, 0.12)",
                      color: "var(--violet-deep, #A78BFA)",
                      padding: "1px 6px",
                      borderRadius: "var(--r-chip, 100px)",
                    }}
                  >
                    {omniroutePct.toFixed(1)}%
                  </span>
                </span>

                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: "#FBBF24" }} />
                  <span>OpenRouter Drafts:</span>
                  <span className="mono" style={{ fontWeight: 600, color: "var(--ink, #F4F4F6)" }}>
                    {draftOpenrouterCalls.toLocaleString()}
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: 11,
                      background: "rgba(251, 191, 36, 0.12)",
                      color: "#FBBF24",
                      padding: "1px 6px",
                      borderRadius: "var(--r-chip, 100px)",
                    }}
                  >
                    {draftOpenrouterPct.toFixed(1)}%
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

/**
 * Interactive Pipeline Run Inspector
 * Redesigned from an 18-column horizontal overflow table into a focused 7-column primary view
 * with an interactive Run Telemetry Drawer for deep funnel inspection.
 */
export function PipelineTableCard({ pipelineRuns }: { pipelineRuns: PipelineRunRow[] }) {
  const [filterStatus, setFilterStatus] = useState<"all" | "success" | "errors">("all");
  const [filterEngine, setFilterEngine] = useState<"all" | "tiered" | "standard">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  // Filter pipeline runs according to user controls
  const filteredRuns = useMemo(() => {
    return pipelineRuns.filter((run) => {
      const totalErrors =
        run.errors.length +
        run.embeddingErrors.length +
        run.classificationErrors.length +
        run.competitiveCheckErrors.length +
        (run.funnel?.arbiterErrors?.length || 0);

      if (filterStatus === "success" && totalErrors > 0) return false;
      if (filterStatus === "errors" && totalErrors === 0) return false;

      if (filterEngine === "tiered" && !run.funnel) return false;
      if (filterEngine === "standard" && !!run.funnel) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = run.id.toLowerCase().includes(q);
        const matchesDate = new Date(run.ranAt).toLocaleString().toLowerCase().includes(q);
        const matchesErrors = run.errors.some((e) => e.toLowerCase().includes(q));
        if (!matchesId && !matchesDate && !matchesErrors) return false;
      }

      return true;
    });
  }, [pipelineRuns, filterStatus, filterEngine, searchQuery]);

  const counts = useMemo(() => {
    const total = pipelineRuns.length;
    const withErrors = pipelineRuns.filter((r) => {
      const errCount =
        r.errors.length +
        r.embeddingErrors.length +
        r.classificationErrors.length +
        r.competitiveCheckErrors.length +
        (r.funnel?.arbiterErrors?.length || 0);
      return errCount > 0;
    }).length;
    const clean = total - withErrors;
    return { total, clean, withErrors };
  }, [pipelineRuns]);

  const toggleExpand = (id: string) => {
    setExpandedRunId((prev) => (prev === id ? null : id));
  };

  return (
    <motion.div
      className="admin-table-card"
      style={{
        marginTop: 20,
        position: "relative",
        background: "var(--surface, #10121A)",
        border: "1px solid var(--line, rgba(255, 255, 255, 0.08))",
        borderRadius: "var(--r-xl, 20px)",
        padding: "24px",
        boxShadow: "0 4px 24px rgba(0, 0, 0, 0.4)",
        overflow: "hidden",
      }}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ type: "spring", stiffness: 220, damping: 28 }}
    >
      {/* Top accent beam */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: "linear-gradient(90deg, transparent 0%, #7C3AED 30%, #10B981 70%, transparent 100%)",
          opacity: 0.85,
          pointerEvents: "none",
        }}
      />

      {/* Header and Telemetry Description */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--ink, #F4F4F6)", letterSpacing: "-0.01em" }}>
              Pipeline Run Inspector
            </h2>
            <span
              className="mono"
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#10B981",
                background: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                padding: "2px 8px",
                borderRadius: "var(--r-chip, 100px)",
              }}
            >
              Telemetry Active
            </span>
          </div>
          <p className="mono" style={{ fontSize: 11.5, color: "var(--ink-soft, #9496A6)", margin: "4px 0 0" }}>
            Live execution traces across complaint filtration, high-dimensional cosine clustering, and AI draft generation.
          </p>
        </div>
      </div>

      {/* Quick Filter Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 18,
          flexWrap: "wrap",
          padding: "10px 14px",
          background: "rgba(8, 9, 14, 0.6)",
          border: "1px solid var(--line, rgba(255, 255, 255, 0.06))",
          borderRadius: "var(--r-md, 12px)",
        }}
      >
        {/* Status Filter Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setFilterStatus("all")}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11.5,
              fontWeight: 600,
              padding: "5px 11px",
              borderRadius: "var(--r-chip, 100px)",
              border: filterStatus === "all" ? "1px solid #7C3AED" : "1px solid rgba(255, 255, 255, 0.08)",
              background: filterStatus === "all" ? "rgba(124, 58, 237, 0.22)" : "rgba(255, 255, 255, 0.03)",
              color: filterStatus === "all" ? "#A78BFA" : "var(--ink-soft, #9496A6)",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            All Runs ({counts.total})
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus("success")}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11.5,
              fontWeight: 600,
              padding: "5px 11px",
              borderRadius: "var(--r-chip, 100px)",
              border: filterStatus === "success" ? "1px solid #10B981" : "1px solid rgba(255, 255, 255, 0.08)",
              background: filterStatus === "success" ? "rgba(16, 185, 129, 0.18)" : "rgba(255, 255, 255, 0.03)",
              color: filterStatus === "success" ? "#34D399" : "var(--ink-soft, #9496A6)",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            Clean Only ({counts.clean})
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus("errors")}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11.5,
              fontWeight: 600,
              padding: "5px 11px",
              borderRadius: "var(--r-chip, 100px)",
              border: filterStatus === "errors" ? "1px solid #FF5E7E" : "1px solid rgba(255, 255, 255, 0.08)",
              background: filterStatus === "errors" ? "rgba(255, 94, 126, 0.18)" : "rgba(255, 255, 255, 0.03)",
              color: filterStatus === "errors" ? "#FF8DA3" : "var(--ink-soft, #9496A6)",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            With Errors ({counts.withErrors})
          </button>
        </div>

        {/* Engine Filter + Search Input */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flex: 1, justifyContent: "flex-end" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-soft, #9496A6)" }}>
              Engine:
            </span>
            <select
              value={filterEngine}
              onChange={(e) => setFilterEngine(e.target.value as "all" | "tiered" | "standard")}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11.5,
                background: "rgba(16, 18, 26, 0.9)",
                color: "var(--ink, #F4F4F6)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "var(--r-sm, 8px)",
                padding: "4px 8px",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="all">All Engines</option>
              <option value="tiered">Tiered Funnel (0.82 / 0.55)</option>
              <option value="standard">Standard Cosine</option>
            </select>
          </div>

          <input
            type="text"
            placeholder="Search run ID or date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11.5,
              background: "rgba(16, 18, 26, 0.8)",
              color: "var(--ink, #F4F4F6)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "var(--r-sm, 8px)",
              padding: "5px 10px",
              minWidth: 170,
              maxWidth: 240,
              outline: "none",
            }}
          />
        </div>
      </div>

      {pipelineRuns.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--ink-soft, #9496A6)", margin: 0, padding: "20px 0" }}>
          No runs recorded yet. The draft-ideas cron writes here after each pass.
        </p>
      ) : filteredRuns.length === 0 ? (
        <div style={{ padding: "30px 20px", textAlign: "center", color: "var(--ink-soft, #9496A6)" }}>
          <p style={{ margin: "0 0 8px", fontSize: 13 }}>No pipeline runs match the selected filters.</p>
          <button
            type="button"
            onClick={() => {
              setFilterStatus("all");
              setFilterEngine("all");
              setSearchQuery("");
            }}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11.5,
              color: "#A78BFA",
              background: "rgba(124, 58, 237, 0.15)",
              border: "1px solid rgba(124, 58, 237, 0.3)",
              padding: "4px 12px",
              borderRadius: "var(--r-chip, 100px)",
              cursor: "pointer",
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="admin-table-wrap" style={{ overflowX: "auto" }}>
          <table className="mono admin-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                  background: "rgba(255, 255, 255, 0.02)",
                }}
              >
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, color: "var(--ink-soft, #9496A6)" }}>
                  Started
                </th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, color: "var(--ink-soft, #9496A6)" }}>
                  Source / Engine
                </th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, color: "var(--ink-soft, #9496A6)" }}>
                  Status
                </th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, color: "var(--ink-soft, #9496A6)" }}>
                  Signals (New / Pool)
                </th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, color: "var(--ink-soft, #9496A6)" }}>
                  Clusters (Passed / All)
                </th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, color: "var(--ink-soft, #9496A6)" }}>
                  Drafted
                </th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 11, color: "var(--ink-soft, #9496A6)" }}>
                  Telemetry & Details
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRuns.map((r) => {
                const isExpanded = expandedRunId === r.id;
                const totalErrors =
                  r.errors.length +
                  r.embeddingErrors.length +
                  r.classificationErrors.length +
                  r.competitiveCheckErrors.length +
                  (r.funnel?.arbiterErrors?.length || 0);

                const ranDate = new Date(r.ranAt);
                const timeString = ranDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                const dateString = ranDate.toLocaleDateString([], { month: "short", day: "numeric" });

                // Determine engine representation
                const isTiered = !!r.funnel;
                const engineTag = isTiered
                  ? "Tiered Arbiter"
                  : r.omnirouteCalls > 0
                  ? "OmniRoute"
                  : r.ollamaCalls > 0
                  ? "Ollama Local"
                  : "Standard Cosine";

                // Calculate combined latency indicator
                const avgLatencySec = Math.round(
                  (r.ollamaAvgLatencyMs * r.ollamaCalls +
                    r.openrouterAvgLatencyMs * r.openrouterCalls +
                    r.omnirouteAvgLatencyMs * r.omnirouteCalls +
                    r.draftOpenrouterAvgLatencyMs * r.draftOpenrouterCalls) /
                    1000
                );

                return (
                  <TelemetryRowGroup
                    key={r.id}
                    run={r}
                    isExpanded={isExpanded}
                    totalErrors={totalErrors}
                    timeString={timeString}
                    dateString={dateString}
                    engineTag={engineTag}
                    isTiered={isTiered}
                    avgLatencySec={avgLatencySec}
                    onToggle={() => toggleExpand(r.id)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}

/**
 * Individual row group containing the 7-column primary table row
 * and the expandable Run Telemetry Drawer.
 */
function TelemetryRowGroup({
  run,
  isExpanded,
  totalErrors,
  timeString,
  dateString,
  engineTag,
  isTiered,
  avgLatencySec,
  onToggle,
}: {
  run: PipelineRunRow;
  isExpanded: boolean;
  totalErrors: number;
  timeString: string;
  dateString: string;
  engineTag: string;
  isTiered: boolean;
  avgLatencySec: number;
  onToggle: () => void;
}) {
  const allErrorsList = useMemo(() => {
    const list: { type: string; msg: string }[] = [];
    run.errors.forEach((e) => list.push({ type: "Pipeline", msg: e }));
    run.classificationErrors.forEach((e) => list.push({ type: "Classifier", msg: e }));
    run.embeddingErrors.forEach((e) => list.push({ type: "Embedding", msg: e }));
    run.competitiveCheckErrors.forEach((e) => list.push({ type: "Competitive", msg: e }));
    run.funnel?.arbiterErrors?.forEach((e) => list.push({ type: "Arbiter", msg: e }));
    return list;
  }, [run]);

  return (
    <>
      <tr
        onClick={onToggle}
        style={{
          cursor: "pointer",
          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
          background: isExpanded
            ? "rgba(124, 58, 237, 0.08)"
            : "transparent",
          transition: "background 0.15s ease",
        }}
        className="admin-interactive-row"
      >
        {/* 1. Started */}
        <td style={{ padding: "12px 12px", whiteSpace: "nowrap" }}>
          <div style={{ color: "var(--ink, #F4F4F6)", fontWeight: 600, fontSize: 12 }}>
            {dateString} · {timeString}
          </div>
          <div style={{ fontSize: 10.5, color: "var(--ink-soft, #9496A6)" }}>
            ID: {run.id.slice(0, 8)}...
          </div>
        </td>

        {/* 2. Source / Engine */}
        <td style={{ padding: "12px 12px", whiteSpace: "nowrap" }}>
          <span
            style={{
              display: "inline-block",
              fontSize: 10.5,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: "var(--r-chip, 100px)",
              background: isTiered
                ? "rgba(124, 58, 237, 0.15)"
                : "rgba(56, 189, 248, 0.12)",
              color: isTiered ? "#C4B5FD" : "#38BDF8",
              border: isTiered
                ? "1px solid rgba(124, 58, 237, 0.3)"
                : "1px solid rgba(56, 189, 248, 0.25)",
            }}
          >
            {engineTag}
          </span>
        </td>

        {/* 3. Status */}
        <td style={{ padding: "12px 12px", whiteSpace: "nowrap" }}>
          {totalErrors === 0 ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                fontWeight: 600,
                color: "#10B981",
                background: "rgba(16, 185, 129, 0.1)",
                padding: "2px 8px",
                borderRadius: "var(--r-chip, 100px)",
                border: "1px solid rgba(16, 185, 129, 0.25)",
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#10B981" }} />
              Success
            </span>
          ) : (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                fontWeight: 600,
                color: "var(--coral, #FF5E7E)",
                background: "rgba(255, 94, 126, 0.12)",
                padding: "2px 8px",
                borderRadius: "var(--r-chip, 100px)",
                border: "1px solid rgba(255, 94, 126, 0.25)",
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--coral, #FF5E7E)" }} />
              {totalErrors} {totalErrors === 1 ? "Error" : "Errors"}
            </span>
          )}
        </td>

        {/* 4. Signals (New / Pool) */}
        <td style={{ padding: "12px 12px", whiteSpace: "nowrap" }}>
          <span style={{ fontWeight: 600, color: "var(--ink, #F4F4F6)" }}>
            {run.classifiedComplaint}
          </span>
          <span style={{ color: "var(--ink-soft, #9496A6)", fontSize: 11 }}>
            {" "}/ {run.signalsConsidered} pool
          </span>
        </td>

        {/* 5. Clusters (Passed / All) */}
        <td style={{ padding: "12px 12px", whiteSpace: "nowrap" }}>
          <span style={{ fontWeight: 600, color: "var(--ink, #F4F4F6)" }}>
            {run.clustersPassingBar}
          </span>
          <span style={{ color: "var(--ink-soft, #9496A6)", fontSize: 11 }}>
            {" "}/ {run.clustersFormed} formed
          </span>
          {run.clustersPassingBarMultiPlatform > 0 && (
            <span
              style={{
                marginLeft: 6,
                fontSize: 10,
                color: "#A78BFA",
                background: "rgba(124, 58, 237, 0.12)",
                padding: "1px 5px",
                borderRadius: "4px",
              }}
            >
              {run.clustersPassingBarMultiPlatform} 2p+
            </span>
          )}
        </td>

        {/* 6. Drafted */}
        <td style={{ padding: "12px 12px", whiteSpace: "nowrap" }}>
          {run.drafted > 0 ? (
            <span
              style={{
                display: "inline-block",
                fontWeight: 700,
                color: "#10B981",
                background: "rgba(16, 185, 129, 0.14)",
                padding: "2px 8px",
                borderRadius: "var(--r-chip, 100px)",
                border: "1px solid rgba(16, 185, 129, 0.25)",
              }}
            >
              {run.drafted} {run.drafted === 1 ? "draft" : "drafts"}
            </span>
          ) : (
            <span style={{ color: "var(--ink-soft, #9496A6)" }}>0 drafted</span>
          )}
        </td>

        {/* 7. Duration & Details Toggle */}
        <td style={{ padding: "12px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            {avgLatencySec > 0 && (
              <span className="mono" style={{ fontSize: 11, color: "var(--ink-soft, #9496A6)" }}>
                ~{avgLatencySec}s
              </span>
            )}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                fontWeight: 600,
                color: isExpanded ? "#A78BFA" : "var(--ink-soft, #9496A6)",
                background: isExpanded ? "rgba(124, 58, 237, 0.2)" : "rgba(255, 255, 255, 0.05)",
                padding: "4px 8px",
                borderRadius: "var(--r-sm, 6px)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                transition: "all 0.15s ease",
              }}
            >
              <span>{isExpanded ? "Hide" : "Inspect"}</span>
              <span style={{ fontSize: 9 }}>{isExpanded ? "▲" : "▼"}</span>
            </span>
          </div>
        </td>
      </tr>

      {/* Structured Run Telemetry Drawer */}
      {isExpanded && (
        <tr style={{ background: "rgba(8, 9, 14, 0.95)" }}>
          <td colSpan={7} style={{ padding: "18px 20px 24px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 14,
              }}
            >
              {/* Mini-Card 1: Classification Funnel */}
              <div
                style={{
                  background: "#161824",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "var(--r-md, 12px)",
                  padding: "16px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#38BDF8", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    1. Classification Funnel
                  </span>
                  <span style={{ fontSize: 10.5, color: "var(--ink-soft, #9496A6)" }}>
                    cost: ${(run.classificationCostUsd || 0).toFixed(4)}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--ink-soft, #9496A6)" }}>Signals Considered:</span>
                    <span style={{ fontWeight: 600, color: "var(--ink, #F4F4F6)" }}>{run.signalsConsidered}</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--ink-soft, #9496A6)" }}>Complaints (Passed):</span>
                    <span style={{ fontWeight: 600, color: "#10B981" }}>{run.classifiedComplaint}</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--ink-soft, #9496A6)" }}>Non-Complaints (Filtered):</span>
                    <span style={{ color: "var(--ink-soft, #9496A6)" }}>{run.classifiedNonComplaint}</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 4, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ color: "var(--ink-soft, #9496A6)" }}>Embeddings Generated:</span>
                    <span style={{ fontWeight: 600, color: "var(--ink, #F4F4F6)" }}>
                      {run.embeddingsGenerated} ok / {run.embeddingErrors.length} fail
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--ink-soft, #9496A6)" }}>Classifier Calls:</span>
                    <span style={{ color: "var(--ink-soft, #9496A6)" }}>
                      {run.ollamaCalls} local · {run.openrouterCalls} cloud
                    </span>
                  </div>
                </div>
              </div>

              {/* Mini-Card 2: Clustering & Similarity */}
              <div
                style={{
                  background: "#161824",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "var(--r-md, 12px)",
                  padding: "16px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#A78BFA", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    2. Clustering & Similarity
                  </span>
                  <span
                    style={{
                      fontSize: 10.5,
                      color: "#A78BFA",
                      background: "rgba(124, 58, 237, 0.15)",
                      padding: "1px 6px",
                      borderRadius: "4px",
                    }}
                  >
                    θ = {run.similarityThreshold}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--ink-soft, #9496A6)" }}>Pairs Compared:</span>
                    <span style={{ fontWeight: 600, color: "var(--ink, #F4F4F6)" }}>{run.pairsCompared}</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--ink-soft, #9496A6)" }}>Clusters Formed:</span>
                    <span style={{ fontWeight: 600, color: "var(--ink, #F4F4F6)" }}>{run.clustersFormed}</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--ink-soft, #9496A6)" }}>Passing Min Bar:</span>
                    <span style={{ fontWeight: 600, color: "#10B981" }}>
                      {run.clustersPassingBar} ({run.clustersPassingBarSinglePlatform} 1p / {run.clustersPassingBarMultiPlatform} 2p+)
                    </span>
                  </div>

                  {run.funnel && (
                    <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 4, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <span style={{ color: "var(--ink-soft, #9496A6)" }}>Tiered Arbitration:</span>
                      <span style={{ color: "#C4B5FD", fontWeight: 600 }}>
                        {run.funnel.candidatesFound} cand → {run.funnel.groupsPassingGate} pass
                      </span>
                    </div>
                  )}

                  {/* Size Distribution Badges */}
                  <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                    <span style={{ color: "var(--ink-soft, #9496A6)", fontSize: 11 }}>Sizes:</span>
                    {Object.entries(run.clusterSizeDistribution).length === 0 ? (
                      <span style={{ color: "var(--ink-soft, #9496A6)", fontSize: 11 }}>—</span>
                    ) : (
                      Object.entries(run.clusterSizeDistribution)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([size, count]) => (
                          <span
                            key={size}
                            style={{
                              fontSize: 10.5,
                              padding: "1px 6px",
                              borderRadius: "var(--r-chip, 100px)",
                              background: "rgba(255, 255, 255, 0.05)",
                              border: "1px solid rgba(255, 255, 255, 0.08)",
                              color: "var(--ink, #F4F4F6)",
                            }}
                          >
                            size {size}: <strong>{count}</strong>
                          </span>
                        ))
                    )}
                  </div>
                </div>
              </div>

              {/* Mini-Card 3: LLM & Drafting */}
              <div
                style={{
                  background: "#161824",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "var(--r-md, 12px)",
                  padding: "16px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#FBBF24", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    3. LLM & Idea Drafting
                  </span>
                  <span
                    style={{
                      fontSize: 10.5,
                      color: run.drafted > 0 ? "#10B981" : "var(--ink-soft, #9496A6)",
                      fontWeight: 600,
                    }}
                  >
                    {run.drafted} Created
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--ink-soft, #9496A6)" }}>OmniRoute Draft Calls:</span>
                    <span style={{ fontWeight: 600, color: "var(--ink, #F4F4F6)" }}>
                      {run.omnirouteCalls} ({run.omnirouteAvgLatencyMs}ms avg)
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--ink-soft, #9496A6)" }}>OpenRouter Draft Calls:</span>
                    <span style={{ fontWeight: 600, color: "var(--ink, #F4F4F6)" }}>
                      {run.draftOpenrouterCalls} ({run.draftOpenrouterAvgLatencyMs}ms avg)
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--ink-soft, #9496A6)" }}>Competitive Checks:</span>
                    <span style={{ color: "var(--ink-soft, #9496A6)" }}>
                      {run.competitiveChecksRun} run (${(run.competitiveCheckCostUsd || 0).toFixed(4)})
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 4, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ color: "var(--ink-soft, #9496A6)" }}>Estimated Total Cost:</span>
                    <span style={{ fontWeight: 600, color: "#FBBF24" }}>
                      ${(
                        (run.classificationCostUsd || 0) +
                        (run.embeddingCostUsd || 0) +
                        (run.competitiveCheckCostUsd || 0) +
                        (run.funnel?.llmCostUsd || 0)
                      ).toFixed(4)}{" "}
                      USD
                    </span>
                  </div>
                </div>
              </div>

              {/* Mini-Card 4: Errors & Diagnostics */}
              <div
                style={{
                  background: "#161824",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "var(--r-md, 12px)",
                  padding: "16px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: allErrorsList.length === 0 ? "#10B981" : "var(--coral, #FF5E7E)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    4. Diagnostics & Logs
                  </span>
                  <span
                    style={{
                      fontSize: 10.5,
                      padding: "1px 6px",
                      borderRadius: "4px",
                      background: allErrorsList.length === 0 ? "rgba(16, 185, 129, 0.12)" : "rgba(255, 94, 126, 0.15)",
                      color: allErrorsList.length === 0 ? "#10B981" : "var(--coral, #FF5E7E)",
                    }}
                  >
                    {allErrorsList.length} items
                  </span>
                </div>

                {allErrorsList.length === 0 ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      height: 100,
                      gap: 6,
                    }}
                  >
                    <span style={{ fontSize: 18, color: "#10B981" }}>✓</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#10B981" }}>
                      Clean run — 0 errors
                    </span>
                    <span style={{ fontSize: 11, color: "var(--ink-soft, #9496A6)" }}>
                      All pipeline stages completed nominally
                    </span>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      maxHeight: 120,
                      overflowY: "auto",
                      paddingRight: 4,
                    }}
                  >
                    {allErrorsList.map((err, idx) => (
                      <div
                        key={idx}
                        style={{
                          fontSize: 11,
                          padding: "6px 8px",
                          borderRadius: "6px",
                          background: "rgba(255, 94, 126, 0.08)",
                          border: "1px solid rgba(255, 94, 126, 0.2)",
                          color: "var(--ink, #F4F4F6)",
                          wordBreak: "break-word",
                        }}
                      >
                        <span style={{ fontWeight: 700, color: "var(--coral, #FF5E7E)", marginRight: 6 }}>
                          [{err.type}]
                        </span>
                        {err.msg}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
