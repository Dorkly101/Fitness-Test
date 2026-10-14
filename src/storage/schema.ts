/**
 * Versioned schema with migration-safe defaults and validation of untrusted
 * input (imports and possibly-corrupted local storage).
 */
import type { ActivitySession, AppData, Modality, UserProfile, UserSettings, WeeklyTargets } from '../domain/types';
import { ALL_MODALITIES, emptyDetails } from '../domain/modalities';

export const SCHEMA_VERSION = 1;

export function emptyData(): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    profile: null,
    sessions: [],
    activeTimer: null,
    missionBoards: {},
    weeklyBoards: {},
    customExercises: [],
    exerciseOverrides: {},
    templates: [],
    seenRewards: [],
    weeklyReviews: {},
    dismissedOffers: [],
  };
}

export const DEFAULT_SETTINGS: UserSettings = { motion: 'system', sound: false, highContrast: false, fontScale: 1, units: 'kg' };
export const DEFAULT_TARGETS: WeeklyTargets = { sessions: 3, movementMinutes: 0, strengthSessions: 0, mindfulnessSessions: 0 };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isIso = (v: unknown): v is string => isStr(v) && !Number.isNaN(Date.parse(v));
const isModality = (v: unknown): v is Modality => isStr(v) && (ALL_MODALITIES as string[]).includes(v);

export class ValidationError extends Error {}

function normaliseProfile(p: unknown): UserProfile | null {
  if (p == null) return null;
  if (!isObj(p)) throw new ValidationError('Profile is not an object.');
  if (!isStr(p.id)) throw new ValidationError('Profile is missing an id.');
  const arr = <T,>(v: unknown, guard: (x: unknown) => x is T): T[] => (Array.isArray(v) ? v.filter(guard) : []);
  const enabled = arr(p.enabledModalities, isModality);
  const targets = isObj(p.weeklyTargets) ? p.weeklyTargets : {};
  const settings = isObj(p.settings) ? p.settings : {};
  const num = (v: unknown, d: number, min = 0, max = 10_000) => (isNum(v) ? Math.min(max, Math.max(min, v)) : d);
  return {
    id: p.id,
    callsign: isStr(p.callsign) ? p.callsign.slice(0, 40) : undefined,
    createdAt: isIso(p.createdAt) ? p.createdAt : new Date().toISOString(),
    updatedAt: isIso(p.updatedAt) ? p.updatedAt : new Date().toISOString(),
    enabledModalities: enabled.length ? enabled : ['walking_pad', 'meditation'],
    favouriteModalities: arr(p.favouriteModalities, isModality),
    modalityLabels: isObj(p.modalityLabels)
      ? Object.fromEntries(Object.entries(p.modalityLabels).filter(([k, v]) => isModality(k) && isStr(v)).map(([k, v]) => [k, (v as string).slice(0, 40)]))
      : {},
    availableEquipment: arr(p.availableEquipment, isStr),
    excludedMovements: arr(p.excludedMovements, isStr),
    safetyNotes: isStr(p.safetyNotes) ? p.safetyNotes.slice(0, 1000) : undefined,
    weeklyAvailability: arr(p.weeklyAvailability, (x): x is 0 | 1 | 2 | 3 | 4 | 5 | 6 => isNum(x) && x >= 0 && x <= 6 && Number.isInteger(x)),
    preferredDurationRange: (['5-15', '15-30', '30-45', '45-60'] as const).find((r) => r === p.preferredDurationRange) ?? '15-30',
    startingBaseline: (['new', 'returning', 'regular'] as const).find((r) => r === p.startingBaseline) ?? 'new',
    primaryMotivations: arr(p.primaryMotivations, (x): x is UserProfile['primaryMotivations'][number] =>
      isStr(x) && ['consistency', 'strength', 'endurance', 'mindfulness', 'variety'].includes(x),
    ),
    weeklyTargets: {
      sessions: num(targets.sessions, DEFAULT_TARGETS.sessions, 1, 21),
      movementMinutes: num(targets.movementMinutes, 0, 0, 2000),
      strengthSessions: num(targets.strengthSessions, 0, 0, 14),
      mindfulnessSessions: num(targets.mindfulnessSessions, 0, 0, 21),
    },
    standingTargets: isObj(p.standingTargets)
      ? Object.fromEntries(Object.entries(p.standingTargets).filter(([k, v]) => isModality(k) && isNum(v) && v > 0 && v <= 240))
      : {},
    flaggedModalities: arr(p.flaggedModalities, isModality),
    flaggedExercises: arr(p.flaggedExercises, isStr),
    activeTitleId: isStr(p.activeTitleId) ? p.activeTitleId : undefined,
    settings: {
      motion: (['system', 'reduced', 'full'] as const).find((m) => m === settings.motion) ?? DEFAULT_SETTINGS.motion,
      sound: typeof settings.sound === 'boolean' ? settings.sound : DEFAULT_SETTINGS.sound,
      highContrast: typeof settings.highContrast === 'boolean' ? settings.highContrast : false,
      fontScale: ([1, 1.125, 1.25] as const).find((f) => f === settings.fontScale) ?? 1,
      units: settings.units === 'lb' ? 'lb' : 'kg',
    },
  };
}

function normaliseSession(s: unknown, i: number): ActivitySession {
  if (!isObj(s)) throw new ValidationError(`Session #${i + 1} is not an object.`);
  if (!isStr(s.id)) throw new ValidationError(`Session #${i + 1} is missing an id.`);
  if (!isModality(s.modality)) throw new ValidationError(`Session #${i + 1} has an unknown activity type.`);
  if (!isIso(s.startAt)) throw new ValidationError(`Session #${i + 1} has an invalid start time.`);
  if (!isNum(s.activeDurationSeconds) || s.activeDurationSeconds < 0 || s.activeDurationSeconds > 24 * 3600) {
    throw new ValidationError(`Session #${i + 1} has an invalid duration.`);
  }
  const status = (['in_progress', 'completed', 'cancelled'] as const).find((x) => x === s.status) ?? 'completed';
  const source = (['timer', 'quick_log', 'imported'] as const).find((x) => x === s.source) ?? 'imported';
  const fb = (['easy', 'about_right', 'too_hard', 'uncomfortable'] as const).find((x) => x === s.effortFeedback);
  const details = isObj(s.details) && isStr(s.details.kind) ? (s.details as unknown as ActivitySession['details']) : emptyDetails(s.modality);
  if (details.kind === 'strength' && !Array.isArray(details.entries)) throw new ValidationError(`Session #${i + 1} has malformed strength data.`);
  return {
    id: s.id,
    modality: s.modality,
    startAt: s.startAt,
    endAt: isIso(s.endAt) ? s.endAt : undefined,
    activeDurationSeconds: Math.round(s.activeDurationSeconds),
    status,
    source,
    notes: isStr(s.notes) ? s.notes.slice(0, 2000) : undefined,
    effortFeedback: fb,
    details,
    missionInstanceId: isStr(s.missionInstanceId) ? s.missionInstanceId : undefined,
    createdAt: isIso(s.createdAt) ? s.createdAt : s.startAt,
    updatedAt: isIso(s.updatedAt) ? s.updatedAt : s.startAt,
  };
}

/** Migrate older schema versions forward. v1 is the first release. */
function migrate(raw: Record<string, unknown>): Record<string, unknown> {
  const v = isNum(raw.schemaVersion) ? raw.schemaVersion : 1;
  if (v > SCHEMA_VERSION) throw new ValidationError(`This file was created by a newer version of FRONTIER (schema ${v}).`);
  return raw;
}

/** Validate and normalise untrusted data into AppData. Throws ValidationError. */
export function parseAppData(input: unknown): AppData {
  if (!isObj(input)) throw new ValidationError('File is not a FRONTIER data export.');
  const raw = migrate(isObj(input.data) && input.app === 'frontier' ? input.data : input);
  if (!('sessions' in raw) && !('profile' in raw)) throw new ValidationError('File does not contain FRONTIER data (no profile or sessions).');
  const base = emptyData();
  const sessionsRaw = raw.sessions ?? [];
  if (!Array.isArray(sessionsRaw)) throw new ValidationError('“sessions” must be a list.');
  const sessions = sessionsRaw.map(normaliseSession);
  const ids = new Set<string>();
  const unique = sessions.filter((s) => (ids.has(s.id) ? false : (ids.add(s.id), true)));
  return {
    ...base,
    profile: normaliseProfile(raw.profile),
    sessions: unique,
    activeTimer: isObj(raw.activeTimer) && Array.isArray(raw.activeTimer.intervals) ? (raw.activeTimer as unknown as AppData['activeTimer']) : null,
    missionBoards: isObj(raw.missionBoards) ? (raw.missionBoards as AppData['missionBoards']) : {},
    weeklyBoards: isObj(raw.weeklyBoards) ? (raw.weeklyBoards as AppData['weeklyBoards']) : {},
    customExercises: Array.isArray(raw.customExercises) ? (raw.customExercises as AppData['customExercises']).filter((e) => isObj(e) && isStr(e.id) && isStr(e.name)) : [],
    exerciseOverrides: isObj(raw.exerciseOverrides) ? (raw.exerciseOverrides as AppData['exerciseOverrides']) : {},
    templates: Array.isArray(raw.templates) ? (raw.templates as AppData['templates']).filter((t) => isObj(t) && isStr(t.id) && Array.isArray(t.exerciseIds)) : [],
    seenRewards: Array.isArray(raw.seenRewards) ? raw.seenRewards.filter(isStr) : [],
    weeklyReviews: isObj(raw.weeklyReviews) ? (raw.weeklyReviews as AppData['weeklyReviews']) : {},
    dismissedOffers: Array.isArray(raw.dismissedOffers) ? raw.dismissedOffers.filter(isStr) : [],
  };
}

export interface ExportFile {
  app: 'frontier';
  exportedAt: string;
  schemaVersion: number;
  data: AppData;
}

export function toExportFile(data: AppData, now = new Date()): ExportFile {
  return { app: 'frontier', exportedAt: now.toISOString(), schemaVersion: SCHEMA_VERSION, data: { ...data, activeTimer: null } };
}

/**
 * Merge an import into existing data. Sessions merge by id (the newer
 * `updatedAt` wins), so importing the same file twice changes nothing and
 * cannot duplicate rewards — rewards are derived from unique sessions.
 */
export function mergeData(current: AppData, incoming: AppData): AppData {
  const byId = new Map(current.sessions.map((s) => [s.id, s]));
  for (const s of incoming.sessions) {
    const existing = byId.get(s.id);
    if (!existing || existing.updatedAt < s.updatedAt) byId.set(s.id, s);
  }
  const uniq = <T,>(a: T[], key: (x: T) => string) => {
    const m = new Map<string, T>();
    for (const x of a) if (!m.has(key(x))) m.set(key(x), x);
    return [...m.values()];
  };
  return {
    ...current,
    profile: current.profile ?? incoming.profile,
    sessions: [...byId.values()],
    missionBoards: { ...incoming.missionBoards, ...current.missionBoards },
    weeklyBoards: { ...incoming.weeklyBoards, ...current.weeklyBoards },
    customExercises: uniq([...current.customExercises, ...incoming.customExercises], (e) => e.id),
    exerciseOverrides: { ...incoming.exerciseOverrides, ...current.exerciseOverrides },
    templates: uniq([...current.templates, ...incoming.templates], (t) => t.id),
    seenRewards: [...new Set([...current.seenRewards, ...incoming.seenRewards])],
    weeklyReviews: { ...incoming.weeklyReviews, ...current.weeklyReviews },
    dismissedOffers: [...new Set([...current.dismissedOffers, ...incoming.dismissedOffers])],
  };
}
