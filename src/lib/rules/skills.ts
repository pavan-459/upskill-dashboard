import { isComplete } from "./progress";
import type { CourseCatalog, EnrollmentInfo } from "./types";

/**
 * Skills earned by a learner: every skill taught by a course they have completed
 * to at least the threshold. Sorted and de-duplicated.
 */
export function earnedSkills(catalog: CourseCatalog, enrollments: EnrollmentInfo[]): string[] {
  const earned = new Set<string>();
  for (const e of enrollments) {
    const course = catalog.get(e.courseId);
    if (!course) continue;
    if (isComplete(e.completedLessons, course.totalLessons)) {
      course.skills.forEach((s) => earned.add(s));
    }
  }
  return [...earned].sort();
}

/** Goal skills not yet earned, in the learner's goal order. */
export function unearnedGoals(goals: string[], earned: string[]): string[] {
  const have = new Set(earned);
  return goals.filter((g) => !have.has(g));
}
