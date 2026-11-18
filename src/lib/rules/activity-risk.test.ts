import { describe, expect, it } from "vitest";
import { activeDaysInWindow, activityStrip, calendarDateKey, daysSince, latest } from "./activity";
import { courseRisk, learnerRisk } from "./risk";
import { enrollment, hoursBefore, seedCatalog } from "./test-helpers";

const NOW = new Date("2026-11-17T12:00:00+05:30");
const ist = (s: string) => new Date(`${s}+05:30`);

describe("calendarDateKey", () => {
  it("uses Asia/Kolkata calendar dates, not UTC", () => {
    // 00:30 IST on the 11th is still the 10th in UTC.
    expect(calendarDateKey(ist("2026-11-11T00:30:00"))).toBe("2026-11-11");
    expect(new Date(ist("2026-11-11T00:30:00")).toISOString().slice(0, 10)).toBe("2026-11-10");
  });
});

describe("activeDaysInWindow", () => {
  it("counts distinct calendar dates, not events", () => {
    const events = [ist("2026-11-17T09:00:00"), ist("2026-11-17T10:00:00"), ist("2026-11-16T20:00:00")];
    expect(activeDaysInWindow(events, NOW)).toBe(2);
  });

  it("window is today plus the 6 previous dates (IST)", () => {
    expect(activeDaysInWindow([ist("2026-11-11T00:30:00")], NOW)).toBe(1); // first day in window
    expect(activeDaysInWindow([ist("2026-11-10T23:59:00")], NOW)).toBe(0); // just outside
  });

  it("caps at 7", () => {
    const events = Array.from({ length: 10 }, (_, i) => hoursBefore(NOW, i * 24));
    expect(activeDaysInWindow(events, NOW)).toBe(7);
  });

  it("ignores future events", () => {
    expect(activeDaysInWindow([ist("2026-11-17T13:00:00")], NOW)).toBe(0);
  });

  it("is 0 with no events", () => {
    expect(activeDaysInWindow([], NOW)).toBe(0);
  });
});

describe("daysSince / latest", () => {
  it("floors whole days", () => {
    expect(daysSince(hoursBefore(NOW, 47), NOW)).toBe(1);
    expect(daysSince(hoursBefore(NOW, 48), NOW)).toBe(2);
    expect(daysSince(null, NOW)).toBeNull();
  });

  it("picks the latest non-null time", () => {
    expect(latest([null, ist("2026-11-01T00:00:00"), ist("2026-11-03T00:00:00"), undefined])).toEqual(
      ist("2026-11-03T00:00:00"),
    );
    expect(latest([])).toBeNull();
  });
});

describe("courseRisk", () => {
  it("is on-track with recent activity", () => {
    const r = courseRisk(enrollment("c3", 4, { lastActivityAt: hoursBefore(NOW, 30) }), 16, NOW);
    expect(r.status).toBe("on-track");
    expect(r.daysInactive).toBe(1);
  });

  it("is at-risk after MORE than 3 days", () => {
    expect(courseRisk(enrollment("c3", 4, { lastActivityAt: hoursBefore(NOW, 72) }), 16, NOW).status).toBe(
      "on-track",
    );
    expect(courseRisk(enrollment("c3", 4, { lastActivityAt: hoursBefore(NOW, 73) }), 16, NOW).status).toBe(
      "at-risk",
    );
  });

  it("a finished course is never at-risk", () => {
    const r = courseRisk(enrollment("c1", 12, { lastActivityAt: hoursBefore(NOW, 24 * 60) }), 12, NOW);
    expect(r.status).toBe("completed");
  });

  it("a course at >= 80% but not 100% can still be at-risk", () => {
    const r = courseRisk(enrollment("c2", 10, { lastActivityAt: hoursBefore(NOW, 24 * 5) }), 12, NOW);
    expect(r.status).toBe("at-risk");
  });

  it("falls back to enrollment time when there is no activity", () => {
    const fresh = courseRisk(enrollment("c4", 0, { enrolledAt: hoursBefore(NOW, 2) }), 10, NOW);
    expect(fresh.status).toBe("on-track");
    const stale = courseRisk(enrollment("c4", 0, { enrolledAt: hoursBefore(NOW, 24 * 4) }), 10, NOW);
    expect(stale.status).toBe("at-risk");
  });
});

describe("learnerRisk", () => {
  it("is on-track when every active course is on-track", () => {
    const enrollments = [enrollment("c1", 12, { lastActivityAt: hoursBefore(NOW, 24 * 60) }), enrollment("c2", 5, { lastActivityAt: hoursBefore(NOW, 5) })];
    const r = learnerRisk(seedCatalog, enrollments, null, NOW);
    expect(r.atRisk).toBe(false);
    expect(r.reason).toBe("Active recently");
    expect(r.daysInactive).toBe(0);
  });

  it("is at-risk when any unfinished course is at-risk, even if active elsewhere", () => {
    const enrollments = [
      enrollment("c4", 10, { lastActivityAt: hoursBefore(NOW, 24 * 40) }),
      enrollment("c5", 3, { lastActivityAt: hoursBefore(NOW, 24 * 7) }),
      enrollment("c6", 3, { lastActivityAt: hoursBefore(NOW, 2) }),
    ];
    const r = learnerRisk(seedCatalog, enrollments, null, NOW);
    expect(r.atRisk).toBe(true);
    expect(r.atRiskCourseIds).toEqual(["c5"]);
    expect(r.reason).toBe("Stalled on Building Dashboards");
  });

  it("is at-risk with no activity at all for more than 3 days (only finished courses)", () => {
    const r = learnerRisk(seedCatalog, [enrollment("c1", 12, { lastActivityAt: hoursBefore(NOW, 24 * 5) })], null, NOW);
    expect(r.atRisk).toBe(true);
    expect(r.atRiskCourseIds).toEqual([]);
    expect(r.reason).toBe("No activity for 5 days");
  });

  it("is at-risk with no enrollments and no activity", () => {
    const r = learnerRisk(seedCatalog, [], null, NOW);
    expect(r).toMatchObject({ atRisk: true, daysInactive: null, reason: "No activity recorded yet" });
  });

  it("uses the learner-wide last activity when newer than course activity", () => {
    const r = learnerRisk(seedCatalog, [], hoursBefore(NOW, 3), NOW);
    expect(r.atRisk).toBe(false);
  });
});

describe("learnerRisk reason when idle everywhere AND stalled", () => {
  it("names the stalled course too", () => {
    const r = learnerRisk(seedCatalog, [enrollment("c5", 3, { lastActivityAt: hoursBefore(NOW, 24 * 7) })], null, NOW);
    expect(r.reason).toBe("No activity for 7 days · stalled on Building Dashboards");
  });
});

describe("activityStrip", () => {
  it("lists the 7 window dates oldest first, flagging active ones", () => {
    const strip = activityStrip([ist("2026-11-17T09:00:00"), ist("2026-11-11T00:30:00")], NOW);
    expect(strip).toHaveLength(7);
    expect(strip[0]).toEqual({ date: "2026-11-11", active: true });
    expect(strip[6]).toEqual({ date: "2026-11-17", active: true });
    expect(strip.filter((d) => d.active)).toHaveLength(2);
  });
});
