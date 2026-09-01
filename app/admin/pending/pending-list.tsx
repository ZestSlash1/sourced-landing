"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import type { IdeaDrop } from "@/types/idea-drop";
import CompetitiveLandscapePanel from "./competitive-landscape-panel";
import ReviewActions from "./review-actions";

const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 230, damping: 28 } },
};

export default function PendingList({ ideas }: { ideas: IdeaDrop[] }) {
  return (
    <motion.div variants={listVariants} initial="hidden" animate="show">
      {ideas.map((idea) => {
        const platformCount = idea.platformCount ?? new Set(idea.evidence.map((e) => e.platform)).size;
        const crossPlatform = idea.crossPlatform ?? platformCount >= 2;
        return (
          <motion.div key={idea.id} variants={cardVariants} className="admin-card is-interactive" style={{ padding: 22, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ margin: "0 0 4px", fontSize: 17 }}>{idea.title}</h2>
                <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--ink-soft)" }}>
                  {idea.category} · demand {idea.demandScore} · {idea.tier} tier · tags: {idea.tags.join(", ")}
                </p>
                <span
                  className="mono admin-source-chip"
                  style={{
                    color: crossPlatform ? "var(--violet-deep)" : "var(--ink-soft)",
                    background: crossPlatform ? "rgba(91,79,247,0.09)" : "rgba(0,0,0,0.05)",
                  }}
                >
                  {crossPlatform ? `${platformCount}+ sources` : "1 source"}
                </span>
              </div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 260, damping: 26 }}>
                <Link href={`/admin/ideas/${idea.id}`} className="admin-btn-edit">
                  Edit
                </Link>
              </motion.div>
            </div>

            <p style={{ fontSize: 14, margin: "0 0 12px" }}>{idea.problem.summary}</p>

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "0 0 6px" }}>
                Evidence ({idea.evidence.length} source{idea.evidence.length === 1 ? "" : "s"}):
              </p>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                {idea.evidence.map((e) => (
                  <li key={e.url} style={{ marginBottom: 4 }}>
                    <a href={e.url} target="_blank" rel="noreferrer">
                      {e.platform}
                    </a>
                    {" — "}
                    {e.quote.slice(0, 120)}
                    {e.quote.length > 120 ? "..." : ""}
                  </li>
                ))}
              </ul>
            </div>

            <CompetitiveLandscapePanel ideaId={idea.id} landscape={idea.competitiveLandscape} />

            <ReviewActions ideaId={idea.id} hasCloseCompetitor={idea.competitiveLandscape?.verdict === "close_competitor_exists"} />
          </motion.div>
        );
      })}
    </motion.div>
  );
}
