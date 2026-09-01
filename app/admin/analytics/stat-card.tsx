"use client";

import { MorphIcon } from "morphicons/react";
import type { IconNode } from "lucide";
import { motion, type Variants } from "framer-motion";
import { ACCENTS } from "./accents";

export const statCardVariants: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 240, damping: 28 } },
};

export function StatCard({
  icon,
  accent,
  label,
  value,
}: {
  icon: IconNode;
  accent: keyof typeof ACCENTS;
  label: string;
  value: string;
}) {
  const colors = ACCENTS[accent];
  return (
    <motion.div variants={statCardVariants} className="admin-card is-interactive" style={{ padding: "18px 20px" }} whileHover={{ y: -2 }}>
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: "var(--r-sm)",
          background: colors.tint,
          color: colors.fg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14,
        }}
      >
        <MorphIcon icon={icon} size={17} />
      </div>
      <div className="display" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.1, marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>{label}</div>
    </motion.div>
  );
}
