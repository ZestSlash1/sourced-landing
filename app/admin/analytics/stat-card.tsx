"use client";

import { MorphIcon } from "morphicons/react";
import type { IconNode } from "lucide";
import { motion, type Variants } from "framer-motion";
import { ACCENTS } from "./accents";

export const statCardVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 260, damping: 26 },
  },
};

export function StatCard({
  icon,
  accent,
  label,
  value,
  trend,
}: {
  icon: IconNode;
  accent: keyof typeof ACCENTS;
  label: string;
  value: string;
  trend?: string;
}) {
  const colors = ACCENTS[accent];

  return (
    <motion.div
      variants={statCardVariants}
      className="admin-card is-interactive"
      style={{
        position: "relative",
        padding: "20px 22px",
        overflow: "hidden",
        background: "var(--surface, #10121A)",
        border: "1px solid var(--line, rgba(255, 255, 255, 0.08))",
        borderRadius: "var(--r-xl, 20px)",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.35)",
      }}
      whileHover={{
        y: -3,
        borderColor: "rgba(255, 255, 255, 0.16)",
        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.55)",
      }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
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
          background: `linear-gradient(90deg, transparent 0%, ${colors.bar} 40%, ${colors.fg} 60%, transparent 100%)`,
          opacity: 0.9,
          pointerEvents: "none",
        }}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "var(--r-sm, 10px)",
            background: colors.tint,
            border: `1px solid ${colors.bar}33`,
            color: colors.fg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 0 16px ${colors.tint}`,
          }}
        >
          <MorphIcon icon={icon} size={18} />
        </div>

        {trend ? (
          <span
            className="mono"
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: colors.fg,
              background: colors.tint,
              padding: "2px 8px",
              borderRadius: "var(--r-chip, 100px)",
              border: `1px solid ${colors.bar}25`,
            }}
          >
            {trend}
          </span>
        ) : (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: colors.bar,
              opacity: 0.7,
              boxShadow: `0 0 8px ${colors.bar}`,
            }}
          />
        )}
      </div>

      <div
        className="mono"
        style={{
          fontSize: 27,
          fontWeight: 700,
          lineHeight: 1.15,
          marginBottom: 5,
          color: "var(--ink, #F4F4F6)",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>

      <div
        style={{
          fontSize: 13,
          color: "var(--ink-soft, #9496A6)",
          fontWeight: 500,
          letterSpacing: "-0.005em",
        }}
      >
        {label}
      </div>
    </motion.div>
  );
}
