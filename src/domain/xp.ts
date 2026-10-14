/**
 * XP economy — simple, transparent and bounded (spec §7.2).
 * XP is a game reward for showing up. It is not calories, fitness, or a health measure.
 */

export const XP_RULES = {
  baseXP: 15,
  /** Base XP for the 4th+ session logged on the same calendar day (diminishing, never zero). */
  diminishedBaseXP: 5,
  /** Sessions per day that earn full base XP. */
  fullRewardSessionsPerDay: 3,
  minutesPerDurationXP: 5,
  maxDurationXP: 10,
  maxQuestXPPerSession: 10,
  /** Minimum active duration for a session to earn XP. Shorter sessions are still logged. */
  minValidSeconds: 60,
} as const;

export function durationXP(activeSeconds: number): number {
  const minutes = Math.floor(activeSeconds / 60);
  return Math.min(XP_RULES.maxDurationXP, Math.floor(minutes / XP_RULES.minutesPerDurationXP));
}

export function baseXP(sameDayIndex: number): number {
  return sameDayIndex < XP_RULES.fullRewardSessionsPerDay ? XP_RULES.baseXP : XP_RULES.diminishedBaseXP;
}

export function capQuestXP(sum: number): number {
  return Math.max(0, Math.min(XP_RULES.maxQuestXPPerSession, sum));
}

/** XP needed to advance from `level` to `level + 1`. Single configurable curve. */
export function xpForNextLevel(level: number): number {
  return 100 + 20 * (Math.max(1, level) - 1);
}

/** Total XP required to *reach* `level` from level 1. */
export function totalXPForLevel(level: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) total += xpForNextLevel(l);
  return total;
}

export interface LevelInfo {
  level: number;
  /** XP earned inside the current level. */
  intoLevel: number;
  /** XP span of the current level. */
  span: number;
  progress: number;
}

export function levelFromXP(totalXP: number): LevelInfo {
  let level = 1;
  let remaining = Math.max(0, Math.floor(totalXP));
  while (remaining >= xpForNextLevel(level)) {
    remaining -= xpForNextLevel(level);
    level++;
  }
  const span = xpForNextLevel(level);
  return { level, intoLevel: remaining, span, progress: remaining / span };
}

/** Domain ranks use a flatter curve so each attribute visibly moves. */
export function domainRank(points: number): LevelInfo {
  let level = 1;
  let remaining = Math.max(0, Math.floor(points));
  const step = (l: number) => 60 + 15 * (l - 1);
  while (remaining >= step(level)) {
    remaining -= step(level);
    level++;
  }
  const span = step(level);
  return { level, intoLevel: remaining, span, progress: remaining / span };
}
