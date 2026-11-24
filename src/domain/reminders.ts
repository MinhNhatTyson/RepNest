import { startOfDay } from './consistency';

export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export const DEFAULT_REMINDER_MINUTE = 18 * 60; // 18:00
export const MAX_MINUTE_OF_DAY = 23 * 60 + 59;
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
    if (part.trim() === '') continue; // Number('') is 0, which would read as Monday
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
export function parseTimePart(text: string, max: number): number | null {
  if (!/^\d{1,2}$/.test(text)) return null;
  const n = Number(text);
  return n <= max ? n : null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Days are kept sorted by the UI, so a plain element-by-element compare is enough.
export function samePlan(a: ReminderPlan, b: ReminderPlan): boolean {
  return (
    a.minuteOfDay === b.minuteOfDay &&
    a.days.length === b.days.length &&
    a.days.every((day, i) => day === b.days[i])
  );
}

// "Mon, Wed, Fri at 08:30"
export function formatPlan(plan: ReminderPlan): string {
  const days = plan.days.map((day) => DAY_LABELS[day]).join(', ');
  return `${days} at ${formatMinuteOfDay(plan.minuteOfDay)}`;
}

// The soonest planned weekday/time that is strictly after `now` (ms), or null with no days.
// Built from local calendar parts, so DST and month/year ends cannot shift it.
export function nextReminderAt(plan: ReminderPlan, now: number): number | null {
  if (plan.days.length === 0) return null;
  const d = new Date(now);
  const todayIndex = (d.getDay() + 6) % 7; // 0 = Monday
  const hour = Math.floor(plan.minuteOfDay / 60);
  const minute = plan.minuteOfDay % 60;

  let best: number | null = null;
  for (const day of plan.days) {
    const ahead = (day - todayIndex + 7) % 7;
    let candidate = new Date(d.getFullYear(), d.getMonth(), d.getDate() + ahead, hour, minute);
    if (candidate.getTime() <= now) {
      // Same weekday but the time has already passed: it fires next week.
      candidate = new Date(d.getFullYear(), d.getMonth(), d.getDate() + ahead + 7, hour, minute);
    }
    if (best === null || candidate.getTime() < best) best = candidate.getTime();
  }
  return best;
}

// "today at 08:30", "tomorrow at 08:30" or "Wed at 08:30".
export function formatNextReminder(ts: number, now: number): string {
  const d = new Date(ts);
  const time = formatMinuteOfDay(d.getHours() * 60 + d.getMinutes());
  // Rounding absorbs the 23/25-hour days around DST changes.
  const dayDiff = Math.round((startOfDay(ts) - startOfDay(now)) / DAY_MS);
  if (dayDiff === 0) return `today at ${time}`;
  if (dayDiff === 1) return `tomorrow at ${time}`;
  return `${DAY_LABELS[(d.getDay() + 6) % 7]} at ${time}`;
}
