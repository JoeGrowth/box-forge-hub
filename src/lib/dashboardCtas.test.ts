import { describe, it, expect } from "vitest";
import { primaryCtaForGoal, secondaryCtaForIntent, ctasFor } from "./dashboardCtas";

describe("primaryCtaForGoal (current direction → green button)", () => {
  it("build_venture → Post an Idea routes to entrepreneurship creation flow", () => {
    const cta = primaryCtaForGoal("build_venture", null);
    expect(cta.label).toBe("Post an Idea");
    expect(cta.to).toBe("/entrepreneurship?new=1");
  });

  it("find_opportunities → Browse Opportunities", () => {
    expect(primaryCtaForGoal("find_opportunities", null).to).toBe("/opportunities");
  });

  it("monetize_expertise → Publish a Service", () => {
    expect(primaryCtaForGoal("monetize_expertise", null).to).toBe("/publish-consulting");
  });

  it("falls back to entrepreneur posting when role=entrepreneur and no goal", () => {
    expect(primaryCtaForGoal(null, "entrepreneur").to).toBe("/entrepreneurship?new=1");
  });
});

describe("secondaryCtaForIntent (Where are you today? → second button)", () => {
  it("Validated Expert → routes to advisors directory", () => {
    const cta = secondaryCtaForIntent("Validated Expert");
    expect(cta.label).toBe("Open Advisor Hub");
    expect(cta.to).toBe("/people?tab=advisors");
  });

  it("Builder → Find a Builder Mission", () => {
    expect(secondaryCtaForIntent("Builder").to).toBe("/opportunities?category=startup");
  });

  it("Co-Builder → cobuilders tab", () => {
    expect(secondaryCtaForIntent("Co-Builder").to).toBe("/people?tab=cobuilders");
  });

  it("Venture Creator → /entrepreneurship", () => {
    expect(secondaryCtaForIntent("Venture Creator").to).toBe("/entrepreneurship");
  });

  it("Professional Operator → /career", () => {
    expect(secondaryCtaForIntent("Professional Operator").to).toBe("/career");
  });

  it("Explorer → /opportunities", () => {
    expect(secondaryCtaForIntent("Explorer").to).toBe("/opportunities");
  });

  it("unknown intent falls back to /people", () => {
    expect(secondaryCtaForIntent(null).to).toBe("/people");
  });
});

describe("ctasFor — Keo's case (build_venture + Validated Expert)", () => {
  it("returns Post an Idea + Open Advisor Hub", () => {
    const { primary, secondary } = ctasFor("build_venture", "Validated Expert", null);
    expect(primary.label).toBe("Post an Idea");
    expect(primary.to).toBe("/entrepreneurship?new=1");
    expect(secondary.label).toBe("Open Advisor Hub");
    expect(secondary.to).toBe("/people?tab=advisors");
  });
});
