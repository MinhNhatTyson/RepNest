import { COMEBACK_GAP_DAYS, daysSinceLastSession, isComeback } from '../comeback';

// Tests run in America/New_York (see jest.global-setup.js).
// Month is 0-based, like Date.
const at = (y: number, m: number, d: number, h = 12, min = 0): number =>
  new Date(y, m, d, h, min).getTime();

describe('daysSinceLastSession', () => {
  it('is null with no sessions', () => {
    expect(daysSinceLastSession([], at(2026, 5, 10))).toBeNull();
  });

  it('is 0 on the same day', () => {
    expect(daysSinceLastSession([at(2026, 5, 10, 7)], at(2026, 5, 10, 22))).toBe(0);
  });

  it('counts calendar days, not blocks of 24 hours', () => {
    expect(daysSinceLastSession([at(2026, 5, 10, 23, 59)], at(2026, 5, 11, 0, 1))).toBe(1);
  });

  it('uses the most recent session whatever the order', () => {
    const times = [at(2026, 5, 1), at(2026, 5, 9), at(2026, 5, 3)];
    expect(daysSinceLastSession(times, at(2026, 5, 10))).toBe(1);
  });

  it.each([
    { label: 'across spring forward (47 h)', from: at(2026, 2, 7), to: at(2026, 2, 9), days: 2 },
    { label: '14 days across spring forward', from: at(2026, 2, 1), to: at(2026, 2, 15), days: 14 },
    { label: 'across fall back (49 h)', from: at(2026, 9, 31), to: at(2026, 10, 2), days: 2 },
    { label: '14 days across fall back', from: at(2026, 9, 25), to: at(2026, 10, 8), days: 14 },
  ])('is a whole number of days $label', ({ from, to, days }) => {
    expect(daysSinceLastSession([from], to)).toBe(days);
  });

  it('handles month and year boundaries', () => {
    expect(daysSinceLastSession([at(2026, 0, 31)], at(2026, 2, 1))).toBe(29); // Feb 2026 has 28 days
    expect(daysSinceLastSession([at(2028, 0, 31)], at(2028, 2, 1))).toBe(30); // Feb 2028 has 29
    expect(daysSinceLastSession([at(2025, 11, 31)], at(2026, 0, 1))).toBe(1);
  });
});

describe('isComeback', () => {
  it('is false for a brand new user (no history is not a comeback)', () => {
    expect(isComeback([], at(2026, 5, 10))).toBe(false);
  });

  it('is false for a session today', () => {
    expect(isComeback([at(2026, 5, 10, 8)], at(2026, 5, 10, 20))).toBe(false);
  });

  it('uses the most recent session, not the oldest', () => {
    const times = [at(2026, 4, 1), at(2026, 5, 9)];
    expect(isComeback(times, at(2026, 5, 10))).toBe(false);
  });

  it.each([
    { label: 'summer (no DST change)', y: 2026, m: 5, d: 15 },
    { label: 'a gap spanning spring forward', y: 2026, m: 2, d: 11 },
    { label: 'a gap spanning fall back', y: 2026, m: 10, d: 4 },
  ])('switches on exactly at the gap length in $label', ({ y, m, d }) => {
    const now = at(y, m, d, 12);
    const lastSession = (daysAgo: number) => [at(y, m, d - daysAgo, 20)];

    expect(isComeback(lastSession(COMEBACK_GAP_DAYS - 1), now)).toBe(false);
    expect(isComeback(lastSession(COMEBACK_GAP_DAYS), now)).toBe(true);
    expect(isComeback(lastSession(COMEBACK_GAP_DAYS + 10), now)).toBe(true);
  });
});
