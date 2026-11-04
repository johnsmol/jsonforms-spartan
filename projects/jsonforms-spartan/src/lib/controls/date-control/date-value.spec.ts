import { formatDateValue, parseDateValue } from './date-value';

describe('date values', () => {
  it('formats local date parts, zero padded', () => {
    expect(formatDateValue(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(formatDateValue(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
  });

  it('does not shift the day near midnight, whatever the time zone', () => {
    expect(formatDateValue(new Date(2026, 5, 15, 0, 0, 0))).toBe('2026-06-15');
    expect(formatDateValue(new Date(2026, 5, 15, 23, 59, 59))).toBe('2026-06-15');
  });

  it('parses a date as local midnight', () => {
    const date = parseDateValue('2026-03-09')!;
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([
      2026, 2, 9, 0,
    ]);
  });

  it('round-trips', () => {
    for (const value of ['2026-02-28', '2024-02-29', '0099-01-01', '2026-12-31']) {
      expect(formatDateValue(parseDateValue(value)!)).toBe(value);
    }
  });

  it('rejects anything that is not a real YYYY-MM-DD date', () => {
    for (const value of ['', '2026-02-30', '2026-13-01', '2026-1-1', 'tomorrow', null, 5]) {
      expect(parseDateValue(value)).toBeUndefined();
    }
  });
});
