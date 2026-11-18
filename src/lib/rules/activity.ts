import { ACTIVE_DAYS_WINDOW, DAY_MS, TIME_ZONE } from "./constants";

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Calendar date (YYYY-MM-DD) of an instant in the configured time zone. */
export function calendarDateKey(d: Date): string {
  return dateKeyFormatter.format(d);
}

/** Shift a YYYY-MM-DD key by whole days (pure calendar math, no zone involved). */
function addDays(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + days));
  return shifted.toISOString().slice(0, 10);
}

/**
 * Number of distinct calendar dates (Asia/Kolkata) with at least one event in the
 * last `windowDays` days, counting today. Events after `now` are ignored.
 */
export function activeDaysInWindow(
  eventTimes: Date[],
  now: Date,
  windowDays: number = ACTIVE_DAYS_WINDOW,
): number {
  const today = calendarDateKey(now);
  const firstDay = addDays(today, -(windowDays - 1));
  const days = new Set<string>();
  for (const t of eventTimes) {
    if (t.getTime() > now.getTime()) continue;
    const key = calendarDateKey(t);
    if (key >= firstDay && key <= today) days.add(key);
  }
  return days.size;
}

/**
 * The calendar dates in the window, oldest first, each flagged active or not.
 * Feeds the 7-dot activity strip; `filter(active).length` equals activeDaysInWindow.
 */
export function activityStrip(
  eventTimes: Date[],
  now: Date,
  windowDays: number = ACTIVE_DAYS_WINDOW,
): { date: string; active: boolean }[] {
  const today = calendarDateKey(now);
  const active = new Set(
    eventTimes.filter((t) => t.getTime() <= now.getTime()).map(calendarDateKey),
  );
  return Array.from({ length: windowDays }, (_, i) => {
    const date = addDays(today, i - (windowDays - 1));
    return { date, active: active.has(date) };
  });
}

/** Whole days elapsed since `since` (floored). Null when there is no timestamp. */
export function daysSince(since: Date | null, now: Date): number | null {
  if (!since) return null;
  return Math.max(0, Math.floor((now.getTime() - since.getTime()) / DAY_MS));
}

/** Latest of a list of timestamps, or null. */
export function latest(times: (Date | null | undefined)[]): Date | null {
  let best: Date | null = null;
  for (const t of times) {
    if (t && (!best || t.getTime() > best.getTime())) best = t;
  }
  return best;
}
