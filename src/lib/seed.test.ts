/**
 * Scenario tests against the real /seed files, after the timestamp shift. These pin
 * down what the demo shows so a rule change that breaks it is caught.
 */
import { describe, expect, it } from "vitest";
import {
  activeDaysInWindow,
  catalogFrom,
  courseRisk,
  learnerRisk,
  recommendNext,
  seedShiftMs,
  shift,
  type EnrollmentInfo,
} from "./rules";
import { DAY_MS } from "./rules/constants";
import { loadSeed } from "./seed-data";

const data = loadSeed();
const catalog = catalogFrom(data.courses);
const NOW = new Date("2026-11-17T21:19:00+05:30");
const all = [...data.enrollments.map((e) => new Date(e.enrolledAt)), ...data.progress.map((p) => new Date(p.lastActiveAt))];
const offset = seedShiftMs(all, NOW);

function learner(id: string) {
  const enrollments: EnrollmentInfo[] = data.enrollments
    .filter((e) => e.studentId === id)
    .map((e) => {
      const p = data.progress.find((x) => x.studentId === id && x.courseId === e.courseId)!;
      return {
        courseId: e.courseId,
        completedLessons: p.completedLessons,
        enrolledAt: shift(new Date(e.enrolledAt), offset),
        lastActivityAt: shift(new Date(p.lastActiveAt), offset),
      };
    });
  const goals = data.students.find((s) => s.id === id)!.goals;
  return { enrollments, goals, events: enrollments.map((e) => e.lastActivityAt!) };
}

describe("seed loading", () => {
  it("derives lesson totals from progress.json", () => {
    expect(catalog.get("c3")!.totalLessons).toBe(16);
    expect(data.students).toHaveLength(3);
  });

  it("assigns every student to exactly one center", () => {
    const ids = data.centers.memberships.map((m) => m.studentId).sort();
    expect(ids).toEqual(["s1", "s2", "s3"]);
  });
});

describe("seedShiftMs", () => {
  it("shifts by whole days so the latest timestamp lands in the 24h before now", () => {
    expect(offset % DAY_MS).toBe(0);
    const latest = Math.max(...all.map((t) => t.getTime())) + offset;
    expect(latest).toBeLessThanOrEqual(NOW.getTime());
    expect(NOW.getTime() - latest).toBeLessThan(DAY_MS);
  });

  it("is a no-op for empty input", () => {
    expect(seedShiftMs([], NOW)).toBe(0);
  });
});

describe("demo after shifting (realistic mix, not all at-risk)", () => {
  it("Aisha is on track, active 2 of the last 7 days", () => {
    const s = learner("s1");
    expect(activeDaysInWindow(s.events, NOW)).toBe(2);
    expect(learnerRisk(catalog, s.enrollments, null, NOW).atRisk).toBe(false);
    const statuses = s.enrollments.map((e) => courseRisk(e, catalog.get(e.courseId)!.totalLessons, NOW).status);
    expect(statuses).toEqual(["completed", "on-track", "on-track"]);
  });

  it("Rohan is at-risk on Building Dashboards", () => {
    const s = learner("s2");
    const r = learnerRisk(catalog, s.enrollments, null, NOW);
    expect(r.atRisk).toBe(true);
    expect(r.atRiskCourseIds).toEqual(["c5"]);
  });

  it("Priya is on track", () => {
    const s = learner("s3");
    expect(learnerRisk(catalog, s.enrollments, null, NOW).atRisk).toBe(false);
    expect(activeDaysInWindow(s.events, NOW)).toBe(1);
  });

  it("without the shift, everyone would look at-risk (the trap)", () => {
    for (const id of ["s1", "s2", "s3"]) {
      const s = learner(id);
      const unshifted = s.enrollments.map((e) => ({ ...e, lastActivityAt: shift(e.lastActivityAt!, -offset) }));
      expect(learnerRisk(catalog, unshifted, null, NOW).atRisk).toBe(true);
      expect(activeDaysInWindow(unshifted.map((e) => e.lastActivityAt!), NOW)).toBe(0);
    }
  });

  it("every seed learner gets a recommendation with a reason", () => {
    expect(recommendNext({ catalog, ...learner("s1") }).courseId).toBe("c3");
    expect(recommendNext({ catalog, ...learner("s2") }).courseId).toBe("c5");
    expect(recommendNext({ catalog, ...learner("s3") }).courseId).toBe("c6");
  });
});
