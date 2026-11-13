import { describe, it, expect } from "vitest";
import {
  progressForCompleted,
  completedFromProgress,
  currentStep,
  isCoreProjectTrack,
  projectGroup,
} from "./projectLifecycle";

describe("project lifecycle", () => {
  it("cumulative weights 10/10/20/10/20/30", () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(progressForCompleted)).toEqual([0, 10, 20, 40, 50, 70, 100]);
  });
  it("five steps done puts project in Earnings at 70%", () => {
    expect(completedFromProgress(70)).toBe(5);
    expect(currentStep(70)).toBe(6);
  });
  it("99% still sits in Earnings", () => {
    expect(currentStep(99)).toBe(6);
  });
  it("100% has no current step", () => {
    expect(currentStep(100)).toBeNull();
  });
});
