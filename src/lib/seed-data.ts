/**
 * Reads and validates /seed/*.json. JSON is only seed input; Postgres is the source
 * of truth once seeded. Shared by the seed script and the rule tests.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { CourseInfo } from "./rules/types";

const Student = z.object({ id: z.string(), name: z.string(), goals: z.array(z.string()) });
const Course = z.object({
  id: z.string(),
  title: z.string(),
  skillsTaught: z.array(z.string()),
  prerequisites: z.array(z.string()),
});
const Enrollment = z.object({
  studentId: z.string(),
  courseId: z.string(),
  enrolledAt: z.iso.datetime({ offset: true }),
});
const Progress = z.object({
  studentId: z.string(),
  courseId: z.string(),
  completedLessons: z.number().int().nonnegative(),
  totalLessons: z.number().int().positive(),
  lastActiveAt: z.iso.datetime({ offset: true }),
});
const Centers = z.object({
  centers: z.array(z.object({ id: z.string(), name: z.string() })),
  coaches: z.array(z.object({ id: z.string(), name: z.string(), centerId: z.string() })),
  memberships: z.array(z.object({ studentId: z.string(), centerId: z.string() })),
});

export type SeedStudent = z.infer<typeof Student>;
export type SeedEnrollment = z.infer<typeof Enrollment>;
export type SeedProgress = z.infer<typeof Progress>;

export interface SeedData {
  students: SeedStudent[];
  courses: CourseInfo[];
  enrollments: SeedEnrollment[];
  progress: SeedProgress[];
  centers: z.infer<typeof Centers>;
}

function read<T>(dir: string, file: string, schema: z.ZodType<T>): T {
  const raw = JSON.parse(readFileSync(path.join(dir, file), "utf8"));
  return schema.parse(raw);
}

export function loadSeed(dir = path.join(process.cwd(), "seed")): SeedData {
  const students = read(dir, "students.json", z.array(Student));
  const rawCourses = read(dir, "courses.json", z.array(Course));
  const enrollments = read(dir, "enrollments.json", z.array(Enrollment));
  const progress = read(dir, "progress.json", z.array(Progress));
  const centers = read(dir, "centers.json", Centers);

  // courses.json has no lesson count; it lives on progress rows. Derive one value per
  // course and refuse inconsistent input rather than guessing.
  const totals = new Map<string, number>();
  for (const p of progress) {
    const prev = totals.get(p.courseId);
    if (prev !== undefined && prev !== p.totalLessons) {
      throw new Error(`Inconsistent totalLessons for ${p.courseId}: ${prev} vs ${p.totalLessons}`);
    }
    totals.set(p.courseId, p.totalLessons);
  }

  const ids = new Set(rawCourses.map((c) => c.id));
  const courses: CourseInfo[] = rawCourses.map((c) => {
    const totalLessons = totals.get(c.id);
    if (totalLessons === undefined) throw new Error(`No totalLessons for course ${c.id}`);
    for (const p of c.prerequisites) {
      if (p === c.id) throw new Error(`Course ${c.id} lists itself as a prerequisite`);
      if (!ids.has(p)) throw new Error(`Course ${c.id} has unknown prerequisite ${p}`);
    }
    return {
      id: c.id,
      title: c.title,
      totalLessons,
      skills: [...new Set(c.skillsTaught)],
      prerequisites: c.prerequisites,
    };
  });

  for (const p of progress) {
    if (p.completedLessons > p.totalLessons) {
      throw new Error(`${p.studentId}/${p.courseId}: completedLessons > totalLessons`);
    }
    if (!enrollments.some((e) => e.studentId === p.studentId && e.courseId === p.courseId)) {
      throw new Error(`Progress without enrollment: ${p.studentId}/${p.courseId}`);
    }
  }

  return { students, courses, enrollments, progress, centers };
}
