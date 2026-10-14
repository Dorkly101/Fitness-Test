import type { ActiveTimer } from './types';

/**
 * Timer math. Elapsed time is always computed from wall-clock timestamps of
 * accumulated active intervals, so a sleeping tab, throttled rendering or a
 * reload cannot distort the recorded duration.
 */

export function elapsedMs(timer: Pick<ActiveTimer, 'intervals'>, now: number): number {
  let total = 0;
  for (const iv of timer.intervals) {
    const end = iv.end ?? now;
    if (end > iv.start) total += end - iv.start;
  }
  return total;
}

export function isRunning(timer: Pick<ActiveTimer, 'intervals'>): boolean {
  const last = timer.intervals[timer.intervals.length - 1];
  return !!last && last.end === undefined;
}

export function pauseTimer<T extends Pick<ActiveTimer, 'intervals'>>(timer: T, now: number): T {
  if (!isRunning(timer)) return timer;
  const intervals = timer.intervals.slice();
  intervals[intervals.length - 1] = { ...intervals[intervals.length - 1], end: now };
  return { ...timer, intervals };
}

export function resumeTimer<T extends Pick<ActiveTimer, 'intervals'>>(timer: T, now: number): T {
  if (isRunning(timer)) return timer;
  return { ...timer, intervals: [...timer.intervals, { start: now }] };
}

/** Seconds remaining on a countdown, or undefined if the timer has no target. */
export function remainingSeconds(timer: Pick<ActiveTimer, 'intervals' | 'targetSeconds'>, now: number): number | undefined {
  if (!timer.targetSeconds) return undefined;
  return Math.max(0, timer.targetSeconds - elapsedMs(timer, now) / 1000);
}

/**
 * A timer that has been running for a very long time (e.g. the app was left
 * open overnight) should not silently record that time. Above this threshold
 * the review screen asks the player to confirm the duration.
 */
export const SUSPICIOUS_ELAPSED_SECONDS = 4 * 3600;
