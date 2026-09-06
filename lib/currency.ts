export type Currency = "USD" | "INR";

export type PlanId =
  | "builder-monthly"
  | "builder-founding"
  | "builder-yearly"
  | "studio-monthly";

export interface FormattedPrice {
  primary: string;
  slash?: string;
  period: string;
  approx?: string;
  equivalentNote?: string;
  yearlyButtonText?: string;
}

/**
 * Resolves visitor currency from country code (e.g. from Vercel x-vercel-ip-country).
 * Returns "INR" for visitors in India, "USD" for all other international visitors.
 */
export function resolveCurrency(countryCode?: string | null): Currency {
  if (!countryCode) return "USD";
  return countryCode.trim().toUpperCase() === "IN" ? "INR" : "USD";
}

/**
 * Returns formatted pricing details for a given plan and currency.
 */
export function formatPlanPrice(plan: PlanId, currency: Currency): FormattedPrice {
  if (currency === "USD") {
    switch (plan) {
      case "builder-founding":
        return {
          primary: "$3.70",
          slash: "$4.80",
          period: "/mo",
          equivalentNote: "Billed as ₹310 INR via Razorpay",
        };
      case "builder-monthly":
        return {
          primary: "$4.80",
          period: "/mo",
          equivalentNote: "Billed as ₹399 INR via Razorpay",
        };
      case "builder-yearly":
        return {
          primary: "$42",
          period: "/yr",
          equivalentNote: "Billed as ₹3,499 INR via Razorpay",
          yearlyButtonText: "or $42/yr (save $15.60)",
        };
      case "studio-monthly":
        return {
          primary: "$12",
          period: "/mo",
          equivalentNote: "Billed as ₹999 INR via Razorpay",
        };
    }
  }

  // INR pricing
  switch (plan) {
    case "builder-founding":
      return {
        primary: "₹310",
        slash: "₹399",
        period: "/mo",
        approx: "(~$3.70 USD)",
      };
    case "builder-monthly":
      return {
        primary: "₹399",
        period: "/mo",
        approx: "(~$4.80 USD)",
      };
    case "builder-yearly":
      return {
        primary: "₹3,499",
        period: "/yr",
        yearlyButtonText: "or ₹3,499/yr (save ₹1,289)",
      };
    case "studio-monthly":
      return {
        primary: "₹999",
        period: "/mo",
        approx: "(~$12 USD)",
      };
  }
}