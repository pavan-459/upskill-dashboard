import { isComplete, lessonsToComplete } from "./progress";
import type { CourseCatalog, EnrollmentInfo } from "./types";

export interface MissingPrerequisite {
  courseId: string;
  title: string;
  enrolled: boolean;
  completedLessons: number;
  totalLessons: number;
  /** Lessons still needed to reach the "complete" threshold. */
  lessonsLeft: number;
}

/**
 * Prerequisites of `courseId` that the learner has not completed, with how far
 * along each one is. Empty array means the course is eligible.
 */
export function missingPrerequisites(
  courseId: string,
  catalog: CourseCatalog,
  enrollments: EnrollmentInfo[],
): MissingPrerequisite[] {
  const course = catalog.get(courseId);
  if (!course) throw new Error(`Unknown course ${courseId}`);
  const byCourse = new Map(enrollments.map((e) => [e.courseId, e]));

  const missing: MissingPrerequisite[] = [];
  for (const prereqId of course.prerequisites) {
    const prereq = catalog.get(prereqId);
    if (!prereq) throw new Error(`Course ${courseId} has unknown prerequisite ${prereqId}`);
    const enrollment = byCourse.get(prereqId);
    const completed = enrollment?.completedLessons ?? 0;
    if (!isComplete(completed, prereq.totalLessons)) {
      missing.push({
        courseId: prereq.id,
        title: prereq.title,
        enrolled: Boolean(enrollment),
        completedLessons: completed,
        totalLessons: prereq.totalLessons,
        lessonsLeft: lessonsToComplete(completed, prereq.totalLessons),
      });
    }
  }
  return missing;
}

/** A course is eligible only when every prerequisite is complete for that learner. */
export function isEligible(
  courseId: string,
  catalog: CourseCatalog,
  enrollments: EnrollmentInfo[],
): boolean {
  return missingPrerequisites(courseId, catalog, enrollments).length === 0;
}

/** One-line "why locked" hint, e.g. "Finish JavaScript Essentials: 2 lessons left". */
export function lockedHint(missing: MissingPrerequisite[]): string | null {
  if (missing.length === 0) return null;
  return missing
    .map((m) =>
      m.enrolled
        ? `Finish ${m.title}: ${m.lessonsLeft} lesson${m.lessonsLeft === 1 ? "" : "s"} left`
        : `Enroll in and finish ${m.title} first`,
    )
    .join("; ");
}
