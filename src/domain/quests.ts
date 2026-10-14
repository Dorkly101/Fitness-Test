import type { ActivitySession, QuestInstance, QuestObjective, QuestProgress } from './types';
import { dayKey } from './time';
import { isValidSession, compareSessions } from './sessions';

/** Small tolerance so a countdown that ends a few seconds early still counts. */
const SINGLE_SESSION_TOLERANCE_S = 15;

export function objectiveTarget(o: QuestObjective): number {
  switch (o.type) {
    case 'sessions':
      return o.count;
    case 'minutes':
      return o.minutes;
    case 'single_session':
      return o.minutes;
    case 'active_days':
      return o.days;
    case 'distinct_modalities':
      return o.count;
  }
}

export function objectiveLabel(o: QuestObjective): string {
  switch (o.type) {
    case 'sessions':
      return `${o.count} session${o.count === 1 ? '' : 's'}`;
    case 'minutes':
      return `${o.minutes} active minutes`;
    case 'single_session':
      return `One session of ${o.minutes}+ min`;
    case 'active_days':
      return `Active on ${o.days} day${o.days === 1 ? '' : 's'}`;
    case 'distinct_modalities':
      return `${o.count} different activity types`;
  }
}

export function isEligible(q: Pick<QuestInstance, 'eligibleModalities' | 'startAt' | 'expiresAt'>, s: ActivitySession): boolean {
  if (!isValidSession(s)) return false;
  if (q.eligibleModalities !== 'any' && !q.eligibleModalities.includes(s.modality)) return false;
  const t = new Date(s.startAt).getTime();
  if (t < new Date(q.startAt).getTime()) return false;
  if (q.expiresAt && t >= new Date(q.expiresAt).getTime()) return false;
  return true;
}

/**
 * Deterministic quest evaluation. Walks eligible sessions in chronological
 * order and records the session that first meets the target — that session
 * (and only that one) receives the quest reward.
 */
export function evaluateQuest(instance: QuestInstance, sessions: ActivitySession[]): QuestProgress {
  const eligible = sessions.filter((s) => isEligible(instance, s)).sort(compareSessions);
  const o = instance.objective;
  const target = objectiveTarget(o);
  let current = 0;
  let completedBy: ActivitySession | undefined;
  const days = new Set<string>();
  const mods = new Set<string>();
  let seconds = 0;

  for (const s of eligible) {
    switch (o.type) {
      case 'sessions':
        current += 1;
        break;
      case 'minutes':
        seconds += s.activeDurationSeconds;
        current = Math.floor(seconds / 60);
        break;
      case 'single_session': {
        const ok = s.activeDurationSeconds + SINGLE_SESSION_TOLERANCE_S >= o.minutes * 60;
        current = Math.max(current, ok ? o.minutes : Math.floor(s.activeDurationSeconds / 60));
        break;
      }
      case 'active_days':
        days.add(dayKey(s.startAt));
        current = days.size;
        break;
      case 'distinct_modalities':
        mods.add(s.modality);
        current = mods.size;
        break;
    }
    if (!completedBy && current >= target) completedBy = s;
  }

  return {
    instance,
    current: Math.min(current, target),
    target,
    complete: !!completedBy,
    completedBySessionId: completedBy?.id,
    completedAt: completedBy?.endAt ?? completedBy?.startAt,
  };
}
