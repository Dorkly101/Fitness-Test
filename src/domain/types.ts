/**
 * FRONTIER domain model.
 *
 * Design decision: progression (XP, levels, quest completion, map unlocks,
 * achievements) is *derived* from the session log rather than stored as
 * mutable totals. The reward ledger is rebuilt deterministically with
 * idempotency keys, so editing, deleting, re-importing or refreshing can
 * never duplicate an award. Only things that cannot be derived — the user's
 * profile, their sessions, the daily mission boards they were offered, and
 * which reveals they have already seen — are persisted.
 */

export type Modality =
  | 'strength'
  | 'walking_pad'
  | 'treadmill'
  | 'cycling'
  | 'elliptical'
  | 'vr_active'
  | 'meditation'
  | 'breathwork'
  | 'mobility'
  | 'other';

/** Fictional game attributes. These describe participation, not physical ability. */
export type Domain = 'strength' | 'endurance' | 'focus' | 'recovery';
export type Attribute = Domain | 'consistency';

export type Motivation = 'consistency' | 'strength' | 'endurance' | 'mindfulness' | 'variety';

export type EffortFeedback = 'easy' | 'about_right' | 'too_hard' | 'uncomfortable';

export type DurationRange = '5-15' | '15-30' | '30-45' | '45-60';

export type Baseline = 'new' | 'returning' | 'regular';

export type MotionPreference = 'system' | 'reduced' | 'full';

/** 0 = Monday … 6 = Sunday */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface WeeklyTargets {
  /** "Field Presence" — number of sessions the player chose for the week. */
  sessions: number;
  /** Optional. Minutes of movement (endurance modalities). 0 = no target. */
  movementMinutes: number;
  /** Optional. Strength sessions. 0 = no target. */
  strengthSessions: number;
  /** Optional. Meditation/breathwork sessions. 0 = no target. */
  mindfulnessSessions: number;
}

export interface UserSettings {
  motion: MotionPreference;
  sound: boolean;
  highContrast: boolean;
  fontScale: 1 | 1.125 | 1.25;
  units: 'kg' | 'lb';
}

export interface UserProfile {
  id: string;
  callsign?: string;
  createdAt: string;
  updatedAt: string;
  enabledModalities: Modality[];
  /** Ordered favourites (rank 0 = most preferred). Subset of enabled. */
  favouriteModalities: Modality[];
  /** User-chosen display names, e.g. "Rowing" for 'other'. */
  modalityLabels: Partial<Record<Modality, string>>;
  availableEquipment: string[];
  /** Caution tags the user wants to avoid, e.g. 'overhead'. */
  excludedMovements: string[];
  /** Free-text safety notes, shown back to the user only. */
  safetyNotes?: string;
  weeklyAvailability: Weekday[];
  preferredDurationRange: DurationRange;
  startingBaseline: Baseline;
  primaryMotivations: Motivation[];
  weeklyTargets: WeeklyTargets;
  /** Per-modality standing target in minutes; only changed with user acceptance. */
  standingTargets: Partial<Record<Modality, number>>;
  /** Modalities flagged after "Uncomfortable" feedback; not auto-recommended until cleared. */
  flaggedModalities: Modality[];
  /** Exercise IDs flagged after "Uncomfortable" feedback in a strength session. */
  flaggedExercises: string[];
  /** Selected cosmetic title (archive item id). */
  activeTitleId?: string;
  settings: UserSettings;
}

export type SessionStatus = 'in_progress' | 'completed' | 'cancelled';
export type SessionSource = 'timer' | 'quick_log' | 'imported';

export interface StrengthSet {
  id: string;
  exerciseId: string;
  setIndex: number;
  reps?: number;
  load?: number;
  durationSeconds?: number;
  effort?: number;
  notes?: string;
}

export interface StrengthEntry {
  id: string;
  exerciseId: string;
  exerciseName: string;
  sets: StrengthSet[];
}

export type SessionDetails =
  | { kind: 'strength'; entries: StrengthEntry[]; templateId?: string }
  | { kind: 'cardio'; distanceKm?: number; incline?: number; steps?: number; resistance?: string; machineNotes?: string }
  | { kind: 'vr'; gameName?: string; effort?: number }
  | { kind: 'meditation'; sessionType?: string; plannedMinutes?: number }
  | { kind: 'breathwork'; presetId: string; presetName: string }
  | { kind: 'mobility'; label?: string }
  | { kind: 'other'; label?: string };

export interface ActivitySession {
  id: string;
  modality: Modality;
  startAt: string;
  endAt?: string;
  activeDurationSeconds: number;
  status: SessionStatus;
  source: SessionSource;
  notes?: string;
  effortFeedback?: EffortFeedback;
  details: SessionDetails;
  /** Mission the player launched this session from, if any (for display only). */
  missionInstanceId?: string;
  createdAt: string;
  updatedAt: string;
}

/** A running timer. Duration is derived from timestamps, never from ticks. */
export interface ActiveTimer {
  sessionId: string;
  modality: Modality;
  /** ISO start of the first interval. */
  startedAt: string;
  /** Closed intervals plus at most one open interval (end undefined) while running. */
  intervals: { start: number; end?: number }[];
  /** Countdown target (meditation/breathwork) in seconds, if any. */
  targetSeconds?: number;
  details: SessionDetails;
  missionInstanceId?: string;
  title: string;
  /** True once the player pressed Finish and is confirming details. */
  reviewing?: boolean;
}

export interface StrengthExercise {
  id: string;
  name: string;
  equipment: string[];
  category: 'push' | 'pull' | 'legs' | 'core' | 'carry' | 'full';
  isCustom: boolean;
  isEnabled: boolean;
  cautionTags: string[];
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  exerciseIds: string[];
  createdAt: string;
}

/* ───────────── Quests ───────────── */

export type QuestCategory = 'quick' | 'daily' | 'weekly' | 'expedition' | 'comeback';
export type QuestObjective =
  | { type: 'sessions'; count: number }
  | { type: 'minutes'; minutes: number }
  /** A single session lasting at least N minutes. */
  | { type: 'single_session'; minutes: number }
  | { type: 'active_days'; days: number }
  | { type: 'distinct_modalities'; count: number };

export interface QuestDefinition {
  id: string;
  category: QuestCategory;
  domain: Domain | 'any';
  title: string;
  flavour: string;
  eligibleModalities: Modality[] | 'any';
  objective: QuestObjective;
  rewardXP: number;
}

export interface QuestInstance {
  instanceId: string;
  definitionId: string;
  category: QuestCategory;
  domain: Domain | 'any';
  title: string;
  flavour: string;
  eligibleModalities: Modality[] | 'any';
  objective: QuestObjective;
  rewardXP: number;
  /** Inclusive window start (ISO). */
  startAt: string;
  /** Exclusive window end (ISO). Undefined = open-ended. */
  expiresAt?: string;
  /** Suggested modality + duration used to launch the mission. */
  suggestedModality?: Modality;
  suggestedMinutes?: number;
  /** Briefing slot this was generated for (daily choices only). */
  slot?: 'recommended' | 'quick' | 'fun';
  /** Short reason the generator picked it — shown to the player for transparency. */
  reason?: string;
}

export interface DailyBoard {
  date: string; // YYYY-MM-DD local
  generatedAt: string;
  missions: QuestInstance[];
  restDay: boolean;
}

export interface QuestProgress {
  instance: QuestInstance;
  current: number;
  target: number;
  complete: boolean;
  /** Session that completed the quest (receives quest XP). */
  completedBySessionId?: string;
  completedAt?: string;
}

/* ───────────── Rewards ───────────── */

export type RewardType = 'session_xp' | 'duration_xp' | 'quest_xp' | 'node_unlock' | 'achievement' | 'archive_item';

export interface RewardLedgerEntry {
  id: string;
  sessionId?: string;
  questInstanceId?: string;
  rewardType: RewardType;
  amountOrItemId: number | string;
  createdAt: string;
  idempotencyKey: string;
}

export interface SessionReward {
  sessionId: string;
  baseXP: number;
  durationXP: number;
  questXP: number;
  total: number;
  diminished: boolean;
  questIds: string[];
  levelBefore: number;
  levelAfter: number;
}

export interface WeeklyReview {
  weekStart: string;
  rating?: 'good' | 'mixed' | 'tough';
  note?: string;
  adjustment?: 'keep' | 'lighter' | 'more_variety' | 'shorter_sessions';
  savedAt: string;
}

export interface AppData {
  schemaVersion: number;
  profile: UserProfile | null;
  sessions: ActivitySession[];
  activeTimer: ActiveTimer | null;
  missionBoards: Record<string, DailyBoard>;
  /** Weekly directives offered, keyed by week start (YYYY-MM-DD). */
  weeklyBoards: Record<string, QuestInstance[]>;
  /** Custom exercises plus enable/disable overrides for starter exercises. */
  customExercises: StrengthExercise[];
  exerciseOverrides: Record<string, { isEnabled?: boolean; name?: string }>;
  templates: WorkoutTemplate[];
  /** Reward reveal keys the player has already been shown. */
  seenRewards: string[];
  weeklyReviews: Record<string, WeeklyReview>;
  /** Adjustment offers the player declined, keyed by modality + target. */
  dismissedOffers: string[];
}
