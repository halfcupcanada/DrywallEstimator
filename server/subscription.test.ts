import { describe, expect, it } from "vitest";
import { PLANS, getPlan } from "./products";

describe("products", () => {
  it("has exactly 3 plans", () => {
    expect(PLANS).toHaveLength(3);
  });

  it("all plans have required fields", () => {
    for (const plan of PLANS) {
      expect(plan.slug).toBeTruthy();
      expect(plan.name).toBeTruthy();
      expect(plan.priceMonthlyCAD).toBeGreaterThan(0);
      expect(plan.stripePriceLookupKey).toBeTruthy();
      expect(plan.features.length).toBeGreaterThan(0);
    }
  });

  it("getPlan returns correct plan", () => {
    expect(getPlan("pro").name).toBe("Pro");
    expect(getPlan("starter").name).toBe("Starter");
    expect(getPlan("enterprise").name).toBe("Enterprise");
  });

  it("pro plan is highlighted", () => {
    expect(getPlan("pro").highlighted).toBe(true);
  });

  it("prices are in ascending order", () => {
    const prices = PLANS.map((p) => p.priceMonthlyCAD);
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThan(prices[i - 1]);
    }
  });
});
