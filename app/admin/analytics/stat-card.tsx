"use client";

import { MorphIcon } from "morphicons/react";
import type { IconNode } from "lucide";
import { ACCENTS } from "./accents";

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
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-xl)",
        padding: "18px 20px",
        boxShadow: "var(--shadow)",
      }}
    >
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
    </div>
  );
}
