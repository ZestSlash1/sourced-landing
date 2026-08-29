// Plain data module (no "use client") so both the server page and the
// client StatCard can import it — a value exported from a "use client"
// file can't be read from a server component.
export const ACCENTS = {
  violet: { fg: "var(--violet-deep)", bar: "var(--violet)", tint: "rgba(91,79,247,0.12)" },
  coral: { fg: "#C4432F", bar: "var(--coral)", tint: "rgba(255,111,94,0.14)" },
  sun: { fg: "#8A5A00", bar: "var(--sun)", tint: "rgba(255,184,77,0.18)" },
  sky: { fg: "#0E7DA8", bar: "var(--sky)", tint: "rgba(77,200,255,0.16)" },
} as const;
