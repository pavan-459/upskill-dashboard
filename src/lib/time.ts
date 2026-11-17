/**
 * The app's notion of "now". Defaults to real time. Setting NOW (ISO-8601) freezes it,
 * which is useful for screenshots and debugging. The seed already shifts data to be
 * recent, so NOW is optional.
 */
export function getNow(): Date {
  const raw = process.env.NOW;
  if (raw) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d;
    console.warn(`Ignoring invalid NOW=${raw}`);
  }
  return new Date();
}
