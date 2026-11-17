import { describe, expect, it } from "vitest";
import { isEligible, lockedHint, missingPrerequisites } from "./eligibility";
import { earnedSkills, unearnedGoals } from "./skills";
import { course, enrollment, seedCatalog } from "./test-helpers";
import { catalogFrom } from "./types";

describe("earnedSkills", () => {
  it("earns a course's skills at >= 80%", () => {
    const skills = earnedSkills(seedCatalog, [enrollment("c1", 12), enrollment("c2", 10), enrollment("c3", 4)]);
    expect(skills).toEqual(["css", "frontend", "html", "javascript"]);
  });

  it("does not earn below the threshold", () => {
    expect(earnedSkills(seedCatalog, [enrollment("c4", 7)])).toEqual([]); // 70%
    expect(earnedSkills(seedCatalog, [enrollment("c4", 8)])).toEqual(["data", "sql"]);
  });

  it("de-duplicates skills taught by several courses", () => {
    const skills = earnedSkills(seedCatalog, [enrollment("c4", 10), enrollment("c5", 12)]);
    expect(skills).toEqual(["dashboards", "data", "sql"]);
  });

  it("ignores enrollments in unknown courses", () => {
    expect(earnedSkills(seedCatalog, [enrollment("zz", 5)])).toEqual([]);
  });

  it("returns nothing with no enrollments", () => {
    expect(earnedSkills(seedCatalog, [])).toEqual([]);
  });
});

describe("unearnedGoals", () => {
  it("keeps goal order", () => {
    expect(unearnedGoals(["react", "frontend", "sql"], ["frontend"])).toEqual(["react", "sql"]);
  });
});

describe("eligibility", () => {
  it("a course with no prerequisites is always eligible", () => {
    expect(isEligible("c1", seedCatalog, [])).toBe(true);
  });

  it("is ineligible when a prerequisite is not started", () => {
    expect(isEligible("c2", seedCatalog, [])).toBe(false);
  });

  it("is ineligible when a prerequisite is below the threshold", () => {
    expect(isEligible("c3", seedCatalog, [enrollment("c2", 9)])).toBe(false);
  });

  it("is eligible when the prerequisite is >= 80% (Aisha: c2 at 10/12 unlocks c3)", () => {
    expect(isEligible("c3", seedCatalog, [enrollment("c1", 12), enrollment("c2", 10)])).toBe(true);
  });

  it("requires ALL prerequisites", () => {
    const catalog = catalogFrom([
      course("a"),
      course("b"),
      course("x", { prerequisites: ["a", "b"] }),
    ]);
    expect(isEligible("x", catalog, [enrollment("a", 10)])).toBe(false);
    expect(isEligible("x", catalog, [enrollment("a", 10), enrollment("b", 8)])).toBe(true);
  });

  it("only checks direct prerequisites (transitive ones are implied by them)", () => {
    expect(isEligible("c3", seedCatalog, [enrollment("c2", 12)])).toBe(true);
  });

  it("throws on unknown courses", () => {
    expect(() => isEligible("nope", seedCatalog, [])).toThrow();
  });
});

describe("missingPrerequisites / lockedHint (why-locked)", () => {
  it("reports progress on each missing prerequisite", () => {
    const missing = missingPrerequisites("c3", seedCatalog, [enrollment("c2", 7)]);
    expect(missing).toEqual([
      {
        courseId: "c2",
        title: "JavaScript Essentials",
        enrolled: true,
        completedLessons: 7,
        totalLessons: 12,
        lessonsLeft: 3,
      },
    ]);
    expect(lockedHint(missing)).toBe("Finish JavaScript Essentials: 3 lessons left");
  });

  it("uses the singular for one lesson", () => {
    const missing = missingPrerequisites("c3", seedCatalog, [enrollment("c2", 9)]);
    expect(lockedHint(missing)).toBe("Finish JavaScript Essentials: 1 lesson left");
  });

  it("tells the learner to enroll when the prerequisite is not started", () => {
    const missing = missingPrerequisites("c5", seedCatalog, []);
    expect(lockedHint(missing)).toBe("Enroll in and finish SQL Fundamentals first");
  });

  it("returns null when nothing is missing", () => {
    expect(lockedHint(missingPrerequisites("c1", seedCatalog, []))).toBeNull();
  });
});
