import { describe, it, expect } from "vitest";
import { missingFor, parseImport } from "./OrgPeopleTab";
describe("people layer rules", () => {
  it("database needs email or phone", () => {
    expect(missingFor("database", { email: "", phone: "", firstTouch: "" })).not.toBeNull();
    expect(missingFor("database", { email: "", phone: "+216 1", firstTouch: "" })).toBeNull();
  });
  it("friend needs both email and phone plus first touch", () => {
    expect(missingFor("friend", { email: "a@b.co", phone: "", firstTouch: "x" })).not.toBeNull();
    expect(missingFor("friend", { email: "a@b.co", phone: "1", firstTouch: "" })).not.toBeNull();
    expect(missingFor("friend", { email: "a@b.co", phone: "1", firstTouch: "x" })).toBeNull();
  });
  it("import skips rows without contact", () => {
    expect(parseImport("Imen H, imen@x.com\nNo Contact\nSami, +216 50 000 000")).toHaveLength(2);
  });
});
