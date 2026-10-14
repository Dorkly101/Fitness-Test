import type { ActivitySession, Modality, UserProfile } from './types';
import { emptyDetails } from './modalities';
import { DEFAULT_SETTINGS } from '../storage/schema';

let n = 0;
export function makeSession(partial: Partial<ActivitySession> & { modality?: Modality; startAt: string; minutes?: number }): ActivitySession {
  const modality = partial.modality ?? 'walking_pad';
  const secs = partial.activeDurationSeconds ?? (partial.minutes ?? 20) * 60;
  const id = partial.id ?? `s${++n}`;
  return {
    id,
    modality,
    startAt: partial.startAt,
    endAt: partial.endAt ?? new Date(new Date(partial.startAt).getTime() + secs * 1000).toISOString(),
    activeDurationSeconds: secs,
    status: partial.status ?? 'completed',
    source: partial.source ?? 'quick_log',
    effortFeedback: partial.effortFeedback,
    details: partial.details ?? emptyDetails(modality),
    createdAt: partial.createdAt ?? partial.startAt,
    updatedAt: partial.updatedAt ?? partial.startAt,
    notes: partial.notes,
  };
}

export function makeProfile(partial: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'p1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    enabledModalities: ['walking_pad', 'strength', 'meditation', 'breathwork', 'cycling'],
    favouriteModalities: ['walking_pad', 'strength'],
    modalityLabels: {},
    availableEquipment: ['dumbbells'],
    excludedMovements: [],
    weeklyAvailability: [0, 1, 2, 3, 4, 5, 6],
    preferredDurationRange: '15-30',
    startingBaseline: 'new',
    primaryMotivations: ['consistency'],
    weeklyTargets: { sessions: 3, movementMinutes: 0, strengthSessions: 0, mindfulnessSessions: 0 },
    standingTargets: {},
    flaggedModalities: [],
    flaggedExercises: [],
    settings: DEFAULT_SETTINGS,
    ...partial,
  };
}

/** Local-time ISO helper: day offset from a fixed Monday (2026-03-02). */
export function at(dayOffset: number, hour = 9, minute = 0): string {
  const d = new Date(2026, 2, 2 + dayOffset, hour, minute);
  return d.toISOString();
}
