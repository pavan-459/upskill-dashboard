import { COMPLETE_THRESHOLD_PCT } from "./constants";

function assertValid(completed: number, total: number) {
  if (!Number.isInteger(total) || total <= 0) {
    throw new RangeError(`totalLessons must be a positive integer, got ${total}`);
  }
  if (!Number.isInteger(completed) || completed < 0) {
    throw new RangeError(`completedLessons must be a non-negative integer, got ${completed}`);
  }
}

/**
 * Percent complete for display, 0-100. Rounded DOWN so a course never shows
 * "100%" before every lesson is done (e.g. 199/200 shows 99%). Over-reporting is clamped.
 */
export function percentComplete(completed: number, total: number): number {
  assertValid(completed, total);
  return Math.min(100, Math.floor((completed * 100) / total));
}

/**
 * "Complete" for prerequisites and skills: at least COMPLETE_THRESHOLD_PCT.
 * Integer comparison avoids floating-point edge cases (8/10 is exactly 80%).
 */
export function isComplete(completed: number, total: number): boolean {
  assertValid(completed, total);
  return completed * 100 >= COMPLETE_THRESHOLD_PCT * total;
}

/** "Finished": every lesson done. A finished course is never at-risk. */
export function isFinished(completed: number, total: number): boolean {
  assertValid(completed, total);
  return completed >= total;
}

/** Lessons still needed to reach the "complete" threshold (0 if already there). */
export function lessonsToComplete(completed: number, total: number): number {
  assertValid(completed, total);
  const needed = Math.ceil((COMPLETE_THRESHOLD_PCT * total) / 100);
  return Math.max(0, needed - completed);
}
