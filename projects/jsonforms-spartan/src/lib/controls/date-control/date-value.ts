/**
 * `format: date` values are `YYYY-MM-DD` strings. They are built from and read as local date parts, never
 * through `toISOString()`, which converts to UTC and can shift the day.
 */

/** Formats the local year, month and day of `date` as `YYYY-MM-DD`. */
export function formatDateValue(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Parses `YYYY-MM-DD` as a local date at midnight, or returns `undefined` if it isn't a real date. */
export function parseDateValue(value: unknown): Date | undefined {
  if (typeof value !== 'string') return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  date.setFullYear(year); // Years 0-99 are otherwise read as 1900-1999.
  const real =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return real ? date : undefined;
}
