import { isEligible } from "./eligibility";
import { isFinished } from "./progress";
import { earnedSkills, unearnedGoals } from "./skills";
import type { CourseCatalog, CourseInfo, EnrollmentInfo } from "./types";

export type RecommendationKind =
  | "enroll-goal" // 1. eligible, unenrolled course teaching an unearned goal skill
  | "finish-enrolled" // 2. enrolled, unfinished course teaching the most unearned goal skills
  | "enroll-unlocks" // 3. eligible, unenrolled course that unlocks the most other courses
  | "none"; // nothing applies

export interface Recommendation {
  kind: RecommendationKind;
  courseId: string | null;
  /** Always present: one line explaining the pick (or why there is none). */
  reason: string;
  /** Goal skills this course would cover (branches 1 and 2). */
  goalSkills: string[];
  /** True when the action is "enroll" (branches 1 and 3). */
  canEnroll: boolean;
}

export interface RecommendInput {
  catalog: CourseCatalog;
  goals: string[];
  enrollments: EnrollmentInfo[];
}

function listSkills(skills: string[]): string {
  if (skills.length <= 1) return skills.join("");
  return `${skills.slice(0, -1).join(", ")} and ${skills[skills.length - 1]}`;
}

function pluralGoal(skills: string[]): string {
  return skills.length === 1 ? "your goal" : "your goals";
}

/** How many courses list `courseId` as a direct prerequisite. */
export function unlockCount(courseId: string, catalog: CourseCatalog): number {
  let n = 0;
  for (const c of catalog.values()) if (c.prerequisites.includes(courseId)) n++;
  return n;
}

/** Deterministic ordering: higher score first, then by course id. */
function best<T extends { course: CourseInfo }>(items: T[], score: (t: T) => number[]): T | null {
  if (items.length === 0) return null;
  return [...items].sort((a, b) => {
    const sa = score(a);
    const sb = score(b);
    for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return sb[i] - sa[i];
    return a.course.id.localeCompare(b.course.id);
  })[0];
}

/**
 * Pick the single next course for a learner. Fallback order:
 *   1. An eligible, unenrolled course that teaches an unearned goal skill
 *      (most unearned goals covered, then most unlocks).
 *   2. The enrolled, unfinished course that teaches the most unearned goal skills.
 *   3. An eligible, unenrolled course that unlocks the most other courses.
 *   4. None, with a reason.
 */
export function recommendNext({ catalog, goals, enrollments }: RecommendInput): Recommendation {
  const earned = earnedSkills(catalog, enrollments);
  const missingGoals = unearnedGoals(goals, earned);
  const missingGoalSet = new Set(missingGoals);
  const enrolledIds = new Set(enrollments.map((e) => e.courseId));
  const goalsTaught = (c: CourseInfo) => c.skills.filter((s) => missingGoalSet.has(s));

  const candidates = [...catalog.values()]
    .filter((c) => !enrolledIds.has(c.id) && isEligible(c.id, catalog, enrollments))
    .map((course) => ({ course, goals: goalsTaught(course), unlocks: unlockCount(course.id, catalog) }));

  // 1. Eligible + unenrolled + teaches an unearned goal.
  const goalPick = best(
    candidates.filter((c) => c.goals.length > 0),
    (c) => [c.goals.length, c.unlocks],
  );
  if (goalPick) {
    return {
      kind: "enroll-goal",
      courseId: goalPick.course.id,
      reason: `Start ${goalPick.course.title}: it teaches ${listSkills(goalPick.goals)}, ${pluralGoal(goalPick.goals)}.`,
      goalSkills: goalPick.goals,
      canEnroll: true,
    };
  }

  // 2. Enrolled + unfinished + teaches the most unearned goals.
  const inProgress = enrollments
    .map((e) => ({ e, course: catalog.get(e.courseId) }))
    .filter((x): x is { e: EnrollmentInfo; course: CourseInfo } => Boolean(x.course))
    .filter(({ e, course }) => !isFinished(e.completedLessons, course.totalLessons))
    .map(({ e, course }) => ({ course, e, goals: goalsTaught(course) }))
    .filter((x) => x.goals.length > 0);
  const finishPick = best(inProgress, (x) => [x.goals.length, x.e.completedLessons / x.course.totalLessons]);
  if (finishPick) {
    return {
      kind: "finish-enrolled",
      courseId: finishPick.course.id,
      reason: `Finish ${finishPick.course.title}: it is the course that teaches ${listSkills(finishPick.goals)}, ${pluralGoal(finishPick.goals)}.`,
      goalSkills: finishPick.goals,
      canEnroll: false,
    };
  }

  // 3. Eligible + unenrolled + unlocks the most other courses.
  const unlockPick = best(
    candidates.filter((c) => c.unlocks > 0),
    (c) => [c.unlocks],
  );
  if (unlockPick) {
    const n = unlockPick.unlocks;
    return {
      kind: "enroll-unlocks",
      courseId: unlockPick.course.id,
      reason: `Start ${unlockPick.course.title}: it unlocks ${n} more course${n === 1 ? "" : "s"}.`,
      goalSkills: [],
      canEnroll: true,
    };
  }

  // 4. Nothing applies: explain why.
  let reason: string;
  if (catalog.size > 0 && enrolledIds.size === catalog.size) {
    reason = "Already enrolled in every course. Keep going on the ones in progress.";
  } else if (candidates.length === 0) {
    reason = "No new course is unlocked yet. Finish a current course to unlock the next one.";
  } else if (goals.length === 0) {
    reason = "No goals set and no open course unlocks anything new. Add a goal to get a recommendation.";
  } else if (missingGoals.length === 0) {
    reason = "All goal skills are earned. Set a new goal to get a recommendation.";
  } else {
    reason = `No available course teaches ${listSkills(missingGoals)} yet.`;
  }
  return { kind: "none", courseId: null, reason, goalSkills: [], canEnroll: false };
}

/**
 * A secondary, enrollable suggestion shown under the main pick when the main pick
 * is not something to enroll in (e.g. "finish React Basics"). Keeps the learner one
 * click from starting something new without turning the page into a catalog.
 * Order: branch 1, then branch 3, then any eligible unenrolled course (lowest id).
 */
export function recommendAlternative(input: RecommendInput, primary: Recommendation): Recommendation | null {
  // Branch 1 already returns an enrollable course; no alternative needed.
  if (primary.canEnroll) return null;
  const { catalog, enrollments } = input;
  const enrolledIds = new Set(enrollments.map((e) => e.courseId));
  // Branch 1 found nothing, so no open course teaches an unearned goal: rank by unlocks.
  const open = [...catalog.values()]
    .filter((c) => !enrolledIds.has(c.id) && isEligible(c.id, catalog, enrollments))
    .map((course) => ({ course, unlocks: unlockCount(course.id, catalog) }));
  const pick = best(open, (c) => [c.unlocks]);
  if (!pick) return null;
  const n = pick.unlocks;
  return {
    kind: "enroll-unlocks",
    courseId: pick.course.id,
    reason:
      n > 0
        ? `Start ${pick.course.title}: it unlocks ${n} more course${n === 1 ? "" : "s"}.`
        : `Start ${pick.course.title}: it is open to you now.`,
    goalSkills: [],
    canEnroll: true,
  };
}
