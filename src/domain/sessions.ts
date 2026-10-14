import type { ActivitySession } from './types';
import { XP_RULES } from './xp';

/** A session counts toward progression when completed and at least one minute long. */
export function isValidSession(s: ActivitySession): boolean {
  return s.status === 'completed' && s.activeDurationSeconds >= XP_RULES.minValidSeconds;
}

/** Deterministic chronological order: start time, then creation time, then id. */
export function compareSessions(a: ActivitySession, b: ActivitySession): number {
  return (
    a.startAt.localeCompare(b.startAt) ||
    a.createdAt.localeCompare(b.createdAt) ||
    a.id.localeCompare(b.id)
  );
}

export function sortedValidSessions(sessions: ActivitySession[]): ActivitySession[] {
  return sessions.filter(isValidSession).sort(compareSessions);
}

export function sessionMinutes(s: ActivitySession): number {
  return s.activeDurationSeconds / 60;
}

export function strengthSetCount(s: ActivitySession): number {
  if (s.details.kind !== 'strength') return 0;
  return s.details.entries.reduce((n, e) => n + e.sets.length, 0);
}

/**
 * Detect an accidental double submission: same modality, same start minute
 * and same duration as a session saved in the last few seconds.
 */
export function looksLikeDuplicate(
  candidate: Pick<ActivitySession, 'modality' | 'startAt' | 'activeDurationSeconds'>,
  existing: ActivitySession[],
  now: number,
): boolean {
  const minute = (iso: string) => new Date(iso).toISOString().slice(0, 16);
  return existing.some(
    (s) =>
      s.modality === candidate.modality &&
      minute(s.startAt) === minute(candidate.startAt) &&
      Math.abs(s.activeDurationSeconds - candidate.activeDurationSeconds) < 30 &&
      now - new Date(s.createdAt).getTime() < 10_000,
  );
}
