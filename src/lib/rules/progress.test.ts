import { describe, expect, it } from "vitest";
import { COMPLETE_THRESHOLD_PCT } from "./constants";
import { isComplete, isFinished, lessonsToComplete, percentComplete } from "./progress";

describe("percentComplete", () => {
  it("derives percent from lessons", () => {
    expect(percentComplete(0, 12)).toBe(0);
    expect(percentComplete(6, 12)).toBe(50);
    expect(percentComplete(12, 12)).toBe(100);
  });

  it("rounds down so an unfinished course never shows 100%", () => {
    expect(percentComplete(10, 12)).toBe(83);
    expect(percentComplete(199, 200)).toBe(99);
  });

  it("clamps over-reported progress to 100", () => {
    expect(percentComplete(13, 12)).toBe(100);
  });

  it("rejects invalid input", () => {
    expect(() => percentComplete(1, 0)).toThrow(RangeError);
    expect(() => percentComplete(-1, 10)).toThrow(RangeError);
    expect(() => percentComplete(1.5, 10)).toThrow(RangeError);
  });
});

describe("isComplete (Option B: complete = earned threshold)", () => {
  it("uses the single 80% constant", () => {
    expect(COMPLETE_THRESHOLD_PCT).toBe(80);
  });

  it("is true exactly at the threshold without float error", () => {
    expect(isComplete(8, 10)).toBe(true);
    expect(isComplete(4, 5)).toBe(true);
    expect(isComplete(7, 10)).toBe(false);
  });

  it("treats 10/12 (83%) as complete, matching the seed", () => {
    expect(isComplete(10, 12)).toBe(true);
    expect(isComplete(9, 12)).toBe(false); // 75%
  });

  it("handles thresholds that are not whole lessons", () => {
    // 80% of 16 = 12.8, so 13 lessons are needed
    expect(isComplete(12, 16)).toBe(false);
    expect(isComplete(13, 16)).toBe(true);
  });
});

describe("isFinished", () => {
  it("requires every lesson", () => {
    expect(isFinished(11, 12)).toBe(false);
    expect(isFinished(12, 12)).toBe(true);
  });
});

describe("lessonsToComplete", () => {
  it("counts lessons left to reach the threshold", () => {
    expect(lessonsToComplete(0, 12)).toBe(10); // ceil(9.6)
    expect(lessonsToComplete(4, 16)).toBe(9); // 13 - 4
    expect(lessonsToComplete(10, 12)).toBe(0);
    expect(lessonsToComplete(12, 12)).toBe(0);
  });
});
