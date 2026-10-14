/** Weekly debrief: a non-judgmental summary built only from logged sessions. */
import type { ActivitySession, Modality, UserProfile } from './types';
import { sortedValidSessions } from './sessions';
import { addDays, dayKey, startOfWeek } from './time';
import { modalityLabel, domainOf } from './modalities';

export interface WeekSummary {
  weekStart: string;
  sessions: number;
  activeDays: number;
  minutes: number;
  byModality: { modality: Modality; sessions: number; minutes: number }[];
  /** One flag per day Mon..Sun: whether any session was logged. */
  dayActivity: boolean[];
  hard: ActivitySession[];
  feedback: Record<string, number>;
}

export function summariseWeek(all: ActivitySession[], weekStartDate: Date): WeekSummary {
  const ws = startOfWeek(weekStartDate);
  const we = addDays(ws, 7);
  const sessions = sortedValidSessions(all).filter((s) => {
    const t = new Date(s.startAt).getTime();
    return t >= ws.getTime() && t < we.getTime();
  });
  const byMod = new Map<Modality, { sessions: number; seconds: number }>();
  const days = new Set<string>();
  const feedback: Record<string, number> = {};
  for (const s of sessions) {
    const e = byMod.get(s.modality) ?? { sessions: 0, seconds: 0 };
    e.sessions++;
    e.seconds += s.activeDurationSeconds;
    byMod.set(s.modality, e);
    days.add(dayKey(s.startAt));
    if (s.effortFeedback) feedback[s.effortFeedback] = (feedback[s.effortFeedback] ?? 0) + 1;
  }
  const dayActivity = Array.from({ length: 7 }, (_, i) => days.has(dayKey(addDays(ws, i))));
  return {
    weekStart: dayKey(ws),
    sessions: sessions.length,
    activeDays: days.size,
    minutes: Math.round(sessions.reduce((n, s) => n + s.activeDurationSeconds, 0) / 60),
    byModality: [...byMod.entries()].map(([modality, v]) => ({ modality, sessions: v.sessions, minutes: Math.round(v.seconds / 60) })).sort((a, b) => b.sessions - a.sessions),
    dayActivity,
    hard: sessions.filter((s) => s.effortFeedback === 'too_hard' || s.effortFeedback === 'uncomfortable'),
    feedback,
  };
}

export interface Debrief {
  wentWell: string[];
  feltHard: string[];
  adjustments: string[];
}

export function buildDebrief(week: WeekSummary, profile: UserProfile): Debrief {
  const wentWell: string[] = [];
  const feltHard: string[] = [];
  const adjustments: string[] = [];
  const target = profile.weeklyTargets.sessions;

  if (week.sessions === 0) {
    return {
      wentWell: [],
      feltHard: [],
      adjustments: ['No sessions logged this week — that’s fine. A 5-minute Recon Ping is a gentle way back in.'],
    };
  }

  wentWell.push(`You showed up ${week.sessions} time${week.sessions === 1 ? '' : 's'} across ${week.activeDays} day${week.activeDays === 1 ? '' : 's'}.`);
  if (week.sessions >= target) wentWell.push(`Field Presence target met (${target}).`);
  if (week.byModality.length >= 2) wentWell.push(`Variety: ${week.byModality.length} activity types logged.`);
  const top = week.byModality[0];
  if (top) wentWell.push(`Most logged: ${modalityLabel(top.modality, profile)} (${top.sessions}×, ${top.minutes} min).`);

  for (const s of week.hard) {
    feltHard.push(`${modalityLabel(s.modality, profile)} on ${new Date(s.startAt).toLocaleDateString(undefined, { weekday: 'long' })} — reported “${s.effortFeedback === 'too_hard' ? 'Too hard' : 'Uncomfortable'}”.`);
  }

  if (week.hard.some((s) => s.effortFeedback === 'too_hard')) adjustments.push('Missions after a “Too hard” report are automatically shorter. You can also pick a shorter preferred duration in Settings.');
  if (week.hard.some((s) => s.effortFeedback === 'uncomfortable')) adjustments.push('Activities reported as uncomfortable are paused from suggestions. Review them in Settings when you’re ready. If discomfort persists, consider checking in with a qualified professional.');
  if (week.sessions < target && week.sessions > 0) adjustments.push(`You logged ${week.sessions} of ${target}. If ${target} felt like a stretch, a lower weekly target is a perfectly good plan.`);
  if ((week.feedback.easy ?? 0) >= 3 && week.hard.length === 0) adjustments.push('Several sessions felt easy. Watch for optional “+ a few minutes” offers on Mission Control — only if you want them.');
  const domains = new Set(week.byModality.map((b) => domainOf(b.modality)));
  if (domains.size === 1 && profile.enabledModalities.length > 1 && profile.primaryMotivations.includes('variety')) adjustments.push('All sessions were one type. The “Something fun” slot can rotate in another activity you enabled.');
  if (!adjustments.length) adjustments.push('Keep the current plan — it’s working.');

  return { wentWell, feltHard, adjustments };
}
