import { catalogFrom, type CourseInfo, type EnrollmentInfo } from "./types";

export const course = (
  id: string,
  opts: Partial<Omit<CourseInfo, "id">> = {},
): CourseInfo => ({
  id,
  title: opts.title ?? `Course ${id}`,
  totalLessons: opts.totalLessons ?? 10,
  skills: opts.skills ?? [],
  prerequisites: opts.prerequisites ?? [],
});

export const enrollment = (
  courseId: string,
  completedLessons: number,
  opts: { enrolledAt?: Date; lastActivityAt?: Date | null } = {},
): EnrollmentInfo => ({
  courseId,
  completedLessons,
  enrolledAt: opts.enrolledAt ?? new Date("2026-01-01T00:00:00Z"),
  lastActivityAt: opts.lastActivityAt === undefined ? null : opts.lastActivityAt,
});

/** The catalog from /seed/courses.json + lesson totals from progress.json. */
export const seedCatalog = catalogFrom([
  course("c1", { title: "Web Foundations", totalLessons: 12, skills: ["html", "css", "frontend"] }),
  course("c2", { title: "JavaScript Essentials", totalLessons: 12, skills: ["javascript", "frontend"], prerequisites: ["c1"] }),
  course("c3", { title: "React Basics", totalLessons: 16, skills: ["react", "frontend"], prerequisites: ["c2"] }),
  course("c4", { title: "SQL Fundamentals", totalLessons: 10, skills: ["sql", "data"] }),
  course("c5", { title: "Building Dashboards", totalLessons: 12, skills: ["dashboards", "sql"], prerequisites: ["c4"] }),
  course("c6", { title: "User Research 101", totalLessons: 10, skills: ["user-research", "product"] }),
]);

export const hoursBefore = (now: Date, h: number) => new Date(now.getTime() - h * 3_600_000);
