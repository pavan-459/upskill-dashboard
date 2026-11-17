import { describe, expect, it } from "vitest";
import { recommendNext, unlockCount } from "./recommend";
import { course, enrollment, seedCatalog } from "./test-helpers";
import { catalogFrom } from "./types";

describe("unlockCount", () => {
  it("counts direct dependants", () => {
    expect(unlockCount("c1", seedCatalog)).toBe(1);
    expect(unlockCount("c3", seedCatalog)).toBe(0);
  });
});

describe("recommendNext: branch 1 (eligible, unenrolled, teaches an unearned goal)", () => {
  it("picks an eligible course for an unearned goal", () => {
    const r = recommendNext({ catalog: seedCatalog, goals: ["sql"], enrollments: [] });
    expect(r).toMatchObject({ kind: "enroll-goal", courseId: "c4", canEnroll: true, goalSkills: ["sql"] });
    expect(r.reason).toBe("Start SQL Fundamentals: it teaches sql, your goal.");
  });

  it("prefers the course covering the most unearned goals", () => {
    const r = recommendNext({ catalog: seedCatalog, goals: ["html", "css", "sql"], enrollments: [] });
    expect(r.courseId).toBe("c1");
    expect(r.reason).toBe("Start Web Foundations: it teaches html and css, your goals.");
  });

  it("breaks ties by number of courses unlocked, then id", () => {
    // c4 (unlocks c5) beats c6 (unlocks nothing) for a goal both teach.
    const catalog = catalogFrom([
      course("c4", { skills: ["data"] }),
      course("c5", { prerequisites: ["c4"] }),
      course("c6", { skills: ["data"] }),
    ]);
    expect(recommendNext({ catalog, goals: ["data"], enrollments: [] }).courseId).toBe("c4");
    const flat = catalogFrom([course("b", { skills: ["x"] }), course("a", { skills: ["x"] })]);
    expect(recommendNext({ catalog: flat, goals: ["x"], enrollments: [] }).courseId).toBe("a");
  });

  it("skips locked courses even if they teach the goal", () => {
    // react is only taught by c3, which needs c2.
    const r = recommendNext({ catalog: seedCatalog, goals: ["react"], enrollments: [enrollment("c1", 12)] });
    expect(r.kind).not.toBe("enroll-goal");
    expect(r.courseId).not.toBe("c3");
  });
});

describe("recommendNext: branch 2 (finish an enrolled course)", () => {
  it("Aisha (seed): finish React Basics", () => {
    const r = recommendNext({
      catalog: seedCatalog,
      goals: ["react", "frontend"],
      enrollments: [enrollment("c1", 12), enrollment("c2", 10), enrollment("c3", 4)],
    });
    expect(r).toMatchObject({ kind: "finish-enrolled", courseId: "c3", canEnroll: false, goalSkills: ["react"] });
    expect(r.reason).toBe("Finish React Basics: it is the course that teaches react, your goal.");
  });

  it("Rohan (seed): finish Building Dashboards", () => {
    const r = recommendNext({
      catalog: seedCatalog,
      goals: ["sql", "dashboards"],
      enrollments: [enrollment("c4", 10), enrollment("c5", 3)],
    });
    expect(r).toMatchObject({ kind: "finish-enrolled", courseId: "c5" });
  });

  it("Priya (seed): finish User Research 101 (both goals)", () => {
    const r = recommendNext({
      catalog: seedCatalog,
      goals: ["product", "user-research"],
      enrollments: [enrollment("c6", 5)],
    });
    expect(r).toMatchObject({ kind: "finish-enrolled", courseId: "c6", goalSkills: ["user-research", "product"] });
    expect(r.reason).toBe("Finish User Research 101: it is the course that teaches user-research and product, your goals.");
  });

  it("picks the enrolled course teaching the MOST unearned goals", () => {
    const catalog = catalogFrom([course("a", { skills: ["x"] }), course("b", { skills: ["x", "y"] })]);
    const r = recommendNext({ catalog, goals: ["x", "y"], enrollments: [enrollment("a", 1), enrollment("b", 1)] });
    expect(r.courseId).toBe("b");
  });

  it("ignores finished courses and courses whose goals are already earned", () => {
    const catalog = catalogFrom([course("a", { skills: ["x"] }), course("b", { skills: ["x"] }), course("c")]);
    // a is finished (x earned), so b no longer teaches an UNEARNED goal.
    const r = recommendNext({ catalog, goals: ["x"], enrollments: [enrollment("a", 10), enrollment("b", 1)] });
    expect(r.kind).not.toBe("finish-enrolled");
  });
});

describe("recommendNext: branch 3 (unlocks the most courses)", () => {
  it("falls back to the course that unlocks the most", () => {
    const r = recommendNext({ catalog: seedCatalog, goals: [], enrollments: [] });
    // c1 and c4 each unlock 1; tie broken by id.
    expect(r).toMatchObject({ kind: "enroll-unlocks", courseId: "c1", canEnroll: true });
    expect(r.reason).toBe("Start Web Foundations: it unlocks 1 more course.");
  });

  it("counts multiple dependants", () => {
    const catalog = catalogFrom([
      course("a"),
      course("hub"),
      course("x", { prerequisites: ["hub"] }),
      course("y", { prerequisites: ["hub"] }),
      course("z", { prerequisites: ["a"] }),
    ]);
    const r = recommendNext({ catalog, goals: [], enrollments: [] });
    expect(r.courseId).toBe("hub");
    expect(r.reason).toBe("Start Course hub: it unlocks 2 more courses.");
  });

  it("is used when goals are all earned", () => {
    const r = recommendNext({ catalog: seedCatalog, goals: ["sql"], enrollments: [enrollment("c4", 10)] });
    expect(r).toMatchObject({ kind: "enroll-unlocks", courseId: "c1" });
  });
});

describe("recommendNext: branch 4 (nothing applies)", () => {
  it("explains when every course is enrolled", () => {
    const catalog = catalogFrom([course("a")]);
    const r = recommendNext({ catalog, goals: [], enrollments: [enrollment("a", 10)] });
    expect(r).toMatchObject({ kind: "none", courseId: null, canEnroll: false });
    expect(r.reason).toMatch(/every course/);
  });

  it("explains when nothing is unlocked yet", () => {
    const catalog = catalogFrom([course("a"), course("b", { prerequisites: ["a"] })]);
    const r = recommendNext({ catalog, goals: [], enrollments: [enrollment("a", 2)] });
    expect(r.kind).toBe("none");
    expect(r.reason).toMatch(/unlocked/);
  });

  it("explains when no available course teaches the goal", () => {
    const catalog = catalogFrom([course("a"), course("b")]);
    const r = recommendNext({ catalog, goals: ["rust"], enrollments: [] });
    expect(r.kind).toBe("none");
    expect(r.reason).toBe("No available course teaches rust yet.");
  });

  it("explains when all goals are earned", () => {
    const catalog = catalogFrom([course("a", { skills: ["x"] }), course("b")]);
    const r = recommendNext({ catalog, goals: ["x"], enrollments: [enrollment("a", 10)] });
    expect(r.kind).toBe("none");
    expect(r.reason).toMatch(/All goal skills are earned/);
  });

  it("asks for a goal when there are none", () => {
    const catalog = catalogFrom([course("a"), course("b")]);
    const r = recommendNext({ catalog, goals: [], enrollments: [] });
    expect(r.reason).toMatch(/No goals set/);
  });

  it("handles an empty catalog", () => {
    const r = recommendNext({ catalog: catalogFrom([]), goals: ["x"], enrollments: [] });
    expect(r.kind).toBe("none");
    expect(r.reason.length).toBeGreaterThan(0);
  });
});
