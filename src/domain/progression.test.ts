import { describe, expect, it } from 'vitest';
import { computeProgress } from './progression';
import { evaluateQuest } from './quests';
import { generateDailyBoard, generateWeeklyDirectives } from './generator';
import { at, makeProfile, makeSession } from './testUtils';
import { mergeData, parseAppData, toExportFile, emptyData } from '../storage/schema';
import type { AppData, QuestInstance } from './types';
import { dayKey, weekKey } from './time';

function data(partial: Partial<AppData>): AppData {
  return { ...emptyData(), profile: makeProfile(), ...partial };
}

describe('session rewards', () => {
  it('awards XP exactly once per valid session (15 base + duration)', () => {
    const p = computeProgress(data({ sessions: [makeSession({ id: 'a', startAt: at(0), minutes: 20 })] }));
    expect(p.sessionRewards.a).toMatchObject({ baseXP: 15, durationXP: 4, questXP: 0, total: 19 });
    expect(p.totalXP).toBe(19);
    expect(p.ledger.filter((e) => e.sessionId === 'a' && e.rewardType === 'session_xp')).toHaveLength(1);
  });

  it('does not award XP for cancelled or sub-minute sessions', () => {
    const p = computeProgress(
      data({
        sessions: [
          makeSession({ id: 'c', startAt: at(0), minutes: 20, status: 'cancelled' }),
          makeSession({ id: 'd', startAt: at(0, 10), activeDurationSeconds: 30 }),
        ],
      }),
    );
    expect(p.totalXP).toBe(0);
    expect(p.stats.sessions).toBe(0);
  });

  it('editing a session recalculates its award instead of adding another', () => {
    const original = makeSession({ id: 'a', startAt: at(0), minutes: 10 });
    const before = computeProgress(data({ sessions: [original] }));
    const edited = { ...original, activeDurationSeconds: 30 * 60, updatedAt: at(1) };
    const after = computeProgress(data({ sessions: [edited] }));
    expect(before.totalXP).toBe(17);
    expect(after.totalXP).toBe(21);
    expect(after.ledger.filter((e) => e.rewardType === 'session_xp')).toHaveLength(1);
  });

  it('importing the same sessions again cannot duplicate XP', () => {
    const sessions = [makeSession({ id: 'a', startAt: at(0) }), makeSession({ id: 'b', startAt: at(1) })];
    const current = data({ sessions });
    const file = JSON.parse(JSON.stringify(toExportFile(current)));
    const merged = mergeData(current, parseAppData(file));
    const twice = mergeData(merged, parseAppData(file));
    expect(twice.sessions).toHaveLength(2);
    expect(computeProgress(twice).totalXP).toBe(computeProgress(current).totalXP);
  });

  it('diminishes base XP after three sessions on the same day but still logs them', () => {
    const sessions = [0, 1, 2, 3, 4].map((i) => makeSession({ id: `x${i}`, startAt: at(0, 8 + i), minutes: 5 }));
    const p = computeProgress(data({ sessions }));
    expect(p.stats.sessions).toBe(5);
    expect(p.sessionRewards.x2.baseXP).toBe(15);
    expect(p.sessionRewards.x3.baseXP).toBe(5);
    expect(p.sessionRewards.x3.diminished).toBe(true);
  });

  it('inactivity never removes XP, levels or unlocks', () => {
    const sessions = Array.from({ length: 6 }, (_, i) => makeSession({ id: `s${i}`, startAt: at(i) }));
    const d = data({ sessions });
    const now = computeProgress(d);
    // Progress is a pure function of logged sessions; time passing changes nothing.
    const later = computeProgress(JSON.parse(JSON.stringify(d)));
    expect(later.totalXP).toBe(now.totalXP);
    expect(later.archiveItemIds).toEqual(now.archiveItemIds);
    expect(later.nodes.filter((n) => n.status === 'discovered').map((n) => n.node.id)).toEqual(['arrival-landing', 'arrival-array', 'arrival-base', 'ridge-trailhead', 'ridge-echo']);
  });
});

describe('quests', () => {
  const quest = (partial: Partial<QuestInstance>): QuestInstance => ({
    instanceId: 'q1',
    definitionId: 'd',
    category: 'daily',
    domain: 'any',
    title: 'Q',
    flavour: '',
    eligibleModalities: 'any',
    objective: { type: 'sessions', count: 2 },
    rewardXP: 5,
    startAt: at(0, 0),
    expiresAt: at(1, 0),
    ...partial,
  });

  it('credits the session that completes the quest', () => {
    const s1 = makeSession({ id: 'a', startAt: at(0, 8) });
    const s2 = makeSession({ id: 'b', startAt: at(0, 12) });
    const r = evaluateQuest(quest({}), [s2, s1]);
    expect(r.complete).toBe(true);
    expect(r.completedBySessionId).toBe('b');
  });

  it('ignores sessions outside the window or of ineligible modalities', () => {
    const q = quest({ eligibleModalities: ['meditation'], objective: { type: 'sessions', count: 1 } });
    const r = evaluateQuest(q, [makeSession({ startAt: at(0, 8), modality: 'walking_pad' }), makeSession({ startAt: at(1, 8), modality: 'meditation' })]);
    expect(r.complete).toBe(false);
    expect(r.current).toBe(0);
  });

  it('single-session objectives need one long-enough session, not a sum', () => {
    const q = quest({ objective: { type: 'single_session', minutes: 15 } });
    const short = [makeSession({ startAt: at(0, 8), minutes: 10 }), makeSession({ startAt: at(0, 9), minutes: 10 })];
    expect(evaluateQuest(q, short).complete).toBe(false);
    expect(evaluateQuest(q, [...short, makeSession({ startAt: at(0, 10), minutes: 15 })]).complete).toBe(true);
  });

  it('a qualifying session advances daily and weekly quests and caps quest XP at +10', () => {
    const profile = makeProfile({ weeklyTargets: { sessions: 1, movementMinutes: 10, strengthSessions: 0, mindfulnessSessions: 0 } });
    const now = new Date(at(0, 7));
    const board = generateDailyBoard(profile, [], now);
    const weekly = generateWeeklyDirectives(profile, now);
    const rec = board.missions.find((m) => m.slot === 'recommended')!;
    const s = makeSession({ id: 'go', startAt: at(0, 8), modality: rec.suggestedModality!, minutes: 30 });
    const p = computeProgress({ profile, sessions: [s], missionBoards: { [board.date]: board }, weeklyBoards: { [weekKey(now)]: weekly } });
    const completed = p.quests.filter((q) => q.complete);
    expect(completed.length).toBeGreaterThanOrEqual(2);
    expect(p.sessionRewards.go.questXP).toBe(10);
    expect(p.sessionRewards.go.total).toBe(15 + 6 + 10);
  });
});

describe('expedition progression', () => {
  it('the first session discovers the landing zone and unlocks the first archive item', () => {
    const p = computeProgress(data({ sessions: [makeSession({ id: 'first', startAt: at(0) })] }));
    expect(p.nodes[0].status).toBe('discovered');
    expect(p.nodes[0].discoveredBySessionId).toBe('first');
    expect(p.nodes[1].status).toBe('next');
    expect(p.archiveItemIds).toContain('frag-touchdown');
    expect(p.achievements.find((a) => a.def.id === 'ach-first-contact')?.unlocked).toBe(true);
  });

  it('a new user has no progress, no XP and no archive items', () => {
    const p = computeProgress(data({}));
    expect(p.totalXP).toBe(0);
    expect(p.archiveItemIds).toHaveLength(0);
    expect(p.nodes.every((n) => n.status !== 'discovered')).toBe(true);
  });

  it('detects a comeback after a gap of a week or more', () => {
    const p = computeProgress(data({ sessions: [makeSession({ startAt: at(0) }), makeSession({ startAt: at(9) })] }));
    expect(p.achievements.find((a) => a.def.id === 'ach-reestablished')?.unlocked).toBe(true);
  });

  it('counts a weekly contract when the player meets their own target', () => {
    const sessions = [0, 1, 2].map((i) => makeSession({ startAt: at(i) }));
    const p = computeProgress(data({ sessions }));
    expect(p.stats.weeklyContracts).toBe(1);
  });

  it('unlock dates come from logged history, and day keys are local', () => {
    expect(dayKey(at(0, 23, 30))).toBe('2026-03-02');
  });
});
