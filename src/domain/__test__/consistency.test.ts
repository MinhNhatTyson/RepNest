import {
  addDays,
  buildCalendar,
  completionLines,
  computeStreak,
  lastWeekLine,
  startOfDay,
  startOfWeek,
  summarizeWeek,
} from '../consistency';

// Tests run in America/New_York (see jest.global-setup.js). Calendar facts for 2026:
//   DST starts Sun Mar 8 (that day has 23 h); DST ends Sun Nov 1 (25 h).
//   Mon Mar 30 / Wed Apr 1 and Sun Nov 22 are used for month and "today" cases.
// Month is 0-based, like Date.
const HOUR = 60 * 60 * 1000;

const at = (y: number, m: number, d: number, h = 12, min = 0): number =>
  new Date(y, m, d, h, min).getTime();

// n sessions on consecutive days from the Monday (y, m, d), each at 18:00.
const sessions = (y: number, m: number, d: number, n: number): number[] =>
  Array.from({ length: n }, (_, i) => at(y, m, d + i, 18));

describe('startOfDay', () => {
  it('returns local midnight', () => {
    expect(startOfDay(at(2026, 5, 10, 15, 30))).toBe(at(2026, 5, 10, 0));
  });

  it('keeps 23:59 on the same day', () => {
    expect(startOfDay(at(2026, 5, 10, 23, 59))).toBe(at(2026, 5, 10, 0));
  });

  it('works on the DST days', () => {
    expect(startOfDay(at(2026, 2, 8, 23, 30))).toBe(at(2026, 2, 8, 0));
    expect(startOfDay(at(2026, 10, 1, 23, 30))).toBe(at(2026, 10, 1, 0));
  });
});

describe('startOfWeek', () => {
  it('starts weeks on Monday', () => {
    expect(startOfWeek(at(2026, 10, 22, 15))).toBe(at(2026, 10, 16, 0)); // Sunday
    expect(startOfWeek(at(2026, 10, 18, 9))).toBe(at(2026, 10, 16, 0)); // Wednesday
  });

  it('puts Monday 00:00 in the new week and Sunday 23:59 in the old one', () => {
    expect(startOfWeek(at(2026, 10, 16, 0))).toBe(at(2026, 10, 16, 0));
    expect(startOfWeek(at(2026, 10, 22, 23, 59))).toBe(at(2026, 10, 16, 0));
    expect(startOfWeek(at(2026, 10, 23, 0))).toBe(at(2026, 10, 23, 0));
  });

  it('crosses a month boundary (Wed Apr 1 -> Mon Mar 30)', () => {
    expect(startOfWeek(at(2026, 3, 1))).toBe(at(2026, 2, 30, 0));
  });

  it('crosses a year boundary (Thu Jan 1 2026 -> Mon Dec 29 2025)', () => {
    expect(startOfWeek(at(2026, 0, 1))).toBe(at(2025, 11, 29, 0));
  });

  it('handles the week that contains spring forward', () => {
    expect(startOfWeek(at(2026, 2, 8, 12))).toBe(at(2026, 2, 2, 0)); // Sunday, after the jump
    expect(startOfWeek(at(2026, 2, 9, 0, 30))).toBe(at(2026, 2, 9, 0)); // next Monday
  });

  it('handles the week that contains fall back', () => {
    expect(startOfWeek(at(2026, 10, 1, 12))).toBe(at(2026, 9, 26, 0)); // Sunday, after the repeat
    expect(startOfWeek(at(2026, 10, 2, 0, 30))).toBe(at(2026, 10, 2, 0)); // next Monday
  });
});

describe('addDays', () => {
  it('adds calendar days across month ends', () => {
    expect(addDays(at(2026, 0, 31, 0), 1)).toBe(at(2026, 1, 1, 0));
    expect(addDays(at(2026, 1, 28, 0), 1)).toBe(at(2026, 2, 1, 0)); // 2026 is not a leap year
    expect(addDays(at(2028, 1, 28, 0), 1)).toBe(at(2028, 1, 29, 0)); // 2028 is
    expect(addDays(at(2026, 11, 31, 0), 1)).toBe(at(2027, 0, 1, 0));
  });

  it('goes backwards', () => {
    expect(addDays(at(2026, 2, 1, 0), -1)).toBe(at(2026, 1, 28, 0));
  });

  it('returns midnight even across DST (a day is not always 24 h)', () => {
    expect(addDays(at(2026, 2, 8, 0), 1)).toBe(at(2026, 2, 9, 0));
    expect(addDays(at(2026, 2, 8, 0), 1) - at(2026, 2, 8, 0)).toBe(23 * HOUR);
    expect(addDays(at(2026, 10, 1, 0), 1) - at(2026, 10, 1, 0)).toBe(25 * HOUR);
  });

  it('adds a week across DST without drifting by an hour', () => {
    expect(addDays(at(2026, 2, 2, 0), 7)).toBe(at(2026, 2, 9, 0));
    expect(addDays(at(2026, 9, 26, 0), 7)).toBe(at(2026, 10, 2, 0));
  });
});

describe('computeStreak (goal 2, today is Sun Nov 22 2026)', () => {
  const GOAL = 2;
  const now = at(2026, 10, 22, 15); // current week starts Mon Nov 16
  const oct = (d: number, n: number) => sessions(2026, 9, d, n);
  const nov = (d: number, n: number) => sessions(2026, 10, d, n);

  it('is 0 with no sessions', () => {
    expect(computeStreak([], GOAL, now)).toBe(0);
  });

  it('is 0 when only this week exists and the goal is not met yet', () => {
    expect(computeStreak(nov(16, 1), GOAL, now)).toBe(0);
  });

  it('is 1 when this week already met the goal', () => {
    expect(computeStreak(nov(16, 2), GOAL, now)).toBe(1);
  });

  it('counts consecutive met weeks including the current one', () => {
    expect(computeStreak([...nov(2, 2), ...nov(9, 2), ...nov(16, 2)], GOAL, now)).toBe(3);
  });

  it('does not break the streak while the current week is still in progress', () => {
    expect(computeStreak([...nov(2, 2), ...nov(9, 2)], GOAL, now)).toBe(2);
  });

  it('treats more than the goal as met', () => {
    expect(computeStreak([...nov(9, 3), ...nov(16, 3)], GOAL, now)).toBe(2);
  });

  it('forgives one missed week: streak is kept but not extended', () => {
    // met, missed, met(current) -> 1 + 0 + 1 = 2 (without the grace it would be 1)
    expect(computeStreak([...nov(2, 2), ...nov(16, 2)], GOAL, now)).toBe(2);
  });

  it('resets on a second miss shortly after a forgiven one', () => {
    // Oct 26 met, Nov 2 missed (forgiven), Nov 9 missed (reset), Nov 16 met
    expect(computeStreak([...oct(26, 2), ...nov(16, 2)], GOAL, now)).toBe(1);
  });

  it('does not forgive again 3 weeks after the last forgiveness', () => {
    // Oct 5 met, Oct 12 missed (forgiven), Oct 19+26 met, Nov 2 missed (only 3 weeks later)
    const times = [...oct(5, 2), ...oct(19, 2), ...oct(26, 2), ...nov(9, 2), ...nov(16, 2)];
    expect(computeStreak(times, GOAL, now)).toBe(2);
  });

  it('forgives again exactly 4 weeks after the last forgiveness', () => {
    // Oct 5 met, Oct 12 missed (forgiven), Oct 19, Oct 26, Nov 2 met, Nov 9 missed (4 weeks later)
    const times = [...oct(5, 2), ...oct(19, 2), ...oct(26, 2), ...nov(2, 2), ...nov(16, 2)];
    expect(computeStreak(times, GOAL, now)).toBe(5);
  });

  it('starts a fresh streak after a long gap (comeback)', () => {
    // one old met week, then nothing for four weeks, then this week
    expect(computeStreak([...oct(5, 2), ...nov(16, 2)], GOAL, now)).toBe(1);
  });

  it('keeps sessions from one week together across a month end and DST end', () => {
    // Sat Oct 31 + Sun Nov 1 (the 25-hour day) are both in the week of Mon Oct 26.
    const times = [at(2026, 9, 31, 18), at(2026, 10, 1, 18)];
    expect(computeStreak(times, GOAL, at(2026, 10, 3, 12))).toBe(1); // Tue Nov 3
  });

  it.each([
    { label: 'spring forward', y: 2026, m: 2, d: 2, today: at(2026, 2, 22, 15) },
    { label: 'fall back', y: 2026, m: 9, d: 26, today: at(2026, 10, 15, 15) },
  ])('counts every week around $label', ({ y, m, d, today }) => {
    // Three consecutive weeks starting at Monday (y, m, d); the first one has 167 / 169 hours.
    const times = [0, 1, 2].flatMap((w) => sessions(y, m, d + 7 * w, 2));
    expect(computeStreak(times, GOAL, today)).toBe(3);
  });
});

describe('summarizeWeek', () => {
  const now = at(2026, 10, 22, 15); // Sun Nov 22

  it('counts only sessions in the current week', () => {
    const times = [...sessions(2026, 10, 9, 3), ...sessions(2026, 10, 16, 1)];
    expect(summarizeWeek(times, 3, now)).toMatchObject({ done: 1, goal: 3, remaining: 2 });
  });

  it('never reports a negative remaining', () => {
    expect(summarizeWeek(sessions(2026, 10, 16, 4), 3, now)).toMatchObject({
      done: 4,
      remaining: 0,
    });
  });

  it('groups a week that spans two years', () => {
    // Tue Dec 30 2025 and Thu Jan 1 2026 are the same week (Mon Dec 29).
    const times = [at(2025, 11, 30, 18), at(2026, 0, 1, 18)];
    expect(summarizeWeek(times, 3, at(2026, 0, 2, 12))).toMatchObject({ done: 2, remaining: 1 });
  });

  it('groups a week that spans a month end and the DST end', () => {
    const times = [at(2026, 9, 31, 18), at(2026, 10, 1, 10)];
    expect(summarizeWeek(times, 2, at(2026, 10, 1, 20))).toMatchObject({
      done: 2,
      remaining: 0,
      streak: 1,
    });
  });
});

describe('buildCalendar', () => {
  const now = at(2026, 10, 18, 9); // Wed Nov 18

  it('returns 6 weeks by default, oldest first, ending with the current week', () => {
    const cal = buildCalendar([], 3, now);
    expect(cal.map((w) => w.weekStart)).toEqual(
      [5, 4, 3, 2, 1, 0].map((back) => at(2026, 10, 16 - 7 * back, 0)),
    );
  });

  it('gives each week 7 exact-midnight days (this range includes the Nov 1 fall back)', () => {
    for (const week of buildCalendar([], 3, now)) {
      const first = new Date(week.weekStart);
      expect(week.days.map((d) => d.dayStart)).toEqual(
        [0, 1, 2, 3, 4, 5, 6].map((i) =>
          new Date(first.getFullYear(), first.getMonth(), first.getDate() + i).getTime(),
        ),
      );
    }
  });

  it('gives exact-midnight days in the week of spring forward', () => {
    const [week] = buildCalendar([], 3, at(2026, 2, 11, 12), 2); // Wed Mar 11, weeks of Mar 2 + 9
    expect(week.days.map((d) => d.dayStart)).toEqual(
      [2, 3, 4, 5, 6, 7, 8].map((d) => at(2026, 2, d, 0)),
    );
  });

  it('starts the week on Mar 30 when today is Wed Apr 1 (month boundary)', () => {
    const [week] = buildCalendar([], 3, at(2026, 3, 1, 12), 1);
    expect(week.days.map((d) => d.dayStart)).toEqual(
      [0, 1, 2, 3, 4, 5, 6].map((i) => at(2026, 2, 30 + i, 0)),
    );
  });

  it('flags today and future days', () => {
    const current = buildCalendar([], 3, now)[5]; // Mon..Sun of Nov 16
    expect(current.days.map((d) => d.isToday)).toEqual([false, false, true, false, false, false, false]);
    expect(current.days.map((d) => d.isFuture)).toEqual([false, false, false, true, true, true, true]);
  });

  it('marks the day of a session, judged by local midnight', () => {
    const times = [at(2026, 10, 16, 23, 59), at(2026, 10, 17, 0, 1)]; // Mon late, Tue just after
    const current = buildCalendar(times, 3, now)[5];
    expect(current.days.map((d) => d.active)).toEqual([true, true, false, false, false, false, false]);
  });

  it('keeps Sat Oct 31 23:59 on Saturday and not on the DST-end Sunday', () => {
    const week = buildCalendar([at(2026, 9, 31, 23, 59)], 3, now)[2]; // week of Mon Oct 26
    expect(week.days.map((d) => d.active)).toEqual([false, false, false, false, false, true, false]);
  });

  it('counts sessions per week and compares them with the goal', () => {
    const times = [...sessions(2026, 10, 9, 3), ...sessions(2026, 10, 2, 2)];
    const cal = buildCalendar(times, 3, now);
    expect(cal[4]).toMatchObject({ count: 3, met: true }); // week of Nov 9
    expect(cal[3]).toMatchObject({ count: 2, met: false }); // week of Nov 2
    expect(cal[5]).toMatchObject({ count: 0, met: false }); // current week
  });

  it('has no active days with no history', () => {
    const cal = buildCalendar([], 3, now);
    expect(cal.every((w) => w.count === 0 && w.days.every((d) => !d.active))).toBe(true);
  });
});

describe('completionLines', () => {
  it('celebrates a reached goal', () => {
    expect(completionLines({ done: 3, goal: 3, remaining: 0, streak: 1 })).toEqual({
      headline: 'Session 3 this week',
      sub: 'Weekly goal reached.',
    });
  });

  it('shows how many sessions are left', () => {
    expect(completionLines({ done: 2, goal: 3, remaining: 1, streak: 0 })).toEqual({
      headline: 'Session 2 this week, 1 to go',
      sub: 'Every session counts.',
    });
  });

  it('mentions the streak only from 2 weeks on', () => {
    expect(completionLines({ done: 3, goal: 3, remaining: 0, streak: 1 }).sub).not.toMatch(/in a row/);
    expect(completionLines({ done: 3, goal: 3, remaining: 0, streak: 4 }).sub).toBe(
      'Weekly goal reached. 4 weeks in a row.',
    );
  });
});

describe('lastWeekLine', () => {
  it('is calm about an empty week', () => {
    expect(lastWeekLine({ done: 0, goal: 3, remaining: 3, streak: 0 })).toBe(
      'Last week was a quiet one. This week is a fresh start.',
    );
  });

  it('says "1 session" in the singular and plural otherwise', () => {
    expect(lastWeekLine({ done: 1, goal: 1, remaining: 0, streak: 1 })).toBe(
      'Last week: 1 session. Goal reached.',
    );
    expect(lastWeekLine({ done: 2, goal: 3, remaining: 1, streak: 0 })).toBe(
      'Last week: 2 sessions. Every one counted.',
    );
  });
});
