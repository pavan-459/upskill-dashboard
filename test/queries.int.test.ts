/**
 * Integration tests against a real Postgres (upskill_test). They cover what the
 * pure rule tests cannot: coach scoping, server-side enroll checks, DB constraints
 * and the move flow.
 */
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import {
  enroll,
  getStudentDashboard,
  learnersVisibleToCoach,
  listStudents,
  moveLearner,
} from "@/lib/queries";
import { seedDatabase } from "@/lib/seed-db";

const NOW = new Date("2026-11-18T21:30:00+05:30");
const LATER = new Date(NOW.getTime() + 60_000);

beforeEach(async () => {
  await seedDatabase(prisma, NOW);
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function expectAppError(p: Promise<unknown>, status: number, reason?: RegExp | string) {
  const err = await p.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(AppError);
  expect((err as AppError).status).toBe(status);
  if (reason) expect((err as AppError).message).toMatch(reason);
}

describe("students", () => {
  it("lists every learner with their current center", async () => {
    const list = await listStudents();
    expect(list.map((s) => [s.id, s.centerName])).toEqual([
      ["s1", "Center A (Hyderabad)"],
      ["s3", "Center B (Bengaluru)"],
      ["s2", "Center A (Hyderabad)"],
    ]);
  });

  it("builds Aisha's dashboard from the database", async () => {
    const d = await getStudentDashboard("s1", NOW);
    expect(d.learner).toMatchObject({ name: "Aisha Rahman", centerName: "Center A (Hyderabad)" });
    expect(d.goals).toEqual([
      { skill: "frontend", earned: true },
      { skill: "react", earned: false },
    ]);
    expect(d.earnedSkills).toEqual(["css", "frontend", "html", "javascript"]);
    expect(d.activeDays7).toBe(2);
    expect(d.activityStrip.filter((x) => x.active)).toHaveLength(2);
    expect(d.courses.map((c) => [c.courseId, c.percent, c.status])).toEqual([
      ["c3", 25, "on-track"],
      ["c2", 83, "on-track"],
      ["c1", 100, "completed"],
    ]);
    expect(d.recommendation).toMatchObject({ kind: "finish-enrolled", courseId: "c3", courseTitle: "React Basics" });
    expect(d.alternative).toMatchObject({ courseId: "c4", canEnroll: true });
    expect(d.locked.map((l) => [l.courseId, l.hint])).toEqual([
      ["c5", "Enroll in and finish SQL Fundamentals first"],
    ]);
  });

  it("puts at-risk courses first (Rohan)", async () => {
    const d = await getStudentDashboard("s2", NOW);
    expect(d.courses[0]).toMatchObject({ courseId: "c5", status: "at-risk", daysInactive: 7 });
  });

  it("404s an unknown student", async () => {
    await expectAppError(getStudentDashboard("nope", NOW), 404);
  });
});

describe("enroll", () => {
  it("creates the enrollment and an activity event, and the recommendation moves on", async () => {
    await enroll("s1", "c4", LATER);
    const d = await getStudentDashboard("s1", LATER);
    expect(d.courses.find((c) => c.courseId === "c4")).toMatchObject({ percent: 0, status: "on-track" });
    expect(d.alternative?.courseId).not.toBe("c4");
    // c5 is still locked, but the hint now says how far along c4 is.
    expect(d.locked.find((l) => l.courseId === "c5")?.hint).toBe("Finish SQL Fundamentals: 8 lessons left");
    const events = await prisma.activityEvent.count({ where: { learnerId: "s1", courseId: "c4", kind: "ENROLLED" } });
    expect(events).toBe(1);
  });

  it("returns 409 when already enrolled", async () => {
    await expectAppError(enroll("s1", "c1", LATER), 409, /Already enrolled/);
  });

  it("returns 400 with the why-locked reason when ineligible", async () => {
    await expectAppError(enroll("s1", "c5", LATER), 400, "Enroll in and finish SQL Fundamentals first");
    await expectAppError(enroll("s3", "c3", LATER), 400, "Enroll in and finish JavaScript Essentials first");
  });

  it("returns 404 for unknown learner or course", async () => {
    await expectAppError(enroll("nope", "c1", LATER), 404, /Student/);
    await expectAppError(enroll("s1", "nope", LATER), 404, /Course/);
  });

  it("lets only one of two concurrent enrolls win", async () => {
    const results = await Promise.allSettled([enroll("s3", "c4", LATER), enroll("s3", "c4", LATER)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect((rejected.reason as AppError).status).toBe(409);
    expect(await prisma.enrollment.count({ where: { learnerId: "s3", courseId: "c4" } })).toBe(1);
  });
});

describe("coach scoping", () => {
  it("coach A sees only Center A learners, at-risk first", async () => {
    const r = await learnersVisibleToCoach("coach-a", NOW);
    expect(r.coach.centerName).toBe("Center A (Hyderabad)");
    expect(r.learners.map((l) => l.id)).toEqual(["s2", "s1"]);
    expect(r.atRiskCount).toBe(1);
    expect(r.learners[0]).toMatchObject({ atRisk: true, reason: "No activity for 7 days · stalled on Building Dashboards" });
  });

  it("coach B sees only Center B learners", async () => {
    const r = await learnersVisibleToCoach("coach-b", NOW);
    expect(r.learners.map((l) => l.id)).toEqual(["s3"]);
    expect(r.atRiskCount).toBe(0);
  });

  it("404s an unknown coach", async () => {
    await expectAppError(learnersVisibleToCoach("nope", NOW), 404);
  });
});

describe("move learner", () => {
  it("moves Priya to Center A: visibility flips, history kept, progress follows", async () => {
    const before = await prisma.enrollment.findMany({ where: { learnerId: "s3" } });
    const result = await moveLearner("s3", "center-a", LATER, "coach-b");
    expect(result).toMatchObject({ from: { id: "center-b" }, to: { id: "center-a" } });

    expect((await learnersVisibleToCoach("coach-a", LATER)).learners.map((l) => l.id)).toContain("s3");
    expect((await learnersVisibleToCoach("coach-b", LATER)).learners).toHaveLength(0);

    const history = await prisma.learnerCenterMembership.findMany({
      where: { learnerId: "s3" },
      orderBy: { startedAt: "asc" },
    });
    expect(history.map((m) => [m.centerId, m.endedAt === null])).toEqual([
      ["center-b", false],
      ["center-a", true],
    ]);
    expect(await prisma.enrollment.findMany({ where: { learnerId: "s3" } })).toEqual(before);
  });

  it("rejects a move to the current center (409)", async () => {
    await expectAppError(moveLearner("s1", "center-a", LATER), 409, /already at/);
  });

  it("stops a coach moving a learner from another center (403)", async () => {
    await expectAppError(moveLearner("s3", "center-a", LATER, "coach-a"), 403);
  });

  it("404s unknown learner, center or coach", async () => {
    await expectAppError(moveLearner("nope", "center-a", LATER), 404);
    await expectAppError(moveLearner("s1", "nope", LATER), 404);
    await expectAppError(moveLearner("s1", "center-b", LATER, "nope"), 404);
  });

  it("the database refuses a second open membership", async () => {
    await expect(
      prisma.learnerCenterMembership.create({ data: { learnerId: "s1", centerId: "center-b", startedAt: LATER } }),
    ).rejects.toMatchObject({ code: "P2002" });
  });
});
