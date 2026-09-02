"use client";

import { useEffect, useRef, useState } from "react";
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
    <motion.div className="admin-stat-grid" style={{ marginBottom: 20 }} variants={gridVariants} initial="hidden" animate="show">
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
    <motion.div style={{ height: "100%", width: "100%", transformOrigin: "left", background: color, scaleX: spring }} ref={ref} />
  );
}

export function BreakdownCard({ title, rows, accent }: { title: string; rows: Breakdown[]; accent: keyof typeof ACCENTS }) {
  const colors = ACCENTS[accent];
  const top = rows.slice(0, 8);
  const max = top.length > 0 ? top[0].count : 0;

  return (
    <motion.div variants={statCardVariants} className="admin-card is-interactive" style={{ padding: "20px 22px" }}>
      <h2 style={{ fontSize: 14.5, fontWeight: 600, margin: "0 0 16px" }}>{title}</h2>

      {top.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: 0 }}>No data yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {top.map((row) => {
            const fraction = max > 0 ? Math.max(0.06, row.count / max) : 0;
            return (
              <div key={row.label}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5, gap: 12 }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.label}</span>
                  <span className="mono" style={{ color: "var(--ink-soft)", flexShrink: 0 }}>
                    {row.count.toLocaleString()}
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: "var(--r-chip)", background: colors.tint, overflow: "hidden" }}>
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
  const total = ollamaCalls + openrouterCalls;
  const ollamaPct = total > 0 ? (ollamaCalls / total) * 100 : 0;
  const openrouterPct = total > 0 ? 100 - ollamaPct : 0;

  return (
    <motion.div
      variants={statCardVariants}
      className="admin-card is-interactive"
      style={{ padding: "20px 22px", marginTop: 20 }}
    >
      <h2 style={{ fontSize: 14.5, fontWeight: 600, margin: "0 0 4px" }}>Classification provider mix</h2>
      <p className="mono" style={{ fontSize: 11.5, color: "var(--ink-soft)", margin: "0 0 16px" }}>
        Last {pipelineRuns.length} runs · Ollama (local, free) vs OpenRouter (fallback/cloud)
      </p>

      {total === 0 ? (
        <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: 0 }}>No classification calls recorded yet.</p>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              height: 14,
              borderRadius: "var(--r-chip)",
              overflow: "hidden",
              background: ACCENTS.violet.tint,
              marginBottom: 12,
            }}
          >
            {ollamaPct > 0 && <div style={{ width: `${ollamaPct}%`, background: ACCENTS.sky.bar }} />}
            {openrouterPct > 0 && <div style={{ width: `${openrouterPct}%`, background: ACCENTS.coral.bar }} />}
          </div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", fontSize: 13 }}>
            <span>
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: ACCENTS.sky.bar, marginRight: 6 }} />
              Ollama: <span className="mono">{ollamaCalls.toLocaleString()}</span> ({ollamaPct.toFixed(1)}%)
            </span>
            <span>
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: ACCENTS.coral.bar, marginRight: 6 }} />
              OpenRouter: <span className="mono">{openrouterCalls.toLocaleString()}</span> ({openrouterPct.toFixed(1)}%)
            </span>
            <span style={{ color: "var(--ink-soft)" }}>
              Fallbacks: <span className="mono">{fallbacks.toLocaleString()}</span>
            </span>
          </div>
        </>
      )}
    </motion.div>
  );
}

export function PipelineTableCard({ pipelineRuns }: { pipelineRuns: PipelineRunRow[] }) {
  return (
    <motion.div
      className="admin-table-card"
      style={{ marginTop: 20 }}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ type: "spring", stiffness: 220, damping: 28 }}
    >
      <h2 style={{ fontSize: 14.5, fontWeight: 600, margin: "0 0 4px" }}>Ingest pipeline runs</h2>
      <p className="mono" style={{ fontSize: 11.5, color: "var(--ink-soft)", margin: "0 0 14px" }}>
        Last {pipelineRuns.length} draft-pass invocations. Clusters must reach 3+ signals to draft (1+ platform
        required, 2+ platforms tracked as stronger evidence, not gated).
      </p>
      {pipelineRuns.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: 0 }}>
          No runs recorded yet. The draft-ideas cron writes here after each pass.
        </p>
      ) : (
        <div className="admin-table-wrap">
          <table className="mono admin-table">
            <thead>
              <tr>
                <th>Ran at</th>
                <th>Complaints</th>
                <th>Non-complaints</th>
                <th>Signals</th>
                <th>Pairs</th>
                <th>Clusters</th>
                <th>Size dist.</th>
                <th>Passing bar</th>
                <th>· 1 platform</th>
                <th>· 2+ platforms</th>
                <th>Drafted</th>
                <th>Threshold</th>
                <th>Embedded</th>
                <th>Emb. errors</th>
                <th>Comp. checks</th>
                <th>Comp. errors</th>
                <th>Errors</th>
              </tr>
            </thead>
            <tbody>
              {pipelineRuns.map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.ranAt).toLocaleString()}</td>
                  <td>{r.classifiedComplaint}</td>
                  <td>{r.classifiedNonComplaint}</td>
                  <td>{r.signalsConsidered}</td>
                  <td>{r.pairsCompared}</td>
                  <td>{r.clustersFormed}</td>
                  <td>
                    {Object.entries(r.clusterSizeDistribution)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([size, count]) => `${size}:${count}`)
                      .join(" ") || "—"}
                  </td>
                  <td>{r.clustersPassingBar}</td>
                  <td>{r.clustersPassingBarSinglePlatform}</td>
                  <td>{r.clustersPassingBarMultiPlatform}</td>
                  <td>{r.drafted}</td>
                  <td>{r.similarityThreshold}</td>
                  <td>{r.embeddingsGenerated}</td>
                  <td>{r.embeddingErrors.length}</td>
                  <td>{r.competitiveChecksRun}</td>
                  <td>{r.competitiveCheckErrors.length}</td>
                  <td>{r.errors.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
