export const DEFAULT_WEEKLY_GOAL = 3;
export const MAX_WEEKLY_GOAL = 7;
// A missed week is forgiven once; the next forgiveness is available 4 weeks later.
export const GRACE_EVERY_WEEKS = 4;

export type WeekSummary = {
  done: number;
  goal: number;
  remaining: number;
  streak: number;
};

export type CalendarDay = {
  dayStart: number;
  active: boolean;
  isToday: boolean;
  isFuture: boolean;
};

export type CalendarWeek = {
  weekStart: number;
  days: CalendarDay[];
  count: number;
  met: boolean;
};

// Local-time helpers. Dates are rebuilt from y/m/d so DST changes cannot shift a day.
export function startOfDay(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// Weeks start on Monday.
export function startOfWeek(ts: number): number {
  const d = new Date(ts);
  const offset = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset).getTime();
}

export function addDays(dayStart: number, n: number): number {
  const d = new Date(dayStart);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n).getTime();
}

function countByWeek(timestamps: number[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const ts of timestamps) {
    const week = startOfWeek(ts);
    counts.set(week, (counts.get(week) ?? 0) + 1);
  }
  return counts;
}

// Consecutive weeks where the goal was met. The current week never breaks the
// streak (it is still in progress); it only adds to it once the goal is met.
export function computeStreak(timestamps: number[], goal: number, now: number): number {
  if (timestamps.length === 0) return 0;

  const counts = countByWeek(timestamps);
  const currentWeek = startOfWeek(now);

  let first = timestamps[0];
  for (const ts of timestamps) {
    if (ts < first) first = ts;
  }

  let week = startOfWeek(first);
  let streak = 0;
  let sinceGrace = GRACE_EVERY_WEEKS; // grace is available from the start

  while (week < currentWeek) {
    const met = (counts.get(week) ?? 0) >= goal;
    if (met) {
      streak += 1;
    } else if (streak > 0 && sinceGrace >= GRACE_EVERY_WEEKS) {
      sinceGrace = 0; // forgiven: streak is kept, but not extended
    } else {
      streak = 0;
    }
    sinceGrace += 1;
    week = addDays(week, 7);
  }

  if ((counts.get(currentWeek) ?? 0) >= goal) streak += 1;
  return streak;
}

export function summarizeWeek(timestamps: number[], goal: number, now: number): WeekSummary {
  const done = countByWeek(timestamps).get(startOfWeek(now)) ?? 0;
  return {
    done,
    goal,
    remaining: Math.max(0, goal - done),
    streak: computeStreak(timestamps, goal, now),
  };
}

// Oldest week first, so the current week is the last row.
export function buildCalendar(
  timestamps: number[],
  goal: number,
  now: number,
  weeks = 6,
): CalendarWeek[] {
  const activeDays = new Set(timestamps.map(startOfDay));
  const counts = countByWeek(timestamps);
  const today = startOfDay(now);
  const currentWeek = startOfWeek(now);

  const result: CalendarWeek[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const weekStart = addDays(currentWeek, -7 * w);
    const days: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      const dayStart = addDays(weekStart, i);
      days.push({
        dayStart,
        active: activeDays.has(dayStart),
        isToday: dayStart === today,
        isFuture: dayStart > today,
      });
    }
    const count = counts.get(weekStart) ?? 0;
    result.push({ weekStart, days, count, met: count >= goal });
  }
  return result;
}

export function completionLines(s: WeekSummary): { headline: string; sub: string } {
  const reached = s.remaining === 0;
  const headline = reached
    ? `Session ${s.done} this week`
    : `Session ${s.done} this week, ${s.remaining} to go`;
  let sub = reached ? 'Weekly goal reached.' : 'Every session counts.';
  if (s.streak >= 2) sub += ` ${s.streak} weeks in a row.`;
  return { headline, sub };
}
// Calm one-liner about the previous week (P6: never shame).
export function lastWeekLine(s: WeekSummary): string {
  if (s.done === 0) return 'Last week was a quiet one. This week is a fresh start.';
  const sessions = s.done === 1 ? '1 session' : `${s.done} sessions`;
  return s.remaining === 0
    ? `Last week: ${sessions}. Goal reached.`
    : `Last week: ${sessions}. Every one counted.`;
}
