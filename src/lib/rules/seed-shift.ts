import { DAY_MS } from "./constants";

/**
 * The seed's timestamps are from Aug-Oct 2026, so against real time every learner
 * would look at-risk with 0 active days. The seed shifts every timestamp by the same
 * WHOLE number of days so the latest one lands within the last 24h before `now`.
 *
 * Whole days keep the time of day and all relative gaps intact (Rohan stays 7 days
 * behind on Building Dashboards, Aisha stays active on consecutive days), and the
 * latest event never ends up in the future.
 */
export function seedShiftMs(timestamps: Date[], now: Date): number {
  if (timestamps.length === 0) return 0;
  const latest = Math.max(...timestamps.map((t) => t.getTime()));
  const days = Math.floor((now.getTime() - latest) / DAY_MS);
  return days * DAY_MS;
}

export function shift(d: Date, ms: number): Date {
  return new Date(d.getTime() + ms);
}
