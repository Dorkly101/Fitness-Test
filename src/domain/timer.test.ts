import { describe, expect, it } from 'vitest';
import { elapsedMs, isRunning, pauseTimer, remainingSeconds, resumeTimer } from './timer';

const t0 = 1_700_000_000_000;

describe('timed session duration', () => {
  it('measures from timestamps, not ticks', () => {
    const timer = { intervals: [{ start: t0 }] };
    // No ticks happened; 10 minutes of wall clock passed (e.g. tab backgrounded).
    expect(elapsedMs(timer, t0 + 600_000)).toBe(600_000);
  });

  it('accumulates only active intervals across pause and resume', () => {
    let timer = { intervals: [{ start: t0 }] as { start: number; end?: number }[] };
    timer = pauseTimer(timer, t0 + 60_000); // 1 min active
    expect(isRunning(timer)).toBe(false);
    expect(elapsedMs(timer, t0 + 600_000)).toBe(60_000); // paused time not counted
    timer = resumeTimer(timer, t0 + 600_000);
    expect(isRunning(timer)).toBe(true);
    expect(elapsedMs(timer, t0 + 720_000)).toBe(180_000); // +2 min
  });

  it('pause and resume are idempotent', () => {
    let timer = { intervals: [{ start: t0 }] as { start: number; end?: number }[] };
    timer = pauseTimer(pauseTimer(timer, t0 + 1000), t0 + 5000);
    expect(timer.intervals).toHaveLength(1);
    expect(timer.intervals[0].end).toBe(t0 + 1000);
    timer = resumeTimer(resumeTimer(timer, t0 + 2000), t0 + 9000);
    expect(timer.intervals).toHaveLength(2);
    expect(timer.intervals[1].start).toBe(t0 + 2000);
  });

  it('survives a reload: a serialised timer resumes with the right elapsed time', () => {
    const timer = { intervals: [{ start: t0, end: t0 + 120_000 }, { start: t0 + 300_000 }] };
    const restored = JSON.parse(JSON.stringify(timer));
    expect(elapsedMs(restored, t0 + 360_000)).toBe(180_000);
  });

  it('computes countdown remaining time', () => {
    const timer = { intervals: [{ start: t0 }], targetSeconds: 300 };
    expect(remainingSeconds(timer, t0 + 60_000)).toBe(240);
    expect(remainingSeconds(timer, t0 + 900_000)).toBe(0);
    expect(remainingSeconds({ intervals: [] }, t0)).toBeUndefined();
  });
});
