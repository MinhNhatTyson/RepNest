export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export const DEFAULT_REMINDER_MINUTE = 18 * 60; // 18:00
export const MAX_MINUTE_OF_DAY = 23 * 60 + 45;
export const REMINDER_STEP_MINUTES = 15;

// days: 0 = Monday ... 6 = Sunday (same week as consistency.ts)
export type ReminderPlan = { days: number[]; minuteOfDay: number };

// expo-notifications weekdays run 1..7 with 1 = Sunday.
export function toExpoWeekday(day: number): number {
  return ((day + 1) % 7) + 1;
}

export function parseDays(raw: string | null): number[] {
  if (!raw) return [];
  const days = new Set<number>();
  for (const part of raw.split(',')) {
    const n = Number(part);
    if (Number.isInteger(n) && n >= 0 && n <= 6) days.add(n);
  }
  return [...days].sort((a, b) => a - b);
}

export function formatMinuteOfDay(minuteOfDay: number): string {
  const h = String(Math.floor(minuteOfDay / 60)).padStart(2, '0');
  const m = String(minuteOfDay % 60).padStart(2, '0');
  return `${h}:${m}`;
}
