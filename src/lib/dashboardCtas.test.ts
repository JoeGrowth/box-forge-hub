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
  it("Validated Expert → label reflects answer and routes to /advisory", () => {
    const cta = secondaryCtaForIntent("Validated Expert");
    expect(cta.label).toBe("Activate Validated Expert");
    expect(cta.to).toBe("/advisory");
  });

  it("Builder → Unlock your Entrepreneurial Track → /entrepreneurial-track", () => {
    const cta = secondaryCtaForIntent("Builder");
    expect(cta.label).toBe("Unlock your Entrepreneurial Track");
    expect(cta.to).toBe("/entrepreneurial-track");
  });

  it("Co-Builder → label reflects answer and routes to startup missions", () => {
    const cta = secondaryCtaForIntent("Co-Builder");
    expect(cta.label).toBe("Continue as Co-Builder");
    expect(cta.to).toBe("/opportunities?category=startup");
  });

  it("Venture Creator → /entrepreneurship", () => {
    const cta = secondaryCtaForIntent("Venture Creator");
    expect(cta.label).toBe("Continue as Venture Creator");
    expect(cta.to).toBe("/entrepreneurship");
  });

  it("Professional Operator → /career", () => {
    const cta = secondaryCtaForIntent("Professional Operator");
    expect(cta.label).toBe("Continue as Professional Operator");
    expect(cta.to).toBe("/career");
  });

  it("Explorer → /opportunities", () => {
    const cta = secondaryCtaForIntent("Explorer");
    expect(cta.label).toBe("Continue as Explorer");
    expect(cta.to).toBe("/opportunities");
  });

  it("unknown intent falls back to /people", () => {
    expect(secondaryCtaForIntent(null).to).toBe("/people");
  });
});

describe("ctasFor — Keo's case (build_venture + Validated Expert)", () => {
  it("primary green = Post an Idea → /entrepreneurship?new=1", () => {
    const { primary } = ctasFor("build_venture", "Validated Expert", null);
    expect(primary.label).toBe("Post an Idea");
    expect(primary.to).toBe("/entrepreneurship?new=1");
  });

  it("secondary = Activate Validated Expert → /advisory", () => {
    const { secondary } = ctasFor("build_venture", "Validated Expert", null);
    expect(secondary.label).toBe("Activate Validated Expert");
    expect(secondary.to).toBe("/advisory");
  });
});

