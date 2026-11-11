import { describe, expect, it } from "vitest";
import { buildStatusNote, daysBetween } from "./projectStatusNote";

// Same money formatting the rest of the app uses (fr-FR, narrow no-break thousands separator).
const m = (n: number) => new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

describe("project status note", () => {
  it("uses the project's own delivery length", () => {
    expect(buildStatusNote({ productName: "Products Flipping", startDate: "2026-06-01", targetDate: "2026-06-20", budget: "1978" }))
      .toBe(`Products Flipping · 19 days · Budget ${m(1978)} TND`);
  });

  it("falls back to the product's shipped-delivery span when the project has no dates", () => {
    expect(buildStatusNote({ productName: "Box4DigitalApps", deliverySpanDays: 45, budget: 2000 }))
      .toBe(`Box4DigitalApps · 45 days · Budget ${m(2000)} TND`);
  });

  it("drops a zero-day length and keeps the budget", () => {
    expect(buildStatusNote({ productName: "Zomita", startDate: "2026-07-04", targetDate: "2026-07-04", budget: "350" }))
      .toBe(`Zomita · Budget ${m(350)} TND`);
  });

  it("leaves the field empty when nothing was delivered and no budget was entered", () => {
    expect(buildStatusNote({ budget: "" })).toBe("");
    expect(buildStatusNote({ productName: "Dizy", budget: "0" })).toBe("Dizy");
  });

  it("never reports a negative length", () => {
    expect(daysBetween("2026-06-20", "2026-06-01")).toBeNull();
    expect(daysBetween("2026-06-01", "2026-06-20")).toBe(19);
    expect(daysBetween("", "2026-06-20")).toBeNull();
  });
});
