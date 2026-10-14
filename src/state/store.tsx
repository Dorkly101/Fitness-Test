import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type {
  ActiveTimer,
  ActivitySession,
  AppData,
  StrengthExercise,
  UserProfile,
  WeeklyReview,
  WorkoutTemplate,
} from '../domain/types';
import { createLocalRepository } from '../storage/repository';
import { emptyData, mergeData } from '../storage/schema';
import { computeProgress, type Progress } from '../domain/progression';
import { generateDailyBoard, generateWeeklyDirectives, swapMission as swapMissionRule } from '../domain/generator';
import { dayKey, weekKey } from '../domain/time';
import { pauseTimer, resumeTimer } from '../domain/timer';
import { STARTER_EXERCISES } from '../content/exercises';
import { isRecommendable } from '../domain/modalities';
import { uid } from './uid';

const repo = createLocalRepository();

export interface Store {
  data: AppData;
  progress: Progress;
  storageError?: string;
  today: string;
  exercises: StrengthExercise[];
  completeOnboarding(profile: UserProfile): void;
  updateProfile(patch: Partial<UserProfile>): void;
  swapMission(slot: 'recommended' | 'quick' | 'fun'): void;
  regenerateToday(): void;
  startTimer(t: Omit<ActiveTimer, 'sessionId' | 'startedAt' | 'intervals'>): void;
  pause(): void;
  resume(): void;
  updateTimer(patch: Partial<ActiveTimer>): void;
  beginReview(): void;
  discardTimer(): void;
  saveSession(s: ActivitySession, opts?: { flagModality?: boolean; flagExerciseIds?: string[] }): void;
  deleteSession(id: string): void;
  markSeen(keys: string[]): void;
  saveWeeklyReview(r: WeeklyReview): void;
  acceptOffer(key: string, modality: string, to: number): void;
  dismissOffer(key: string): void;
  addExercise(e: Omit<StrengthExercise, 'id' | 'isCustom'>): StrengthExercise;
  setExerciseEnabled(id: string, enabled: boolean): void;
  saveTemplate(t: Omit<WorkoutTemplate, 'id' | 'createdAt'>): void;
  deleteTemplate(id: string): void;
  importData(incoming: AppData, mode: 'merge' | 'replace'): void;
  resetAll(): void;
}

const Ctx = createContext<Store | null>(null);

function useToday(): string {
  const [today, setToday] = useState(() => dayKey(new Date()));
  useEffect(() => {
    const check = () => setToday(dayKey(new Date()));
    const id = window.setInterval(check, 60_000);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);
  return today;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const initial = useRef(repo.load());
  const [data, setData] = useState<AppData>(initial.current.data);
  const [storageError, setStorageError] = useState<string | undefined>(initial.current.error);
  const today = useToday();

  // Persist on every change.
  useEffect(() => {
    const r = repo.save(data);
    if (!r.ok) setStorageError(r.error);
  }, [data]);

  // Persist changes made in another tab.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('frontier:data')) setData(repo.load().data);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Make sure today's board and this week's directives exist (generated once, then stable).
  useEffect(() => {
    setData((d) => {
      if (!d.profile) return d;
      const now = new Date();
      const wk = weekKey(now);
      let next = d;
      if (!d.missionBoards[today]) {
        next = { ...next, missionBoards: { ...next.missionBoards, [today]: generateDailyBoard(d.profile, d.sessions, now) } };
      }
      if (!d.weeklyBoards[wk]) {
        next = { ...next, weeklyBoards: { ...next.weeklyBoards, [wk]: generateWeeklyDirectives(d.profile, now) } };
      }
      return next;
    });
  }, [today, data.profile]);

  const progress = useMemo(() => computeProgress(data), [data.sessions, data.missionBoards, data.weeklyBoards, data.profile]);

  const exercises = useMemo(() => {
    const list = [...STARTER_EXERCISES, ...data.customExercises];
    return list.map((e) => {
      const o = data.exerciseOverrides[e.id];
      return o ? { ...e, ...o } : e;
    });
  }, [data.customExercises, data.exerciseOverrides]);

  const update = useCallback((fn: (d: AppData) => AppData) => setData(fn), []);

  const store: Store = useMemo(() => {
    const touchProfile = (p: UserProfile, patch: Partial<UserProfile>): UserProfile => ({ ...p, ...patch, updatedAt: new Date().toISOString() });
    /** Regenerate today's missions if none has progress yet (e.g. after preference changes). */
    const refreshToday = (d: AppData): AppData => {
      if (!d.profile) return d;
      const now = new Date();
      const key = dayKey(now);
      const board = d.missionBoards[key];
      const touched = board?.missions.some((m) => d.sessions.some((s) => s.missionInstanceId === m.instanceId));
      const prog = computeProgress(d);
      const anyProgress = board?.missions.some((m) => prog.quests.find((q) => q.instance.instanceId === m.instanceId && q.current > 0));
      if (board && (touched || anyProgress)) return sanitizeToday(d);
      return { ...d, missionBoards: { ...d.missionBoards, [key]: generateDailyBoard(d.profile, d.sessions, now) } };
    };
    /** Replace any unfinished mission whose activity is no longer allowed (disabled, excluded, flagged). */
    const sanitizeToday = (d: AppData): AppData => {
      if (!d.profile) return d;
      const now = new Date();
      const key = dayKey(now);
      let board = d.missionBoards[key];
      if (!board) return d;
      const prog = computeProgress(d);
      for (const m of board.missions) {
        const done = prog.quests.find((q) => q.instance.instanceId === m.instanceId)?.complete;
        if (done || !m.slot || !m.suggestedModality || isRecommendable(m.suggestedModality, d.profile)) continue;
        const swapped = swapMissionRule(board, m.slot, d.profile, d.sessions, now);
        const replacement = swapped.missions.find((x) => x.slot === m.slot);
        board =
          replacement && replacement.suggestedModality && isRecommendable(replacement.suggestedModality, d.profile)
            ? swapped
            : { ...board, missions: board.missions.filter((x) => x.instanceId !== m.instanceId) };
      }
      return board === d.missionBoards[key] ? d : { ...d, missionBoards: { ...d.missionBoards, [key]: board } };
    };

    return {
      data,
      progress,
      storageError,
      today,
      exercises,
      completeOnboarding(profile) {
        update((d) => {
          const now = new Date();
          return {
            ...d,
            profile,
            missionBoards: { ...d.missionBoards, [dayKey(now)]: generateDailyBoard(profile, d.sessions, now) },
            weeklyBoards: { ...d.weeklyBoards, [weekKey(now)]: generateWeeklyDirectives(profile, now) },
          };
        });
      },
      updateProfile(patch) {
        update((d) => {
          if (!d.profile) return d;
          const next = { ...d, profile: touchProfile(d.profile, patch) };
          const affectsMissions = ['enabledModalities', 'favouriteModalities', 'excludedMovements', 'weeklyAvailability', 'preferredDurationRange', 'flaggedModalities', 'startingBaseline', 'standingTargets', 'weeklyTargets'].some((k) => k in patch);
          if (!affectsMissions) return next;
          let out = refreshToday(next);
          if ('weeklyTargets' in patch || 'enabledModalities' in patch) {
            // Weekly directives follow the new targets; past weeks keep what was offered.
            const wk = weekKey(new Date());
            out = { ...out, weeklyBoards: { ...out.weeklyBoards, [wk]: generateWeeklyDirectives(out.profile!, new Date()) } };
          }
          return out;
        });
      },
      swapMission(slot) {
        update((d) => {
          const board = d.missionBoards[today];
          if (!d.profile || !board) return d;
          return { ...d, missionBoards: { ...d.missionBoards, [today]: swapMissionRule(board, slot, d.profile, d.sessions, new Date()) } };
        });
      },
      regenerateToday() {
        update((d) => (d.profile ? { ...d, missionBoards: { ...d.missionBoards, [today]: generateDailyBoard(d.profile, d.sessions, new Date()) } } : d));
      },
      startTimer(t) {
        update((d) => {
          if (d.activeTimer) return d; // one active session at a time
          const now = Date.now();
          return { ...d, activeTimer: { ...t, sessionId: uid('ses'), startedAt: new Date(now).toISOString(), intervals: [{ start: now }] } };
        });
      },
      pause() {
        update((d) => (d.activeTimer ? { ...d, activeTimer: pauseTimer(d.activeTimer, Date.now()) } : d));
      },
      resume() {
        update((d) => (d.activeTimer ? { ...d, activeTimer: { ...resumeTimer(d.activeTimer, Date.now()), reviewing: false } } : d));
      },
      updateTimer(patch) {
        update((d) => (d.activeTimer ? { ...d, activeTimer: { ...d.activeTimer, ...patch } } : d));
      },
      beginReview() {
        update((d) => (d.activeTimer ? { ...d, activeTimer: { ...pauseTimer(d.activeTimer, Date.now()), reviewing: true } } : d));
      },
      discardTimer() {
        update((d) => ({ ...d, activeTimer: null }));
      },
      saveSession(s, opts) {
        update((d) => {
          const exists = d.sessions.some((x) => x.id === s.id);
          const sessions = exists ? d.sessions.map((x) => (x.id === s.id ? s : x)) : [...d.sessions, s];
          let profile = d.profile;
          if (profile && opts?.flagModality && !profile.flaggedModalities.includes(s.modality)) {
            profile = touchProfile(profile, { flaggedModalities: [...profile.flaggedModalities, s.modality] });
          }
          if (profile && opts?.flagExerciseIds?.length) {
            profile = touchProfile(profile, { flaggedExercises: [...new Set([...profile.flaggedExercises, ...opts.flagExerciseIds])] });
          }
          const activeTimer = d.activeTimer?.sessionId === s.id ? null : d.activeTimer;
          const next = { ...d, sessions, profile, activeTimer };
          return opts?.flagModality ? refreshToday(next) : next;
        });
      },
      deleteSession(id) {
        update((d) => ({ ...d, sessions: d.sessions.filter((s) => s.id !== id) }));
      },
      markSeen(keys) {
        update((d) => {
          const missing = keys.filter((k) => !d.seenRewards.includes(k));
          return missing.length ? { ...d, seenRewards: [...d.seenRewards, ...missing] } : d;
        });
      },
      saveWeeklyReview(r) {
        update((d) => ({ ...d, weeklyReviews: { ...d.weeklyReviews, [r.weekStart]: r } }));
      },
      acceptOffer(key, modality, to) {
        update((d) => {
          if (!d.profile) return d;
          const next = {
            ...d,
            dismissedOffers: [...d.dismissedOffers, key],
            profile: touchProfile(d.profile, { standingTargets: { ...d.profile.standingTargets, [modality]: to } }),
          };
          return refreshToday(next);
        });
      },
      dismissOffer(key) {
        update((d) => ({ ...d, dismissedOffers: [...d.dismissedOffers, key] }));
      },
      addExercise(e) {
        const ex: StrengthExercise = { ...e, id: uid('ex'), isCustom: true };
        update((d) => ({ ...d, customExercises: [...d.customExercises, ex] }));
        return ex;
      },
      setExerciseEnabled(id, enabled) {
        update((d) => ({ ...d, exerciseOverrides: { ...d.exerciseOverrides, [id]: { ...d.exerciseOverrides[id], isEnabled: enabled } } }));
      },
      saveTemplate(t) {
        update((d) => ({ ...d, templates: [...d.templates, { ...t, id: uid('tpl'), createdAt: new Date().toISOString() }] }));
      },
      deleteTemplate(id) {
        update((d) => ({ ...d, templates: d.templates.filter((t) => t.id !== id) }));
      },
      importData(incoming, mode) {
        update((d) => {
          const base = mode === 'replace' ? { ...incoming, activeTimer: null } : mergeData(d, incoming);
          return base;
        });
      },
      resetAll() {
        repo.clear();
        setStorageError(undefined);
        setData(emptyData());
      },
    };
  }, [data, progress, storageError, today, exercises, update]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}
