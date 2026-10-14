import { describe, expect, it } from 'vitest';
import { baseXP, capQuestXP, durationXP, levelFromXP, totalXPForLevel, xpForNextLevel, XP_RULES } from './xp';

describe('XP rules', () => {
  it('awards 1 XP per five active minutes, capped at +10', () => {
    expect(durationXP(0)).toBe(0);
    expect(durationXP(4 * 60 + 59)).toBe(0);
    expect(durationXP(5 * 60)).toBe(1);
    expect(durationXP(24 * 60)).toBe(4);
    expect(durationXP(50 * 60)).toBe(10);
    expect(durationXP(240 * 60)).toBe(XP_RULES.maxDurationXP);
  });

  it('gives full base XP for the first three sessions of a day, then a diminished (non-zero) amount', () => {
    expect(baseXP(0)).toBe(15);
    expect(baseXP(2)).toBe(15);
    expect(baseXP(3)).toBe(5);
    expect(baseXP(10)).toBeGreaterThan(0);
  });

  it('caps quest XP at +10 per session and never goes negative', () => {
    expect(capQuestXP(5)).toBe(5);
    expect(capQuestXP(25)).toBe(10);
    expect(capQuestXP(-3)).toBe(0);
  });
});

describe('level curve', () => {
  it('requires 100 + 20 × (level − 1) XP for the next level', () => {
    expect(xpForNextLevel(1)).toBe(100);
    expect(xpForNextLevel(2)).toBe(120);
    expect(xpForNextLevel(5)).toBe(180);
  });

  it('computes level thresholds exactly', () => {
    expect(levelFromXP(0).level).toBe(1);
    expect(levelFromXP(99).level).toBe(1);
    expect(levelFromXP(100).level).toBe(2);
    expect(levelFromXP(219).level).toBe(2);
    expect(levelFromXP(220).level).toBe(3);
    expect(totalXPForLevel(3)).toBe(220);
    const info = levelFromXP(160);
    expect(info.intoLevel).toBe(60);
    expect(info.span).toBe(120);
    expect(info.progress).toBeCloseTo(0.5);
  });
});
