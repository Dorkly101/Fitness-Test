/**
 * Derived progression. Given the persisted data, rebuild — deterministically —
 * every reward the player has earned. Because each award has an idempotency
 * key tied to a session or quest instance, re-running this after an edit,
 * import or reload yields exactly one award per source.
 */
import type {
  ActivitySession,
  AppData,
  Domain,
  QuestInstance,
  QuestProgress,
  RewardLedgerEntry,
  SessionReward,
  UserProfile,
} from './types';
import { sortedValidSessions, strengthSetCount } from './sessions';
import { baseXP, capQuestXP, durationXP, levelFromXP, type LevelInfo } from './xp';
import { evaluateQuest } from './quests';
import { dayKey, daysBetween, weekKey } from './time';
import { domainOf } from './modalities';
import { NODES, type ExpeditionNode, type ProgressMetric, type UnlockCondition } from '../content/expedition';
import { ACHIEVEMENTS, type AchievementDef } from '../content/rewards';
import { EXPEDITION_OBJECTIVES } from '../content/missions';

export interface RunningStats {
  sessions: number;
  minutes: number;
  activeDays: number;
  activeWeeks: number;
  weeklyContracts: number;
  focusRecoverySessions: number;
  distinctModalities: number;
}

export type NodeStatus = 'discovered' | 'next' | 'locked';

export interface NodeState {
  node: ExpeditionNode;
  status: NodeStatus;
  discoveredBySessionId?: string;
  discoveredAt?: string;
  /** 0..1 progress toward the best alternate route (for the next node). */
  progress: number;
  bestCondition: UnlockCondition;
}

export interface AchievementState {
  def: AchievementDef;
  unlocked: boolean;
  unlockedBySessionId?: string;
  unlockedAt?: string;
}

export interface Progress {
  ledger: RewardLedgerEntry[];
  sessionRewards: Record<string, SessionReward>;
  totalXP: number;
  level: LevelInfo;
  domainPoints: Record<Domain | 'consistency', number>;
  stats: RunningStats;
  nodes: NodeState[];
  currentNodeIndex: number;
  achievements: AchievementState[];
  archiveItemIds: string[];
  quests: QuestProgress[];
  expeditionObjectives: QuestProgress[];
}

export function expeditionObjectiveInstances(): QuestInstance[] {
  return EXPEDITION_OBJECTIVES.map((d) => ({
    instanceId: `exp:${d.id}`,
    definitionId: d.id,
    category: d.category,
    domain: d.domain,
    title: d.title,
    flavour: d.flavour,
    eligibleModalities: d.eligibleModalities,
    objective: d.objective,
    rewardXP: d.rewardXP,
    startAt: new Date(0).toISOString(),
  }));
}

export function allQuestInstances(data: Pick<AppData, 'missionBoards' | 'weeklyBoards'>): QuestInstance[] {
  const out: QuestInstance[] = [];
  for (const board of Object.values(data.missionBoards)) out.push(...board.missions);
  for (const list of Object.values(data.weeklyBoards)) out.push(...list);
  out.push(...expeditionObjectiveInstances());
  // De-duplicate by instance id (defensive: an import could contain repeats).
  const seen = new Map<string, QuestInstance>();
  for (const q of out) if (!seen.has(q.instanceId)) seen.set(q.instanceId, q);
  return [...seen.values()];
}

function metricValue(stats: RunningStats, metric: ProgressMetric): number {
  return stats[metric];
}

export function conditionProgress(stats: RunningStats, c: UnlockCondition): number {
  return Math.min(1, metricValue(stats, c.metric) / c.value);
}

function ruleMet(stats: RunningStats, rule: UnlockCondition[]): boolean {
  return rule.some((c) => metricValue(stats, c.metric) >= c.value);
}

/** Weekly contract target for a week: what was offered that week, else the current target. */
function presenceTargetFor(week: string, data: Pick<AppData, 'weeklyBoards'>, profile: UserProfile | null): number {
  const offered = data.weeklyBoards[week]?.find((q) => q.definitionId === 'weekly-field-presence');
  if (offered && offered.objective.type === 'sessions') return offered.objective.count;
  return Math.max(1, profile?.weeklyTargets.sessions ?? 3);
}

export function computeProgress(
  data: Pick<AppData, 'sessions' | 'missionBoards' | 'weeklyBoards' | 'profile'>,
): Progress {
  const sessions = sortedValidSessions(data.sessions);
  const ledgerMap = new Map<string, RewardLedgerEntry>();
  const add = (e: Omit<RewardLedgerEntry, 'id'>) => {
    if (!ledgerMap.has(e.idempotencyKey)) ledgerMap.set(e.idempotencyKey, { ...e, id: e.idempotencyKey });
  };

  // 1. Quests — evaluate each offered instance; the completing session gets credit.
  const instances = allQuestInstances(data);
  const questProgress = instances.map((q) => evaluateQuest(q, sessions));
  const questsBySession = new Map<string, QuestProgress[]>();
  for (const qp of questProgress) {
    if (!qp.completedBySessionId) continue;
    const list = questsBySession.get(qp.completedBySessionId) ?? [];
    list.push(qp);
    questsBySession.set(qp.completedBySessionId, list);
  }

  // 2. Walk sessions chronologically for XP, stats, unlocks.
  const sessionRewards: Record<string, SessionReward> = {};
  const perDay = new Map<string, number>();
  const days = new Set<string>();
  const weeks = new Set<string>();
  const weekCounts = new Map<string, number>();
  const mods = new Set<string>();
  const domainPoints: Record<Domain | 'consistency', number> = { strength: 0, endurance: 0, focus: 0, recovery: 0, consistency: 0 };
  const stats: RunningStats = { sessions: 0, minutes: 0, activeDays: 0, activeWeeks: 0, weeklyContracts: 0, focusRecoverySessions: 0, distinctModalities: 0 };
  let seconds = 0;
  let totalXP = 0;
  let feedbackCount = 0;
  let strengthSets = 0;
  const modalityCounts = new Map<string, number>();
  let prevDay: string | undefined;
  let hadComeback = false;

  const nodeDiscovery: { sessionId: string; at: string }[] = [];
  const achievementUnlocks = new Map<string, { sessionId: string; at: string }>();

  for (const s of sessions) {
    const day = dayKey(s.startAt);
    const idx = perDay.get(day) ?? 0;
    perDay.set(day, idx + 1);

    const b = baseXP(idx);
    const d = durationXP(s.activeDurationSeconds);
    const completed = questsBySession.get(s.id) ?? [];
    const q = capQuestXP(completed.reduce((n, qp) => n + qp.instance.rewardXP, 0));
    const total = b + d + q;
    const levelBefore = levelFromXP(totalXP).level;
    totalXP += total;
    sessionRewards[s.id] = {
      sessionId: s.id,
      baseXP: b,
      durationXP: d,
      questXP: q,
      total,
      diminished: idx >= 3,
      questIds: completed.map((c) => c.instance.instanceId),
      levelBefore,
      levelAfter: levelFromXP(totalXP).level,
    };
    domainPoints[domainOf(s.modality)] += b + d;

    const at = s.endAt ?? s.startAt;
    add({ sessionId: s.id, rewardType: 'session_xp', amountOrItemId: b, createdAt: at, idempotencyKey: `session:${s.id}:base` });
    if (d) add({ sessionId: s.id, rewardType: 'duration_xp', amountOrItemId: d, createdAt: at, idempotencyKey: `session:${s.id}:duration` });
    if (q) add({ sessionId: s.id, rewardType: 'quest_xp', amountOrItemId: q, createdAt: at, idempotencyKey: `session:${s.id}:quest` });

    // Stats
    stats.sessions++;
    seconds += s.activeDurationSeconds;
    stats.minutes = Math.floor(seconds / 60);
    if (prevDay && daysBetween(prevDay, day) >= 7) hadComeback = true;
    prevDay = day;
    days.add(day);
    stats.activeDays = days.size;
    const wk = weekKey(s.startAt);
    weeks.add(wk);
    stats.activeWeeks = weeks.size;
    const wc = (weekCounts.get(wk) ?? 0) + 1;
    weekCounts.set(wk, wc);
    if (wc === presenceTargetFor(wk, data, data.profile)) stats.weeklyContracts++;
    const dom = domainOf(s.modality);
    if (dom === 'focus' || dom === 'recovery') stats.focusRecoverySessions++;
    mods.add(s.modality);
    stats.distinctModalities = mods.size;
    if (s.effortFeedback) feedbackCount++;
    strengthSets += strengthSetCount(s);
    modalityCounts.set(s.modality, (modalityCounts.get(s.modality) ?? 0) + 1);

    // Sequential node discovery
    while (nodeDiscovery.length < NODES.length && ruleMet(stats, NODES[nodeDiscovery.length].unlockRule)) {
      const node = NODES[nodeDiscovery.length];
      nodeDiscovery.push({ sessionId: s.id, at });
      add({ sessionId: s.id, rewardType: 'node_unlock', amountOrItemId: node.id, createdAt: at, idempotencyKey: `node:${node.id}` });
      for (const r of node.rewardIds) add({ sessionId: s.id, rewardType: 'archive_item', amountOrItemId: r, createdAt: at, idempotencyKey: `archive:${r}` });
    }

    // Achievements
    for (const a of ACHIEVEMENTS) {
      if (achievementUnlocks.has(a.id)) continue;
      const r = a.rule;
      let ok = false;
      switch (r.type) {
        case 'sessions':
          ok = stats.sessions >= r.count;
          break;
        case 'modality_sessions':
          ok = (modalityCounts.get(r.modality) ?? 0) >= r.count;
          break;
        case 'strength_sets':
          ok = strengthSets >= r.count;
          break;
        case 'distinct_modalities':
          ok = stats.distinctModalities >= r.count;
          break;
        case 'weekly_contracts':
          ok = stats.weeklyContracts >= r.count;
          break;
        case 'comeback':
          ok = hadComeback;
          break;
        case 'feedback_count':
          ok = feedbackCount >= r.count;
          break;
      }
      if (ok) {
        achievementUnlocks.set(a.id, { sessionId: s.id, at });
        add({ sessionId: s.id, rewardType: 'achievement', amountOrItemId: a.id, createdAt: at, idempotencyKey: `achievement:${a.id}` });
      }
    }
  }

  domainPoints.consistency = stats.activeDays * 10 + stats.weeklyContracts * 25;

  const nodes: NodeState[] = NODES.map((node, i) => {
    const disc = nodeDiscovery[i];
    const status: NodeStatus = disc ? 'discovered' : i === nodeDiscovery.length ? 'next' : 'locked';
    let best = node.unlockRule[0];
    for (const c of node.unlockRule) if (conditionProgress(stats, c) > conditionProgress(stats, best)) best = c;
    return {
      node,
      status,
      discoveredBySessionId: disc?.sessionId,
      discoveredAt: disc?.at,
      progress: disc ? 1 : conditionProgress(stats, best),
      bestCondition: best,
    };
  });

  const archiveItemIds = nodeDiscovery.flatMap((_, i) => NODES[i].rewardIds);

  return {
    ledger: [...ledgerMap.values()],
    sessionRewards,
    totalXP,
    level: levelFromXP(totalXP),
    domainPoints,
    stats,
    nodes,
    currentNodeIndex: nodeDiscovery.length - 1,
    achievements: ACHIEVEMENTS.map((def) => {
      const u = achievementUnlocks.get(def.id);
      return { def, unlocked: !!u, unlockedBySessionId: u?.sessionId, unlockedAt: u?.at };
    }),
    archiveItemIds,
    quests: questProgress.filter((q) => q.instance.category !== 'expedition'),
    expeditionObjectives: questProgress.filter((q) => q.instance.category === 'expedition'),
  };
}

/** Rewards attributable to one session — used for the completion summary. */
export function rewardsForSession(progress: Progress, sessionId: string) {
  return {
    xp: progress.sessionRewards[sessionId],
    nodes: progress.nodes.filter((n) => n.discoveredBySessionId === sessionId),
    achievements: progress.achievements.filter((a) => a.unlockedBySessionId === sessionId),
    quests: progress.quests.concat(progress.expeditionObjectives).filter((q) => q.completedBySessionId === sessionId),
  };
}

export function lastValidSession(sessions: ActivitySession[]): ActivitySession | undefined {
  const sorted = sortedValidSessions(sessions);
  return sorted[sorted.length - 1];
}
