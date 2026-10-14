import { describe, expect, it } from 'vitest';
import { adjustmentOffers, generateDailyBoard, swapMission, GAP_DAYS } from './generator';
import { at, makeProfile, makeSession } from './testUtils';
import type { Modality } from './types';

const mods = (b: ReturnType<typeof generateDailyBoard>) => b.missions.map((m) => m.suggestedModality as Modality);

describe('daily briefing generator', () => {
  it('offers three optional choices: recommended, quick, fun', () => {
    const b = generateDailyBoard(makeProfile(), [], new Date(at(0, 8)));
    expect(b.missions.map((m) => m.slot)).toEqual(['recommended', 'quick', 'fun']);
    expect(b.restDay).toBe(false);
  });

  it('never suggests disabled, flagged or excluded activities', () => {
    const profile = makeProfile({
      enabledModalities: ['walking_pad', 'vr_active', 'meditation', 'strength'],
      favouriteModalities: ['vr_active', 'strength'],
      flaggedModalities: ['strength'],
      excludedMovements: ['high-impact-upper'],
    });
    for (let d = 0; d < 14; d++) {
      const b = generateDailyBoard(profile, [], new Date(at(d, 8)));
      for (const m of mods(b)) {
        expect(['walking_pad', 'meditation']).toContain(m);
      }
    }
  });

  it('respects planned rest days: no recommended workload, only gentle options', () => {
    const profile = makeProfile({ weeklyAvailability: [1, 2, 3, 4] }); // Monday (0) is rest
    const b = generateDailyBoard(profile, [], new Date(at(0, 8)));
    expect(b.restDay).toBe(true);
    expect(b.missions.find((m) => m.slot === 'recommended')).toBeUndefined();
    for (const m of mods(b)) expect(['meditation', 'breathwork', 'mobility']).toContain(m);
  });

  it('offers an easy comeback after a gap — never a catch-up workload', () => {
    const profile = makeProfile();
    const sessions = [makeSession({ startAt: at(0), minutes: 30 })];
    const b = generateDailyBoard(profile, sessions, new Date(at(GAP_DAYS + 2, 8)));
    const rec = b.missions.find((m) => m.slot === 'recommended')!;
    expect(rec.category).toBe('comeback');
    expect(rec.suggestedMinutes).toBeLessThanOrEqual(15);
  });

  it('shortens the next comparable suggestion after “Too hard”', () => {
    const profile = makeProfile({ enabledModalities: ['cycling'], favouriteModalities: ['cycling'], startingBaseline: 'regular' });
    const normal = generateDailyBoard(profile, [makeSession({ modality: 'cycling', startAt: at(0), minutes: 25, effortFeedback: 'about_right' })], new Date(at(1, 8)));
    const hard = generateDailyBoard(profile, [makeSession({ modality: 'cycling', startAt: at(0), minutes: 25, effortFeedback: 'too_hard' })], new Date(at(1, 8)));
    const n = normal.missions.find((m) => m.slot === 'recommended')!.suggestedMinutes!;
    const h = hard.missions.find((m) => m.slot === 'recommended')!.suggestedMinutes!;
    expect(h).toBeLessThan(n);
  });

  it('prioritises a weekly target the player is behind on', () => {
    const profile = makeProfile({ weeklyTargets: { sessions: 3, movementMinutes: 0, strengthSessions: 0, mindfulnessSessions: 2 } });
    const b = generateDailyBoard(profile, [makeSession({ startAt: at(0), modality: 'walking_pad' })], new Date(at(1, 8)));
    expect(['meditation', 'breathwork']).toContain(b.missions[0].suggestedModality);
  });

  it('is deterministic for the same inputs', () => {
    const p = makeProfile();
    const s = [makeSession({ startAt: at(0) })];
    const a = generateDailyBoard(p, s, new Date(at(1, 8)));
    const b = generateDailyBoard(p, s, new Date(at(1, 8)));
    expect(a.missions).toEqual(b.missions);
  });

  it('swap replaces one slot with a different activity when possible', () => {
    const p = makeProfile();
    const now = new Date(at(1, 8));
    const board = generateDailyBoard(p, [], now);
    const swapped = swapMission(board, 'fun', p, [], now);
    expect(swapped.missions.find((m) => m.slot === 'fun')!.suggestedModality).not.toBe(board.missions.find((m) => m.slot === 'fun')!.suggestedModality);
    expect(swapped.missions.find((m) => m.slot === 'recommended')).toEqual(board.missions.find((m) => m.slot === 'recommended'));
  });
});

describe('adaptive offers', () => {
  it('offers (but never applies) a small increase after three good sessions', () => {
    const profile = makeProfile({ enabledModalities: ['walking_pad'], favouriteModalities: ['walking_pad'] });
    const sessions = [0, 1, 2].map((i) => makeSession({ modality: 'walking_pad', startAt: at(i), minutes: 15, effortFeedback: i === 2 ? 'easy' : 'about_right' }));
    const offers = adjustmentOffers(profile, sessions, [], new Date(at(3)));
    expect(offers).toEqual([{ key: 'walking_pad:20', modality: 'walking_pad', from: 15, to: 20 }]);
    expect(profile.standingTargets.walking_pad).toBeUndefined();
    expect(adjustmentOffers(profile, sessions, ['walking_pad:20'], new Date(at(3)))).toHaveLength(0);
  });

  it('makes no offer if any recent session felt too hard', () => {
    const profile = makeProfile({ enabledModalities: ['walking_pad'] });
    const sessions = [0, 1, 2].map((i) => makeSession({ modality: 'walking_pad', startAt: at(i), minutes: 15, effortFeedback: i === 1 ? 'too_hard' : 'easy' }));
    expect(adjustmentOffers(profile, sessions, [], new Date(at(3)))).toHaveLength(0);
  });
});
