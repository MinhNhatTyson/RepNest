import { startOfDay } from './consistency';

// A gap this long since the last finished session counts as a comeback.
export const COMEBACK_GAP_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

// Whole calendar days since the most recent session, or null if there is none yet.
export function daysSinceLastSession(timestamps: number[], now: number): number | null {
  if (timestamps.length === 0) return null;
  let last = timestamps[0];
  for (const ts of timestamps) {
    if (ts > last) last = ts;
  }
  // Rounding absorbs the 23/25-hour days around DST changes.
  return Math.round((startOfDay(now) - startOfDay(last)) / DAY_MS);
}

export function isComeback(timestamps: number[], now: number): boolean {
  const days = daysSinceLastSession(timestamps, now);
  return days !== null && days >= COMEBACK_GAP_DAYS;
}
