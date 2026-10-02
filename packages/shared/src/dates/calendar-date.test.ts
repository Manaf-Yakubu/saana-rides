import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  calendarDate,
  compareDates,
  dayOfMonth,
  dayOfWeek,
  diffDays,
  isCalendarDate,
  toCalendarDate,
  today,
} from './calendar-date';

const d = calendarDate;

describe('calendar dates', () => {
  it('validates ISO dates including leap years', () => {
    expect(isCalendarDate('2024-02-29')).toBe(true);
    expect(isCalendarDate('2025-02-29')).toBe(false);
    expect(isCalendarDate('2025-13-01')).toBe(false);
    expect(isCalendarDate('2025-1-01')).toBe(false);
    expect(() => calendarDate('nope')).toThrow(RangeError);
  });

  it('derives the Accra calendar date of an instant', () => {
    expect(toCalendarDate(new Date('2026-01-01T23:59:59Z'))).toBe('2026-01-01');
    expect(toCalendarDate(new Date('2026-01-01T23:30:00Z'), 'Africa/Lagos')).toBe('2026-01-02');
    expect(today(new Date('2026-06-15T10:00:00Z'))).toBe('2026-06-15');
  });

  it('adds days across month and year boundaries', () => {
    expect(addDays(d('2025-12-31'), 1)).toBe('2026-01-01');
    expect(addDays(d('2024-02-28'), 1)).toBe('2024-02-29');
    expect(addDays(d('2026-03-01'), -1)).toBe('2026-02-28');
  });

  it('adds months with end-of-month clamping and anchoring', () => {
    expect(addMonths(d('2026-01-31'), 1)).toBe('2026-02-28');
    expect(addMonths(d('2024-01-31'), 1)).toBe('2024-02-29');
    expect(addMonths(d('2026-02-28'), 1, 31)).toBe('2026-03-31');
    expect(addMonths(d('2026-11-15'), 3)).toBe('2027-02-15');
    expect(addMonths(d('2026-03-15'), -3)).toBe('2025-12-15');
  });

  it('computes day differences, weekdays and ordering', () => {
    expect(diffDays(d('2026-01-01'), d('2026-03-01'))).toBe(59);
    expect(diffDays(d('2026-03-01'), d('2026-01-01'))).toBe(-59);
    expect(dayOfWeek(d('2026-10-04'))).toBe(0); // Sunday
    expect(dayOfMonth(d('2026-10-04'))).toBe(4);
    expect(compareDates(d('2026-01-01'), d('2026-01-02'))).toBe(-1);
    expect(compareDates(d('2026-01-02'), d('2026-01-01'))).toBe(1);
    expect(compareDates(d('2026-01-01'), d('2026-01-01'))).toBe(0);
  });
});
