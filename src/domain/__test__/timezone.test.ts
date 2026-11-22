// Guards the setup: if these fail, jest.global-setup.js did not pin the time zone
// and the DST tests in the other files would silently test nothing.
describe('test time zone', () => {
  it('is pinned to a zone with daylight saving time', () => {
    const winter = new Date(2026, 0, 15, 12).getTimezoneOffset();
    const summer = new Date(2026, 6, 15, 12).getTimezoneOffset();
    expect(winter).toBe(300); // EST, UTC-5
    expect(summer).toBe(240); // EDT, UTC-4
  });

  it('has a 23-hour and a 25-hour day (2026-03-08 and 2026-11-01)', () => {
    const hours = (a: Date, b: Date) => (b.getTime() - a.getTime()) / 3_600_000;
    expect(hours(new Date(2026, 2, 8), new Date(2026, 2, 9))).toBe(23);
    expect(hours(new Date(2026, 10, 1), new Date(2026, 10, 2))).toBe(25);
  });
});
