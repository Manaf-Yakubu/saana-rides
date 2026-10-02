/**
 * Calendar dates (no time) in the business timezone, as ISO strings `YYYY-MM-DD`.
 * Instants are stored in UTC; due dates and sales dates are Accra calendar dates.
 */
export const BUSINESS_TIMEZONE = 'Africa/Accra';

export type CalendarDate = string & { readonly __brand: 'CalendarDate' };

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

function toUtcMs(date: CalendarDate): number {
  const [, y, m, d] = ISO_DATE.exec(date)!;
  return Date.UTC(Number(y), Number(m) - 1, Number(d));
}

function fromUtcMs(ms: number): CalendarDate {
  return new Date(ms).toISOString().slice(0, 10) as CalendarDate;
}

export function isCalendarDate(value: string): value is CalendarDate {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match;
  const dt = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  return (
    dt.getUTCFullYear() === Number(y) &&
    dt.getUTCMonth() === Number(m) - 1 &&
    dt.getUTCDate() === Number(d)
  );
}

export function calendarDate(value: string): CalendarDate {
  if (!isCalendarDate(value)) throw new RangeError(`Invalid calendar date: ${value}`);
  return value;
}

/** The calendar date of an instant in the given timezone (default Africa/Accra). */
export function toCalendarDate(instant: Date, timeZone: string = BUSINESS_TIMEZONE): CalendarDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}` as CalendarDate;
}

export function today(now: Date = new Date(), timeZone: string = BUSINESS_TIMEZONE): CalendarDate {
  return toCalendarDate(now, timeZone);
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  return fromUtcMs(toUtcMs(date) + days * DAY_MS);
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/**
 * Adds whole months, clamping to the last day of shorter months.
 * `anchorDay` keeps the original day-of-month across a series (Jan 31 -> Feb 28 -> Mar 31).
 */
export function addMonths(date: CalendarDate, months: number, anchorDay?: number): CalendarDate {
  const [, y, m, d] = ISO_DATE.exec(date)!;
  const total = Number(y) * 12 + (Number(m) - 1) + months;
  const year = Math.floor(total / 12);
  const monthIndex = total - year * 12;
  const day = Math.min(anchorDay ?? Number(d), daysInMonth(year, monthIndex));
  return fromUtcMs(Date.UTC(year, monthIndex, day));
}

/** Whole days from `a` to `b` (positive when b is later). */
export function diffDays(a: CalendarDate, b: CalendarDate): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / DAY_MS);
}

/** 0 = Sunday ... 6 = Saturday. */
export function dayOfWeek(date: CalendarDate): number {
  return new Date(toUtcMs(date)).getUTCDay();
}

export function dayOfMonth(date: CalendarDate): number {
  return Number(date.slice(8, 10));
}

export function compareDates(a: CalendarDate, b: CalendarDate): -1 | 0 | 1 {
  return a === b ? 0 : a < b ? -1 : 1;
}
