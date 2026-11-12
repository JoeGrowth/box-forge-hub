import { describe, it, expect } from "vitest";
import { researchLinks, normalizeContent } from "./marketingIntelligence";

describe("researchLinks", () => {
  it("digital products use Google, Product Hunt, G2, Capterra", () => {
    const labels = researchLinks("digital_product", "CMS").map((l) => l.label);
    expect(labels.slice(0, 4)).toEqual(["Google Search", "Product Hunt", "G2", "Capterra"]);
  });
  it("services use Google, Eventbrite, Coursera, Udemy, LinkedIn", () => {
    const labels = researchLinks("service", "Workshop").map((l) => l.label);
    expect(labels.slice(0, 5)).toEqual(["Google Search", "Eventbrite", "Coursera", "Udemy", "LinkedIn"]);
  });
  it("links are rebuilt from the page name", () => {
    expect(researchLinks("service", "Digital Security")[0].url).toContain("Digital%20Security");
  });
});

describe("normalizeContent", () => {
  it("defaults validation status to To confirm", () => {
    expect(normalizeContent({ validation: [{ angle: "A" }] }).validation[0].status).toBe("To confirm");
  });
});
