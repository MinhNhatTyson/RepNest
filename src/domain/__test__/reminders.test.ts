import {
  formatMinuteOfDay,
  formatNextReminder,
  formatPlan,
  nextReminderAt,
  parseDays,
  samePlan,
  toExpoWeekday,
  parseTimePart,
} from '../reminders';

// Tests run in America/New_York (see jest.global-setup.js). Calendar facts for 2026:
//   Mon Mar 30 / Wed Apr 1; DST starts Sun Mar 8 and ends Sun Nov 1;
//   Mon Nov 23 and Tue Dec 29 are used as "now".
// Month is 0-based, like Date. Days: 0 = Monday ... 6 = Sunday.
const at = (y: number, m: number, d: number, h = 12, min = 0): number =>
  new Date(y, m, d, h, min).getTime();

const MIN_0830 = 8 * 60 + 30;
const MIN_1800 = 18 * 60;

describe('toExpoWeekday', () => {
  it('maps Monday..Sunday (0..6) to expo-notifications 2..7, 1', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(toExpoWeekday)).toEqual([2, 3, 4, 5, 6, 7, 1]);
  });
});

describe('parseDays', () => {
  it('is empty for null and empty text', () => {
    expect(parseDays(null)).toEqual([]);
    expect(parseDays('')).toEqual([]);
  });

  it('parses, de-duplicates and sorts', () => {
    expect(parseDays('0,2,4')).toEqual([0, 2, 4]);
    expect(parseDays('4,0,0,2')).toEqual([0, 2, 4]);
  });

  it('ignores junk and out-of-range values', () => {
    expect(parseDays('1,x,9,-1,2.5,')).toEqual([1]);
  });
});

describe('formatMinuteOfDay', () => {
  it('pads hours and minutes', () => {
    expect(formatMinuteOfDay(0)).toBe('00:00');
    expect(formatMinuteOfDay(MIN_0830)).toBe('08:30');
    expect(formatMinuteOfDay(MIN_1800)).toBe('18:00');
    expect(formatMinuteOfDay(23 * 60 + 59)).toBe('23:59');
  });
});

describe('samePlan', () => {
  it('compares days and time', () => {
    expect(samePlan({ days: [0, 2], minuteOfDay: 510 }, { days: [0, 2], minuteOfDay: 510 })).toBe(
      true,
    );
    expect(samePlan({ days: [0, 2], minuteOfDay: 510 }, { days: [0, 2], minuteOfDay: 525 })).toBe(
      false,
    );
    expect(samePlan({ days: [0, 2], minuteOfDay: 510 }, { days: [0], minuteOfDay: 510 })).toBe(
      false,
    );
    expect(samePlan({ days: [0, 2], minuteOfDay: 510 }, { days: [0, 3], minuteOfDay: 510 })).toBe(
      false,
    );
    expect(samePlan({ days: [], minuteOfDay: 510 }, { days: [], minuteOfDay: 510 })).toBe(true);
  });
});

describe('formatPlan', () => {
  it('lists the days and the time', () => {
    expect(formatPlan({ days: [0, 2, 4], minuteOfDay: MIN_0830 })).toBe('Mon, Wed, Fri at 08:30');
    expect(formatPlan({ days: [6], minuteOfDay: MIN_1800 })).toBe('Sun at 18:00');
  });
});

describe('nextReminderAt (now is Mon Nov 23 2026)', () => {
  const monday = (h: number, min = 0) => at(2026, 10, 23, h, min);

  it('is null with no days', () => {
    expect(nextReminderAt({ days: [], minuteOfDay: MIN_0830 }, monday(7))).toBeNull();
  });

  it('is later today when the time has not passed yet', () => {
    expect(nextReminderAt({ days: [0], minuteOfDay: MIN_0830 }, monday(7))).toBe(
      at(2026, 10, 23, 8, 30),
    );
  });

  it('is next week when today is planned but the time has passed', () => {
    expect(nextReminderAt({ days: [0], minuteOfDay: MIN_0830 }, monday(9))).toBe(
      at(2026, 10, 30, 8, 30),
    );
  });

  it('is strictly after now: exactly 08:30:00 rolls to next week', () => {
    expect(nextReminderAt({ days: [0], minuteOfDay: MIN_0830 }, monday(8, 30))).toBe(
      at(2026, 10, 30, 8, 30),
    );
  });

  it('picks the soonest of several days', () => {
    expect(nextReminderAt({ days: [0, 2, 4], minuteOfDay: MIN_0830 }, monday(9))).toBe(
      at(2026, 10, 25, 8, 30),
    );
    expect(nextReminderAt({ days: [0, 2, 4], minuteOfDay: MIN_0830 }, monday(7))).toBe(
      at(2026, 10, 23, 8, 30),
    );
  });

  it('reaches Sunday at the end of the week', () => {
    expect(nextReminderAt({ days: [6], minuteOfDay: MIN_0830 }, monday(9))).toBe(
      at(2026, 10, 29, 8, 30),
    );
  });

  it('crosses a month boundary (Mon Mar 30 -> Wed Apr 1)', () => {
    expect(nextReminderAt({ days: [2], minuteOfDay: MIN_0830 }, at(2026, 2, 30, 12))).toBe(
      at(2026, 3, 1, 8, 30),
    );
  });

  it('crosses a year boundary (Tue Dec 29 -> Fri Jan 1)', () => {
    expect(nextReminderAt({ days: [4], minuteOfDay: MIN_0830 }, at(2026, 11, 29, 12))).toBe(
      at(2027, 0, 1, 8, 30),
    );
  });

  it('keeps the wall-clock time across spring forward', () => {
    // Sat Mar 7 -> Sun Mar 8 (the 23-hour day) and Mon Mar 9
    expect(nextReminderAt({ days: [6], minuteOfDay: MIN_0830 }, at(2026, 2, 7, 12))).toBe(
      at(2026, 2, 8, 8, 30),
    );
    expect(nextReminderAt({ days: [0], minuteOfDay: MIN_1800 }, at(2026, 2, 7, 12))).toBe(
      at(2026, 2, 9, 18, 0),
    );
  });

  it('keeps the wall-clock time across fall back', () => {
    // Sat Oct 31 -> Sun Nov 1 (the 25-hour day)
    expect(nextReminderAt({ days: [6], minuteOfDay: MIN_0830 }, at(2026, 9, 31, 12))).toBe(
      at(2026, 10, 1, 8, 30),
    );
  });
});

describe('formatNextReminder', () => {
  it('says today, tomorrow, or the weekday', () => {
    const now = at(2026, 10, 23, 7); // Mon Nov 23
    expect(formatNextReminder(at(2026, 10, 23, 8, 30), now)).toBe('today at 08:30');
    expect(formatNextReminder(at(2026, 10, 24, 8, 30), now)).toBe('tomorrow at 08:30');
    expect(formatNextReminder(at(2026, 10, 25, 8, 30), now)).toBe('Wed at 08:30');
    expect(formatNextReminder(at(2026, 10, 29, 18, 0), now)).toBe('Sun at 18:00');
  });

  it('counts calendar days across the DST changes', () => {
    // Sat Mar 7 23:30 -> Sun Mar 8 is "tomorrow" even though the gap is under 24 h of midnights.
    expect(formatNextReminder(at(2026, 2, 8, 8, 30), at(2026, 2, 7, 23, 30))).toBe(
      'tomorrow at 08:30',
    );
    expect(formatNextReminder(at(2026, 2, 9, 18, 0), at(2026, 2, 7, 12))).toBe('Mon at 18:00');
    expect(formatNextReminder(at(2026, 10, 1, 8, 30), at(2026, 9, 31, 23, 30))).toBe(
      'tomorrow at 08:30',
    );
  });
});
describe('parseTimePart', () => {
  it('accepts 1-2 digit values within the limit', () => {
    expect(parseTimePart('0', 23)).toBe(0);
    expect(parseTimePart('07', 23)).toBe(7);
    expect(parseTimePart('23', 23)).toBe(23);
    expect(parseTimePart('59', 59)).toBe(59);
  });

  it('rejects empty, too large, non-numeric and too long input', () => {
    expect(parseTimePart('', 23)).toBeNull();
    expect(parseTimePart('24', 23)).toBeNull();
    expect(parseTimePart('60', 59)).toBeNull();
    expect(parseTimePart('x', 23)).toBeNull();
    expect(parseTimePart('-1', 23)).toBeNull();
    expect(parseTimePart('123', 59)).toBeNull();
  });
});
