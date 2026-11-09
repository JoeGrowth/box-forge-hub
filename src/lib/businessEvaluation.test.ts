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
});