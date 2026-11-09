import { describe, expect, it } from "vitest";
import { beneficiaryAmount, evaluationOrganizations, evaluationStorageKey, initialEvaluation, profitFor } from "./businessEvaluation";
describe("business evaluation", () => {
  it("only offers organizations present in the person's memberships", () => {
    expect(evaluationOrganizations([{ organization: { id: "pengry" } }, { organization: { id: "dizy" } }, { organization: { id: "pengry" } }])).toEqual([{ id: "pengry" }, { id: "dizy" }]);
    expect(evaluationOrganizations([])).toEqual([]);
  });
  it("calculates Pengry's entered profit without changing declaration earnings", () => {
    expect(profitFor("12400.00", "12293.50")).toBe(106.5);
    expect(beneficiaryAmount(106.5, "21")).toBe(22.37);
    expect(beneficiaryAmount(106.5, "9")).toBe(9.59);
    expect(beneficiaryAmount(106.5, "28")).toBe(29.82);
    expect(beneficiaryAmount(106.5, "42")).toBe(44.73);
  });
  it("does not seed Pengry answers into another organization", () => {
    expect(initialEvaluation("Dizy", "dizy").turnover).toBe("");
    expect(initialEvaluation("Pengry", "pengry").turnover).toBe("12400.00");
  });
  it("isolates saved answers by both user and organization", () => {
    expect(evaluationStorageKey("u1", "pengry")).not.toBe(evaluationStorageKey("u2", "pengry"));
    expect(evaluationStorageKey("u1", "pengry")).not.toBe(evaluationStorageKey("u1", "dizy"));
  });
});import { productMaturity, statementSummary, supposedLeader, teamSizeFrom } from "./businessEvaluation";
describe("business evaluation automatic figures", () => {
  it("counts Pengry team once per full name: 2 associés + 4 other crew = 6", () => {
    expect(teamSizeFrom(["Houssem Kaabi", "youssef ben younes", "Houssem Kaabi", "youssef ben younes", "Houssem kaabi", "Youssef Ben Younes", "Youssef Omri", "Bader", "Hamza Yacoub", "Aziz"])).toBe(6);
  });
  it("labels associé 1 as supposed leader", () => expect(supposedLeader("Houssem Kaabi")).toBe("Houssem (supposed)"));
  it("flags 2 shipped as expanding and 3+ as diversification risk", () => {
    expect(productMaturity(1)).toBeNull();
    expect(productMaturity(2)?.tone).toBe("yellow");
    expect(productMaturity(3)?.tone).toBe("red");
  });
  it("splits recognition 70/30 of 30% into 21% and 9%", () => {
    const s = statementSummary({ id: "e", name: "P", split_config: { recognitionPct: 30, infraPct: 40, partners: [{ id: "1", name: "A1", pct: 70 }, { id: "2", name: "A2", pct: 30 }] } },
      [{ entity_id: "e", budget: 1000, currency: "TND", internal: [{ amount: 600 }], external: [] }, { entity_id: "e", budget: 500, currency: "EUR", internal: [], external: [] }], "TND", ["Houssem Kaabi"]);
    expect(s).toMatchObject({ turnover: 1000, charges: 600, profit: 400 });
    expect(s.rows.map(r => [r.name, r.pct, r.amount])).toEqual([["Houssem Kaabi", 21, 84], ["A2", 9, 36], ["Infrastructure", 28, 112], ["Business Launching", 42, 168]]);
  });
});
