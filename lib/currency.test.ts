import { describe, it, expect } from "vitest";
import { resolveCurrency, formatPlanPrice, type Currency } from "./currency";

describe("resolveCurrency", () => {
  it("resolves INR for Indian visitor IP country code", () => {
    expect(resolveCurrency("IN")).toBe("INR");
    expect(resolveCurrency("in")).toBe("INR");
  });

  it("resolves USD for US, UK, EU and other international countries", () => {
    expect(resolveCurrency("US")).toBe("USD");
    expect(resolveCurrency("GB")).toBe("USD");
    expect(resolveCurrency("DE")).toBe("USD");
    expect(resolveCurrency("CA")).toBe("USD");
    expect(resolveCurrency("AU")).toBe("USD");
    expect(resolveCurrency("SG")).toBe("USD");
  });

  it("defaults to USD when country header is missing or null", () => {
    expect(resolveCurrency(null)).toBe("USD");
    expect(resolveCurrency(undefined)).toBe("USD");
    expect(resolveCurrency("")).toBe("USD");
  });
});

describe("formatPlanPrice", () => {
  it("formats Builder Monthly correctly in USD and INR", () => {
    const usd = formatPlanPrice("builder-monthly", "USD");
    expect(usd.primary).toBe("$4.80");
    expect(usd.period).toBe("/mo");
    expect(usd.equivalentNote).toBe("Billed as ₹399 INR via Razorpay");

    const inr = formatPlanPrice("builder-monthly", "INR");
    expect(inr.primary).toBe("₹399");
    expect(inr.period).toBe("/mo");
    expect(inr.approx).toBe("(~$4.80 USD)");
  });

  it("formats Builder Founding correctly in USD and INR", () => {
    const usd = formatPlanPrice("builder-founding", "USD");
    expect(usd.primary).toBe("$3.70");
    expect(usd.slash).toBe("$4.80");
    expect(usd.period).toBe("/mo");

    const inr = formatPlanPrice("builder-founding", "INR");
    expect(inr.primary).toBe("₹310");
    expect(inr.slash).toBe("₹399");
    expect(inr.period).toBe("/mo");
  });

  it("formats Studio Monthly correctly in USD and INR", () => {
    const usd = formatPlanPrice("studio-monthly", "USD");
    expect(usd.primary).toBe("$12");
    expect(usd.period).toBe("/mo");

    const inr = formatPlanPrice("studio-monthly", "INR");
    expect(inr.primary).toBe("₹999");
    expect(inr.period).toBe("/mo");
    expect(inr.approx).toBe("(~$12 USD)");
  });

  it("formats Builder Yearly correctly", () => {
    const usd = formatPlanPrice("builder-yearly", "USD");
    expect(usd.yearlyButtonText).toBe("or $42/yr (save $15.60)");

    const inr = formatPlanPrice("builder-yearly", "INR");
    expect(inr.yearlyButtonText).toBe("or ₹3,499/yr (save ₹1,289)");
  });
});