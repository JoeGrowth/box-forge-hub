import { describe, it, expect } from "vitest";
import { computeStage, isArchived } from "./salesFunnel";

const all = (keys: string[]) => Object.fromEntries(keys.map((k) => [k, true]));
const LEAD = ["contact_identified", "need_expressed", "title_known"];
const MQL = ["meeting_held", "budget_range", "decision_timeline"];

describe("sales funnel", () => {
  it("starts in traffic", () => expect(computeStage({})).toBe("traffic"));
  it("2 of 3 checks stays traffic", () =>
    expect(computeStage(all(LEAD.slice(0, 2)))).toBe("traffic"));
  it("3 checks becomes lead", () => expect(computeStage(all(LEAD))).toBe("lead"));
  it("next gate needs previous gate", () => expect(computeStage(all(MQL))).toBe("traffic"));
  it("lead + mql checks becomes mql", () => expect(computeStage(all([...LEAD, ...MQL]))).toBe("mql"));
  it("no answer goes to archive", () => {
    expect(isArchived("no_answer")).toBe(true);
    expect(isArchived("in_negotiation")).toBe(false);
  });
});
