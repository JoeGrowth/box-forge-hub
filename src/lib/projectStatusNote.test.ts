import { describe, expect, it } from "vitest";
import { buildStatusNote, daysBetween } from "./projectStatusNote";

describe("project status note", () => {
  it("uses the project's own delivery length", () => {
    expect(buildStatusNote({ productName: "Products Flipping", startDate: "2026-06-01", targetDate: "2026-06-20", budget: "1978" }))
      .toBe("Products Flipping · 19 days · Budget 1 978,00 TND");
  });

  it("falls back to the product's shipped-delivery span when the project has no dates", () => {
    expect(buildStatusNote({ productName: "Box4DigitalApps", deliverySpanDays: 45, budget: 2000 }))
      .toBe("Box4DigitalApps · 45 days · Budget 2 000,00 TND");
  });

  it("keeps a single delivery singular and omits an unknown length", () => {
    expect(buildStatusNote({ productName: "Zomita", startDate: "2026-07-04", targetDate: "2026-07-04", budget: "350" }))
      .toBe("Zomita · Budget 350,00 TND");
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
