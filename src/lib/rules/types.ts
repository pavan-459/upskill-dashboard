/** Plain data shapes the rules operate on. Deliberately independent of Prisma. */

export interface CourseInfo {
  id: string;
  title: string;
  totalLessons: number;
  /** Skill names taught by this course. */
  skills: string[];
  /** Ids of courses that must be complete before this one is eligible. */
  prerequisites: string[];
}

export interface EnrollmentInfo {
  courseId: string;
  completedLessons: number;
  enrolledAt: Date;
  /** Latest activity event on this course, or null if none was recorded. */
  lastActivityAt: Date | null;
}

export type CourseCatalog = ReadonlyMap<string, CourseInfo>;

export function catalogFrom(courses: CourseInfo[]): CourseCatalog {
  return new Map(courses.map((c) => [c.id, c]));
}
