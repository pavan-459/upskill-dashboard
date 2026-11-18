import { daysSince, latest } from "./activity";
import { AT_RISK_INACTIVE_DAYS, DAY_MS } from "./constants";
import { isFinished } from "./progress";
import type { CourseCatalog, EnrollmentInfo } from "./types";

export type CourseStatus = "completed" | "on-track" | "at-risk";

export interface CourseRisk {
  courseId: string;
  status: CourseStatus;
  /** Last activity on this course (falls back to the enrollment time). */
  lastActivityAt: Date;
  daysInactive: number;
}

/** Strictly more than AT_RISK_INACTIVE_DAYS of elapsed time (72h exactly is still on-track). */
function inactiveTooLong(last: Date, now: Date): boolean {
  return now.getTime() - last.getTime() > AT_RISK_INACTIVE_DAYS * DAY_MS;
}

/**
 * Per-course status. A finished course (100%) is never at-risk. Otherwise the course
 * is at-risk when there has been no activity on it for more than 3 days. If no
 * activity was ever recorded, enrolment time counts as the last activity.
 */
export function courseRisk(
  enrollment: EnrollmentInfo,
  totalLessons: number,
  now: Date,
): CourseRisk {
  const last = latest([enrollment.lastActivityAt, enrollment.enrolledAt])!;
  const daysInactive = daysSince(last, now)!;
  let status: CourseStatus;
  if (isFinished(enrollment.completedLessons, totalLessons)) status = "completed";
  else status = inactiveTooLong(last, now) ? "at-risk" : "on-track";
  return { courseId: enrollment.courseId, status, lastActivityAt: last, daysInactive };
}

export interface LearnerRisk {
  atRisk: boolean;
  /** Whole days since any activity; null when the learner has none at all. */
  daysInactive: number | null;
  lastActivityAt: Date | null;
  atRiskCourseIds: string[];
  /** Short human reason, for the coach view. */
  reason: string;
}

/**
 * Learner-level status for coaches: at-risk if any unfinished course is at-risk,
 * or if the learner has had no activity at all for more than 3 days (which also
 * covers a learner with no enrollments and no activity).
 */
export function learnerRisk(
  catalog: CourseCatalog,
  enrollments: EnrollmentInfo[],
  lastAnyActivityAt: Date | null,
  now: Date,
): LearnerRisk {
  const courseRisks = enrollments
    .filter((e) => catalog.has(e.courseId))
    .map((e) => courseRisk(e, catalog.get(e.courseId)!.totalLessons, now));
  const atRiskCourseIds = courseRisks.filter((r) => r.status === "at-risk").map((r) => r.courseId);

  const lastActivityAt = latest([lastAnyActivityAt, ...enrollments.map((e) => e.lastActivityAt)]);
  const daysInactive = daysSince(lastActivityAt, now);
  const globallyInactive = !lastActivityAt || inactiveTooLong(lastActivityAt, now);

  const stalled = atRiskCourseIds.map((id) => catalog.get(id)!.title).join(", ");
  let reason: string;
  if (!lastActivityAt) reason = "No activity recorded yet";
  else if (globallyInactive && stalled) reason = `No activity for ${daysInactive} days · stalled on ${stalled}`;
  else if (globallyInactive) reason = `No activity for ${daysInactive} days`;
  else if (stalled) reason = `Stalled on ${stalled}`;
  else reason = "Active recently";

  return {
    atRisk: globallyInactive || atRiskCourseIds.length > 0,
    daysInactive,
    lastActivityAt,
    atRiskCourseIds,
    reason,
  };
}
