import type { EconomicAssessment } from "@/lib/idea-drops/economic-severity";

export default function EconomicSeverityCard({ assessment }: { assessment: EconomicAssessment }) {
  const isCritical = assessment.level === "Critical";

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderLeft: `4px solid ${isCritical ? "var(--coral-deep)" : "var(--violet)"}`,
        borderRadius: "var(--r-md)",
        padding: "18px 20px",
        marginBottom: 26,
        boxShadow: "var(--shadow)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            className="eyebrow"
            style={{ margin: 0, color: isCritical ? "var(--coral-deep)" : "var(--violet-deep)" }}
          >
            Economic Severity & Willingness-to-Pay
          </span>
          <span
            className="mono"
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: "var(--r-chip)",
              background: isCritical ? "rgba(255, 111, 94, 0.12)" : "rgba(91, 79, 247, 0.1)",
              color: isCritical ? "var(--coral-deep)" : "var(--violet-deep)",
            }}
          >
            Score: {assessment.score}/100 ({assessment.level})
          </span>
        </div>

        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
          Suggested Pricing: <span style={{ color: "var(--violet-deep)" }}>{assessment.suggestedPricing.starter}</span> – {assessment.suggestedPricing.pro}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
          paddingTop: 10,
          borderTop: "1px solid var(--line)",
          fontSize: 13,
        }}
      >
        <div>
          <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-soft)", display: "block", textTransform: "uppercase" }}>
            Target Buyer Persona
          </span>
          <strong style={{ color: "var(--ink)" }}>{assessment.buyerPersona}</strong>
        </div>

        <div>
          <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-soft)", display: "block", textTransform: "uppercase" }}>
            Current Workaround Cost
          </span>
          <span style={{ color: "var(--ink)" }}>{assessment.workaroundExpense}</span>
        </div>

        <div>
          <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-soft)", display: "block", textTransform: "uppercase" }}>
            Net Estimated Monthly ROI
          </span>
          <span style={{ color: "#3F6B00", fontWeight: 600 }}>{assessment.estimatedMonthlyRoi}</span>
        </div>
      </div>
    </div>
  );
}
