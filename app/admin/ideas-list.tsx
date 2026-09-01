"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import type { IdeaDrop } from "@/types/idea-drop";

const STATUS_STYLE: Record<string, { fg: string; bg: string }> = {
  draft: { fg: "var(--ink-soft)", bg: "var(--bg)" },
  needs_evidence: { fg: "#C4432F", bg: "rgba(255,111,94,0.14)" },
  pending_review: { fg: "#8A5A00", bg: "rgba(255,184,77,0.18)" },
  published: { fg: "var(--violet-deep)", bg: "rgba(91,79,247,0.12)" },
};

const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const rowVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 240, damping: 28 } },
};

export default function IdeasList({ ideas }: { ideas: IdeaDrop[] }) {
  if (ideas.length === 0) {
    return <p style={{ padding: "24px 22px", color: "var(--ink-soft)", margin: 0, fontSize: 14 }}>No ideas yet.</p>;
  }

  return (
    <motion.div variants={listVariants} initial="hidden" animate="show">
      {ideas.map((idea) => {
        const status = STATUS_STYLE[idea.status] ?? STATUS_STYLE.draft;
        return (
          <motion.div key={idea.id} variants={rowVariants} whileHover={{ x: 2 }}>
            <Link href={`/admin/ideas/${idea.id}`} className="admin-list-row">
              <div style={{ minWidth: 0 }}>
                <div className="admin-list-title">{idea.title}</div>
                <div className="admin-list-meta">
                  {idea.category} · demand {idea.demandScore} · {idea.tier} tier
                </div>
              </div>
              <span className="admin-status-chip" style={{ color: status.fg, background: status.bg }}>
                {idea.status.replace("_", " ")}
              </span>
            </Link>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
