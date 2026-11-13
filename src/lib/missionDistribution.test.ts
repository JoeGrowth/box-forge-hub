import { describe, expect, it } from "bun:test";
import { countMissionDistributionPages, isMissionDistributionPage } from "./missionDistribution";

describe("countMissionDistributionPages", () => {
  it("counts only mission pages created from a model under the org's folders", () => {
    // Dizy has a single folder with exactly one mission distribution page.
    const dizyFolders = ["e0p4f3m"];
    const records = [
      { kind: "e0p4f3m:model-b2fbedee-8129-4904-9aa2-54a1d240eda4" },
      { kind: "event" },
      { kind: "consulting" },
      { kind: "e0p4f3m:taq4jzg" },
      { kind: "9qejrqc:model-aa0595f5-238a-4717-a45d-2219482729ff" },
      { kind: null },
    ];
    expect(countMissionDistributionPages(records, dizyFolders)).toBe(1);
  });

  it("sums mission pages across every folder of one organization", () => {
    const pengryFolders = ["ie2bxk0", "9qejrqc"];
    const records = [
      { kind: "ie2bxk0:model-797c6748-c1da-4b3f-b31d-7e57d55b16e1" },
      { kind: "9qejrqc:model-797c6748-c1da-4b3f-b31d-7e57d55b16e1" },
      { kind: "9qejrqc:model-905dbe27-717b-48e3-b576-fef8b4266ce1" },
      { kind: "9qejrqc:model-aa0595f5-238a-4717-a45d-2219482729ff" },
      { kind: "thlu2sq:7ffloa8" },
    ];
    expect(countMissionDistributionPages(records, pengryFolders)).toBe(3);
  });

  it("returns zero when the organization has no folders", () => {
    expect(
      countMissionDistributionPages([{ kind: "e0p4f3m:model-1" }], []),
    ).toBe(0);
  });

  it("rejects kinds without a model marker or without a folder", () => {
    expect(isMissionDistributionPage("e0p4f3m:model-1", ["e0p4f3m"])).toBe(true);
    expect(isMissionDistributionPage("e0p4f3m:", ["e0p4f3m"])).toBe(false);
    expect(isMissionDistributionPage("model-1", ["e0p4f3m"])).toBe(false);
    expect(isMissionDistributionPage("other:model-1", ["e0p4f3m"])).toBe(false);
  });
});
