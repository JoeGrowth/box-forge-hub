import { describe, expect, it } from "vitest";
import { activityPagePath } from "./activityLog";

describe("activity log privacy", () => {
  it("never records authentication screens", () => {
    expect(activityPagePath("/reset-password?token=private")).toBeNull();
    expect(activityPagePath("/auth")).toBeNull();
  });
  it("removes query strings and fragments", () => {
    expect(activityPagePath("/earnings?amount=42#receipt")).toBe("/earnings");
  });
  it("does not record private conversation identifiers", () => {
    expect(activityPagePath("/messages/private-conversation")).toBe("/messages");
    expect(activityPagePath("/chat/private-application")).toBe("/chat");
  });
  it("rejects non-local paths", () => {
    expect(activityPagePath("https://example.com")).toBeNull();
    expect(activityPagePath("//example.com")).toBeNull();
  });
});