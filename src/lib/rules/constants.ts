/**
 * Single source of truth for every rule threshold. Change a rule here, nowhere else.
 */

/**
 * A course counts as "complete" (for prerequisites) and its skills count as "earned"
 * at this percentage. Decision: Option B from the brief, so "complete" and "earned"
 * share one threshold. This matches the seed (Aisha is in React Basics with
 * JavaScript Essentials at 10/12 = 83%).
 */
export const COMPLETE_THRESHOLD_PCT = 80;

/** A course or learner is at-risk after MORE than this many days without activity. */
export const AT_RISK_INACTIVE_DAYS = 3;

/** "Active days" looks at this many calendar days, today included. */
export const ACTIVE_DAYS_WINDOW = 7;

/** Calendar days (active days, "today") are counted in this zone. */
export const TIME_ZONE = "Asia/Kolkata";

export const DAY_MS = 24 * 60 * 60 * 1000;
