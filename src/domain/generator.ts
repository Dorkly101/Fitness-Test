/**
 * Transparent, rule-based mission generator (spec §8). No remote service.
 *
 * Rules, in order:
 *  - Only enabled, unflagged modalities that do not conflict with the player's
 *    movement exclusions are ever suggested.
 *  - On a planned rest day there is no "recommended" workload; only gentle
 *    focus/recovery options are offered, all optional.
 *  - After a gap of GAP_DAYS or more, the recommendation is an easy comeback
 *    mission. Workload never increases to "catch up".
 *  - "Too hard" on the last comparable session shortens the next suggestion.
 *  - "Uncomfortable" flags the modality (handled at save time) so it is not
 *    suggested again until the player clears the flag.
 *  - Standing targets only increase when the player accepts an offer.
 */
import type {
  ActivitySession,
  DailyBoard,
  Domain,
  DurationRange,
  Modality,
  QuestInstance,
  UserProfile,
} from './types';
import { MODALITIES, isRecommendable, domainOf, modalityLabel } from './modalities';
import { addDays, dayKey, daysBetween, startOfDay, startOfWeek, weekday } from './time';
import { sortedValidSessions } from './sessions';
import { COMEBACK, DAILY_BY_MODALITY, QUICK_OPS, WEEKLY } from '../content/missions';

export const GAP_DAYS = 4;
export const DAILY_REWARD_XP = 5;
export const WEEKLY_REWARD_XP = 10;

export const DURATION_RANGES: Record<DurationRange, [number, number]> = {
  '5-15': [5, 15],
  '15-30': [15, 30],
  '30-45': [30, 45],
  '45-60': [45, 60],
};

function roundTo5(n: number): number {
  return Math.max(5, Math.round(n / 5) * 5);
}

/** The player's standing duration for a modality: their accepted target, or a baseline default. */
export function baseMinutes(m: Modality, profile: UserProfile): number {
  const standing = profile.standingTargets[m];
  if (standing) return standing;
  const [min, max] = DURATION_RANGES[profile.preferredDurationRange];
  if (m === 'breathwork') return 3;
  if (m === 'meditation') return profile.startingBaseline === 'new' ? 3 : 5;
  if (profile.startingBaseline === 'new') return min;
  if (profile.startingBaseline === 'returning') return roundTo5(min + (max - min) / 3);
  return roundTo5((min + max) / 2);
}

export function quickMinutes(m: Modality, profile: UserProfile): number {
  if (m === 'breathwork') return 2;
  if (m === 'meditation') return 3;
  const [min] = DURATION_RANGES[profile.preferredDurationRange];
  return Math.min(min, 10);
}

function lastOf(m: Modality, sessions: ActivitySession[]): ActivitySession | undefined {
  for (let i = sessions.length - 1; i >= 0; i--) if (sessions[i].modality === m) return sessions[i];
  return undefined;
}

/** Suggested minutes, gently reduced if the last comparable session felt too hard. */
export function suggestedMinutes(m: Modality, profile: UserProfile, sessions: ActivitySession[]): { minutes: number; shortened: boolean } {
  const base = baseMinutes(m, profile);
  const last = lastOf(m, sessions);
  if (last?.effortFeedback === 'too_hard') {
    const shorter = m === 'breathwork' || m === 'meditation' ? Math.max(1, Math.round(base * 0.6)) : roundTo5(base * 0.75);
    return { minutes: Math.min(base, shorter), shortened: shorter < base };
  }
  return { minutes: base, shortened: false };
}

export function recommendable(profile: UserProfile): Modality[] {
  const order = [...profile.favouriteModalities, ...profile.enabledModalities.filter((m) => !profile.favouriteModalities.includes(m))];
  return order.filter((m) => isRecommendable(m, profile));
}

interface WeekNeed {
  domain: Domain;
  ratio: number;
}

/** Domains where the player is behind their own optional weekly targets. */
export function weeklyNeeds(profile: UserProfile, sessions: ActivitySession[], now: Date): WeekNeed[] {
  const ws = startOfWeek(now).getTime();
  const week = sessions.filter((s) => new Date(s.startAt).getTime() >= ws);
  const t = profile.weeklyTargets;
  const needs: WeekNeed[] = [];
  if (t.strengthSessions > 0) needs.push({ domain: 'strength', ratio: week.filter((s) => s.modality === 'strength').length / t.strengthSessions });
  if (t.movementMinutes > 0) {
    const mins = week.filter((s) => domainOf(s.modality) === 'endurance').reduce((n, s) => n + s.activeDurationSeconds / 60, 0);
    needs.push({ domain: 'endurance', ratio: mins / t.movementMinutes });
  }
  if (t.mindfulnessSessions > 0) needs.push({ domain: 'focus', ratio: week.filter((s) => domainOf(s.modality) === 'focus').length / t.mindfulnessSessions });
  return needs.filter((n) => n.ratio < 1).sort((a, b) => a.ratio - b.ratio);
}

function daysSinceLast(m: Modality, sessions: ActivitySession[], now: Date): number {
  const last = lastOf(m, sessions);
  return last ? daysBetween(last.startAt, now) : 999;
}

function makeDaily(
  slot: 'recommended' | 'quick' | 'fun',
  m: Modality,
  minutes: number,
  date: string,
  reason: string,
  profile: UserProfile,
  opts: { comeback?: boolean; quick?: boolean } = {},
): QuestInstance {
  const start = startOfDay(new Date(`${date}T00:00:00`));
  const tpl = opts.comeback ? COMEBACK : opts.quick ? QUICK_OPS : DAILY_BY_MODALITY[m];
  const domain = domainOf(m);
  let eligible: Modality[] | 'any';
  if (opts.comeback) eligible = 'any';
  else if (opts.quick) eligible = profile.enabledModalities.filter((x) => MODALITIES[x].lowFriction).concat(m).filter((x, i, a) => a.indexOf(x) === i);
  else if (domain === 'endurance') eligible = profile.enabledModalities.filter((x) => domainOf(x) === 'endurance');
  else eligible = [m];
  if (eligible !== 'any' && !eligible.includes(m)) eligible = [...eligible, m];

  const strength = m === 'strength' && !opts.comeback && !opts.quick;
  return {
    instanceId: `${date}:${slot}:${tpl.id}:${m}`,
    definitionId: tpl.id,
    category: opts.comeback ? 'comeback' : opts.quick ? 'quick' : 'daily',
    domain,
    title: tpl.title,
    flavour: tpl.flavour,
    eligibleModalities: eligible,
    // Strength missions count completion, not duration: we do not reward volume.
    objective: strength ? { type: 'sessions', count: 1 } : { type: 'single_session', minutes },
    rewardXP: DAILY_REWARD_XP,
    startAt: start.toISOString(),
    expiresAt: addDays(start, 1).toISOString(),
    suggestedModality: m,
    suggestedMinutes: minutes,
    slot,
    reason: reason.replace('{m}', modalityLabel(m, profile).toLowerCase()),
  };
}

export interface GenerateOptions {
  /** Modalities to avoid for a slot (used by "swap"). */
  exclude?: Partial<Record<'recommended' | 'quick' | 'fun', Modality[]>>;
}

export function isRestDay(profile: UserProfile, now: Date): boolean {
  return profile.weeklyAvailability.length > 0 && !profile.weeklyAvailability.includes(weekday(now));
}

export function generateDailyBoard(profile: UserProfile, allSessions: ActivitySession[], now: Date, options: GenerateOptions = {}): DailyBoard {
  const date = dayKey(now);
  const sessions = sortedValidSessions(allSessions).filter((s) => new Date(s.startAt).getTime() < startOfDay(now).getTime() + 86_400_000);
  const pool = recommendable(profile);
  const missions: QuestInstance[] = [];
  const restDay = isRestDay(profile, now);
  const used: Modality[] = [];
  const ex = options.exclude ?? {};
  const pick = (cands: Modality[], slot: 'recommended' | 'quick' | 'fun') => {
    const avoid = ex[slot] ?? [];
    return cands.find((m) => !used.includes(m) && !avoid.includes(m)) ?? cands.find((m) => !avoid.includes(m)) ?? cands[0];
  };

  if (pool.length === 0) return { date, generatedAt: now.toISOString(), missions, restDay };

  const last = sessions[sessions.length - 1];
  const gap = last ? daysBetween(last.startAt, now) : undefined;
  const lowFriction = pool.filter((m) => MODALITIES[m].lowFriction);

  if (restDay) {
    const gentle = pool.filter((m) => ['focus', 'recovery'].includes(domainOf(m)));
    const a = pick(gentle, 'quick');
    if (a) {
      used.push(a);
      missions.push(makeDaily('quick', a, quickMinutes(a, profile), date, 'Optional on a rest day: gentle {m}.', profile, { quick: true }));
    }
    const b = pick(gentle.filter((m) => m !== a), 'fun');
    if (b) missions.push(makeDaily('fun', b, quickMinutes(b, profile), date, 'Optional on a rest day: gentle {m}.', profile));
    return { date, generatedAt: now.toISOString(), missions, restDay };
  }

  // Recommended
  let rec: QuestInstance;
  if (gap !== undefined && gap >= GAP_DAYS) {
    const m = pick(lowFriction.length ? lowFriction : pool, 'recommended');
    used.push(m);
    rec = makeDaily('recommended', m, quickMinutes(m, profile), date, `It’s been ${gap} days — an easy restart, no catch-up needed.`, profile, { comeback: true });
  } else if (!last) {
    const m = pick(pool, 'recommended');
    used.push(m);
    const { minutes } = suggestedMinutes(m, profile, sessions);
    rec = makeDaily('recommended', m, minutes, date, 'Your first field log — {m} is at the top of your list.', profile);
  } else {
    const needs = weeklyNeeds(profile, sessions, now);
    let cands: Modality[] = [];
    let reason = '';
    for (const n of needs) {
      const inDomain = pool.filter((m) => domainOf(m) === n.domain);
      if (inDomain.length) {
        cands = inDomain;
        reason = `Moves your weekly ${n.domain === 'focus' ? 'mindfulness' : n.domain} target forward.`;
        break;
      }
    }
    if (!cands.length) {
      // Favour top-ranked activities, but rotate away from what you did most recently.
      const top = pool.slice(0, Math.max(3, profile.favouriteModalities.length));
      cands = [...top].sort((a, b) => daysSinceLast(b, sessions, now) - daysSinceLast(a, sessions, now) || top.indexOf(a) - top.indexOf(b));
      reason = 'One of your preferred activities, rotated for variety.';
    } else {
      cands = [...cands].sort((a, b) => daysSinceLast(b, sessions, now) - daysSinceLast(a, sessions, now));
    }
    const m = pick(cands, 'recommended');
    used.push(m);
    const { minutes, shortened } = suggestedMinutes(m, profile, sessions);
    if (shortened) reason = 'Shorter version — your last {m} session felt too hard.';
    rec = makeDaily('recommended', m, minutes, date, reason, profile);
  }
  missions.push(rec);

  // Quick win
  const quickPool = lowFriction.length ? lowFriction : pool;
  const qm = pick(quickPool, 'quick');
  used.push(qm);
  missions.push(makeDaily('quick', qm, quickMinutes(qm, profile), date, 'Low-friction and short. Starting is the hard part.', profile, { quick: true }));

  // Something fun: favourites, good ratings, or underused.
  const score = (m: Modality) => {
    const fav = profile.favouriteModalities.indexOf(m);
    const liked = sessions.filter((s) => s.modality === m && (s.effortFeedback === 'easy' || s.effortFeedback === 'about_right')).length;
    const idle = Math.min(14, daysSinceLast(m, sessions, now));
    return (fav >= 0 ? 10 - fav * 2 : 0) + Math.min(liked, 5) + idle * 0.5;
  };
  const funCands = [...pool].sort((a, b) => score(b) - score(a));
  const fm = pick(funCands, 'fun');
  const fmMinutes = suggestedMinutes(fm, profile, sessions).minutes;
  const funReason = daysSinceLast(fm, sessions, now) >= 7 ? 'You haven’t done {m} in a while.' : profile.favouriteModalities.includes(fm) ? 'One of your favourites.' : 'Something different for the log.';
  missions.push(makeDaily('fun', fm, fmMinutes, date, funReason, profile));

  return { date, generatedAt: now.toISOString(), missions, restDay };
}

/** Replace one slot on an existing board with the next-best alternative. */
export function swapMission(board: DailyBoard, slot: 'recommended' | 'quick' | 'fun', profile: UserProfile, sessions: ActivitySession[], now: Date): DailyBoard {
  const current = board.missions.find((m) => m.slot === slot);
  const avoid = board.missions.map((m) => m.suggestedModality).filter(Boolean) as Modality[];
  const pool = recommendable(profile);
  const remaining = pool.filter((m) => !avoid.includes(m));
  const exclude = remaining.length ? avoid : current?.suggestedModality ? [current.suggestedModality] : [];
  const regenerated = generateDailyBoard(profile, sessions, now, { exclude: { [slot]: exclude } });
  const replacement = regenerated.missions.find((m) => m.slot === slot);
  if (!replacement || replacement.instanceId === current?.instanceId) return board;
  return { ...board, missions: board.missions.map((m) => (m.slot === slot ? replacement : m)) };
}

export function generateWeeklyDirectives(profile: UserProfile, now: Date): QuestInstance[] {
  const ws = startOfWeek(now);
  const key = dayKey(ws);
  const base = { startAt: ws.toISOString(), expiresAt: addDays(ws, 7).toISOString(), rewardXP: WEEKLY_REWARD_XP };
  const t = profile.weeklyTargets;
  const enabled = profile.enabledModalities;
  const out: QuestInstance[] = [];
  const mk = (tpl: { id: string; title: string; flavour: string }, rest: Pick<QuestInstance, 'domain' | 'eligibleModalities' | 'objective'>): QuestInstance => ({
    instanceId: `${key}:${tpl.id}`,
    definitionId: tpl.id,
    category: 'weekly',
    title: tpl.title,
    flavour: tpl.flavour,
    ...rest,
    ...base,
  });
  out.push(mk(WEEKLY.presence, { domain: 'any', eligibleModalities: 'any', objective: { type: 'sessions', count: Math.max(1, t.sessions) } }));
  const endurance = enabled.filter((m) => domainOf(m) === 'endurance');
  if (t.movementMinutes > 0 && endurance.length) out.push(mk(WEEKLY.movement, { domain: 'endurance', eligibleModalities: endurance, objective: { type: 'minutes', minutes: t.movementMinutes } }));
  if (t.strengthSessions > 0 && enabled.includes('strength')) out.push(mk(WEEKLY.strength, { domain: 'strength', eligibleModalities: ['strength'], objective: { type: 'sessions', count: t.strengthSessions } }));
  const focus = enabled.filter((m) => domainOf(m) === 'focus');
  if (t.mindfulnessSessions > 0 && focus.length) out.push(mk(WEEKLY.mindful, { domain: 'focus', eligibleModalities: focus, objective: { type: 'sessions', count: t.mindfulnessSessions } }));
  if (profile.primaryMotivations.includes('variety') && enabled.length >= 2) out.push(mk(WEEKLY.variety, { domain: 'any', eligibleModalities: 'any', objective: { type: 'distinct_modalities', count: 2 } }));
  return out;
}

export interface AdjustmentOffer {
  key: string;
  modality: Modality;
  from: number;
  to: number;
}

/**
 * Offer (never apply) a small increase when the last three sessions of a
 * modality all met the standing target and felt easy or about right, with at
 * least one "easy". The player must accept before anything changes.
 */
export function adjustmentOffers(profile: UserProfile, allSessions: ActivitySession[], dismissed: string[], now: Date): AdjustmentOffer[] {
  const sessions = sortedValidSessions(allSessions).filter((s) => daysBetween(s.startAt, now) <= 21);
  const offers: AdjustmentOffer[] = [];
  for (const m of recommendable(profile)) {
    if (m === 'strength') continue; // load/volume changes are always the player's own call
    const from = baseMinutes(m, profile);
    const step = m === 'meditation' || m === 'breathwork' ? 2 : 5;
    const cap = m === 'breathwork' ? 10 : m === 'meditation' ? 20 : DURATION_RANGES[profile.preferredDurationRange][1] + 15;
    const to = Math.min(cap, from + step);
    if (to <= from) continue;
    const recent = sessions.filter((s) => s.modality === m).slice(-3);
    if (recent.length < 3) continue;
    const allGood = recent.every((s) => (s.effortFeedback === 'easy' || s.effortFeedback === 'about_right') && s.activeDurationSeconds >= from * 60 - 15);
    const anyEasy = recent.some((s) => s.effortFeedback === 'easy');
    const key = `${m}:${to}`;
    if (allGood && anyEasy && !dismissed.includes(key)) offers.push({ key, modality: m, from, to });
  }
  return offers;
}
