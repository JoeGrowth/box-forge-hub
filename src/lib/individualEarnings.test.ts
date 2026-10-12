import { describe, expect, it } from "vitest";
import { calculateIndividualEarnings, type EarningsEntity, type EarningsMission } from "./individualEarnings";
const entities: EarningsEntity[] = [{ id: "e", name: "Pengry", organization_id: null, split_config: { recognitionPct: 30, partners: [{ id: "1", name: "Associé 1", pct: 70 }, { id: "2", name: "Associé 2", pct: 30 }] } }];
const mission = (id: string, budget: number): EarningsMission => ({ id, entity_id: "e", client: "Client", type: "consulting", budget, currency: "TND", created_at: "2026-10-01", internal: [], external: [] });
describe("individual declaration earnings", () => {
  it("matches Associé 2 statement Recognition and rounds to bank currency precision", () => {
    const result = calculateIndividualEarnings(entities, [mission("m", 3161.5)], [{ entity_id: "e", role_slug: "associe_2", label: "Associé 2", slot: 2 }], "u", "Youssef");
    expect(result.items[0].amount).toBe(284.54);
    expect(result.profit.e.TND).toBe(3161.5);
    expect(result.allocation.e).toBe(30);
  });
  it("uses the cumulative statement threshold, not a per-mission threshold", () => {
    const result = calculateIndividualEarnings(entities, [mission("a", 600), mission("b", 600)], [{ entity_id: "e", role_slug: "associe_2", label: null, slot: 2 }], "u", "User");
    expect(result.items[0].amount).toBe(108);
  });
  it("counts personal core-team and external payees, not gross entity budgets", () => {
    const m = mission("m", 5000);
    m.internal = [{ id: "a", name: "Process Handler", amount: 300 }];
    m.external = [{ id: "b", name: "Youssef", amount: 90 }, { id: "c", name: "Someone else", amount: 900 }];
    const result = calculateIndividualEarnings(entities, [m], [{ entity_id: "e", role_slug: "internal_process", label: "Internal 2 – Process Handler", slot: 4 }], "u", "Youssef");
    expect(result.items.map(i => [i.role, i.amount])).toEqual([["internal", 300], ["external", 90]]);
  });
  it("never assigns another user's explicit payee entry based on name", () => {
    const m = mission("m", 5000); m.external = [{ id: "a", user_id: "other", name: "Youssef", amount: 300 }];
    expect(calculateIndividualEarnings(entities, [m], [], "u", "Youssef").items).toEqual([]);
  });
});