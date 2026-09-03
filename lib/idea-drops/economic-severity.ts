export interface EconomicAssessment {
  score: number; // 0-100 severity index
  level: "Critical" | "High" | "Moderate";
  buyerPersona: string;
  suggestedPricing: {
    starter: string;
    pro: string;
    valueMetric: string;
  };
  estimatedMonthlyRoi: string;
  workaroundExpense: string;
  commercialUrgency: string;
}

export function computeEconomicAssessment(idea: {
  category: string;
  title: string;
  demandScore: number;
  problem: { summary: string; whoFeelsIt: string };
  difficulty?: { estimatedHours: number; skillFloor: string };
}): EconomicAssessment {
  const cat = idea.category.toLowerCase();
  const summary = idea.problem.summary.toLowerCase();
  const who = idea.problem.whoFeelsIt;

  let baseSeverity = Math.min(96, Math.max(68, Math.round(idea.demandScore * 0.95 + 8)));
  let level: EconomicAssessment["level"] = "High";
  if (baseSeverity >= 85) level = "Critical";
  else if (baseSeverity <= 75) level = "Moderate";

  let buyerPersona = who;
  if (!buyerPersona || buyerPersona.length < 5) {
    buyerPersona = cat.includes("b2b") || cat.includes("api")
      ? "Technical Lead / Operations Manager"
      : cat.includes("chrome") || cat.includes("micro-saas")
      ? "Solo Founder / Freelancer"
      : "Knowledge Worker / Small Business Owner";
  }

  // Determine pricing architecture based on problem complexity and category
  let starter = "$19/mo";
  let pro = "$49/mo";
  let valueMetric = "per user / month";
  let workaroundExpense = "Paying $120–$250/mo for oversized platforms to access 1 sub-feature";
  let estimatedMonthlyRoi = "Saves 3–5 manual billable hours/mo ($180–$300 net value)";
  let commercialUrgency = "Immediate workflow bottleneck impacting team throughput";

  if (cat.includes("api") || cat.includes("data") || summary.includes("api") || summary.includes("sync")) {
    starter = "$29/mo";
    pro = "$89/mo";
    valueMetric = "per 10,000 requests";
    workaroundExpense = "Custom internal script maintenance costing $500+/mo in engineering overhead";
    estimatedMonthlyRoi = "Prevents pipeline failures & saves 6+ dev hours/mo (~$600 value)";
    commercialUrgency = "Data integrity and latency risk directly affecting client deliverables";
  } else if (cat.includes("chrome") || summary.includes("extension") || summary.includes("browser")) {
    starter = "$9/mo";
    pro = "$24/mo";
    valueMetric = "per seat";
    workaroundExpense = "Manual copy-pasting across tabs wasting 30 mins every day";
    estimatedMonthlyRoi = "Reclaims 10 hours/month of repetitive administrative toil";
    commercialUrgency = "Daily friction point causing frequent cognitive context switches";
  } else if (cat.includes("freelance") || summary.includes("invoice") || summary.includes("tax") || summary.includes("bookkeeper")) {
    starter = "$19/mo";
    pro = "$49/mo";
    valueMetric = "per active client / workspace";
    workaroundExpense = "Manual spreadsheet audits & penalties risk from late reconciliations";
    estimatedMonthlyRoi = "Saves 4–8 stressful hours at tax/quarterly reporting cycles";
    commercialUrgency = "Financial compliance and invoice leakage penalty avoidance";
  } else if (cat.includes("marketplace") || cat.includes("booking") || summary.includes("client")) {
    starter = "$24/mo";
    pro = "$69/mo";
    valueMetric = "per location / month";
    workaroundExpense = "Lost revenue from missed client bookings and no-shows ($400+/mo)";
    estimatedMonthlyRoi = "Recovers 2–4 bookings/mo, generating 5x–10x ROI immediately";
    commercialUrgency = "Direct revenue leakage occurring daily";
  }

  return {
    score: baseSeverity,
    level,
    buyerPersona,
    suggestedPricing: {
      starter,
      pro,
      valueMetric,
    },
    estimatedMonthlyRoi,
    workaroundExpense,
    commercialUrgency,
  };
}
