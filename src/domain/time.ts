/** Date helpers. All "days" and "weeks" are in the player's local time; weeks start Monday. */

import type { Weekday } from './types';

export const DAY_MS = 86_400_000;

export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** YYYY-MM-DD in local time. */
export function dayKey(d: Date | string | number): string {
  const date = new Date(d);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function startOfDay(d: Date | string | number): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addDays(d: Date, n: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

/** Monday = 0 … Sunday = 6 */
export function weekday(d: Date | string | number): Weekday {
  return ((new Date(d).getDay() + 6) % 7) as Weekday;
}

export function startOfWeek(d: Date | string | number): Date {
  const date = startOfDay(d);
  return addDays(date, -weekday(date));
}

export function weekKey(d: Date | string | number): string {
  return dayKey(startOfWeek(d));
}

/** Parse a YYYY-MM-DD key as local midnight. */
export function fromDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function daysBetween(a: Date | string, b: Date | string): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS);
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${pad(m)}:${pad(sec)}`;
  return `${pad(m)}:${pad(sec)}`;
}

export function formatMinutes(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/** Value for an <input type="datetime-local"> in local time. */
export function toLocalInput(d: Date | string): string {
  const date = new Date(d);
  return `${dayKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
