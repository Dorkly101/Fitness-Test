import { useMemo, useState } from 'react';
import { Award, Check, Lock, ScrollText, Sparkles } from 'lucide-react';
import type { Attribute, Modality, WeeklyReview } from '../../domain/types';
import { useStore } from '../../state/store';
import { href } from '../../state/router';
import { EmptyState, ModalityIcon, PageHead, ProgressBar, Segmented } from '../../components/ui';
import { LevelEmblem, SignalRings } from '../../components/art/Glyphs';
import { domainRank } from '../../domain/xp';
import { ALL_MODALITIES, modalityLabel } from '../../domain/modalities';
import { sortedValidSessions } from '../../domain/sessions';
import { addDays, dayKey, formatMinutes, fromDayKey, startOfWeek } from '../../domain/time';
import { buildDebrief, summariseWeek } from '../../domain/debrief';
import { ARCHIVE_ITEMS } from '../../content/rewards';
import { NODES } from '../../content/expedition';
import { useToast } from '../../components/toast';

const ATTRS: { id: Attribute; label: string; hint: string; cls: string }[] = [
  { id: 'strength', label: 'Strength', hint: 'Strength-training sessions', cls: 'dom-strength' },
  { id: 'endurance', label: 'Endurance', hint: 'Walking, cycling, elliptical, VR and other cardio', cls: 'dom-endurance' },
  { id: 'focus', label: 'Focus', hint: 'Meditation and breathwork', cls: 'dom-focus' },
  { id: 'recovery', label: 'Recovery', hint: 'Mobility and stretching', cls: 'dom-recovery' },
  { id: 'consistency', label: 'Consistency', hint: 'Different days active, weekly contracts kept', cls: '' },
];

export function ProgressArchive() {
  const { data, progress } = useStore();
  const sessions = useMemo(() => sortedValidSessions(data.sessions), [data.sessions]);
  const empty = sessions.length === 0;

  return (
    <div className="page">
      <PageHead eyebrow="Progress & archive" title="Your record">
        A plain record of what you’ve logged. XP, levels and attributes are game progress — not measures of health or fitness.
      </PageHead>

      {empty ? (
        <div className="panel">
          <EmptyState art={<SignalRings tone="var(--ion-lime)" />} title="Nothing recorded yet" action={<a className="btn primary" href={href('start')}>Start a session</a>}>
            Your totals, weekly pattern, personal bests and archive will build up here from sessions you actually log.
          </EmptyState>
        </div>
      ) : (
        <>
          <Summary />
          <div className="grid grid-2">
            <Attributes />
            <WeeklyChart />
          </div>
          <div className="grid grid-2">
            <ByModality />
            <StrengthBests />
          </div>
          <Debrief />
        </>
      )}
      <ArchiveSection />
      {empty && <p className="tiny muted">Total XP so far: {progress.totalXP}.</p>}
    </div>
  );
}

function Summary() {
  const { data, progress } = useStore();
  const valid = sortedValidSessions(data.sessions);
  const focus = valid.filter((s) => s.modality === 'meditation' || s.modality === 'breathwork').length;
  return (
    <section className="panel marked summary" aria-label="Summary">
      <div className="summary-level">
        <LevelEmblem level={progress.level.level} size={64} />
        <div>
          <div className="eyebrow">Level {progress.level.level}</div>
          <div className="num" style={{ fontSize: '1.5rem', fontWeight: 600 }}>
            {progress.totalXP} XP
          </div>
          <ProgressBar value={progress.level.intoLevel} max={progress.level.span} label="Progress to next level" lime thin />
        </div>
      </div>
      <dl className="stat-row">
        <Stat label="Sessions" value={progress.stats.sessions} />
        <Stat label="Active time" value={formatMinutes(progress.stats.minutes * 60)} />
        <Stat label="Active days" value={progress.stats.activeDays} />
        <Stat label="Focus practices" value={focus} />
        <Stat label="Waypoints" value={`${progress.nodes.filter((n) => n.status === 'discovered').length}/${progress.nodes.length}`} />
      </dl>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <dt>{label}</dt>
      <dd className="num">{value}</dd>
    </div>
  );
}

function Attributes() {
  const { progress } = useStore();
  return (
    <section className="panel" aria-labelledby="attr-title">
      <div className="panel-head">
        <h2 id="attr-title">Attributes</h2>
        <span className="tiny muted">Game ranks from participation</span>
      </div>
      <ul className="list">
        {ATTRS.map((a) => {
          const pts = progress.domainPoints[a.id];
          const r = domainRank(pts);
          return (
            <li key={a.id} className="attr-row">
              <div className="row between">
                <span>
                  <strong>{a.label}</strong> <span className="tiny muted">· {a.hint}</span>
                </span>
                <span className="num small">Rank {r.level}</span>
              </div>
              <div className={a.cls} style={{ ['--bar-color' as string]: a.cls ? 'var(--dom)' : 'var(--ion-lime)' }}>
                <ProgressBar value={r.intoLevel} max={r.span} label={`${a.label} rank progress`} thin />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function WeeklyChart() {
  const { data } = useStore();
  const profile = data.profile!;
  const target = profile.weeklyTargets.sessions;
  const weeks = useMemo(() => {
    const ws = startOfWeek(new Date());
    return Array.from({ length: 8 }, (_, i) => summariseWeek(data.sessions, addDays(ws, -7 * (7 - i))));
  }, [data.sessions]);
  const max = Math.max(Math.ceil(target * 1.25), ...weeks.map((w) => w.sessions), 1);
  return (
    <section className="panel" aria-labelledby="wk-title">
      <div className="panel-head">
        <h2 id="wk-title">Weekly consistency</h2>
        <span className="tiny muted">Sessions per week · target {target}</span>
      </div>
      <div className="wk-chart" role="img" aria-label={`Sessions in the last 8 weeks: ${weeks.map((w) => w.sessions).join(', ')}. Target ${target}.`}>
        <div className="wk-target" style={{ bottom: `calc(24px + (100% - 42px) * ${target / max})` }} aria-hidden="true">
          <span className="tiny">target</span>
        </div>
        {weeks.map((w, i) => (
          <div key={w.weekStart} className="wk-col">
            <div className={`wk-bar ${w.sessions >= target ? 'met' : ''}`} style={{ height: `${(w.sessions / max) * 100}%` }}>
              {w.sessions > 0 && <span className="wk-val num tiny">{w.sessions}</span>}
            </div>
            <span className="tiny muted wk-label">{i === 7 ? 'Now' : fromDayKey(w.weekStart).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
          </div>
        ))}
      </div>
      <p className="tiny muted" style={{ marginTop: 10 }}>
        Weeks meeting your target: {weeks.filter((w) => w.sessions >= target).length} of 8. Bars with a check pattern met the target.
      </p>
    </section>
  );
}

function ByModality() {
  const { data } = useStore();
  const profile = data.profile!;
  const rows = useMemo(() => {
    const valid = sortedValidSessions(data.sessions);
    return ALL_MODALITIES.map((m) => {
      const list = valid.filter((s) => s.modality === m);
      return { m, n: list.length, secs: list.reduce((a, s) => a + s.activeDurationSeconds, 0), longest: Math.max(0, ...list.map((s) => s.activeDurationSeconds)) };
    }).filter((r) => r.n > 0);
  }, [data.sessions]);
  return (
    <section className="panel" aria-labelledby="mod-title">
      <div className="panel-head">
        <h2 id="mod-title">By activity</h2>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th scope="col">Activity</th>
            <th scope="col" className="r">Sessions</th>
            <th scope="col" className="r">Time</th>
            <th scope="col" className="r hide-sm">Longest</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.m}>
              <td>
                <span className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
                  <ModalityIcon modality={r.m as Modality} size={16} /> {modalityLabel(r.m as Modality, profile)}
                </span>
              </td>
              <td className="r num">{r.n}</td>
              <td className="r num">{formatMinutes(r.secs)}</td>
              <td className="r num hide-sm">{formatMinutes(r.longest)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function StrengthBests() {
  const { data } = useStore();
  const units = data.profile!.settings.units;
  const bests = useMemo(() => {
    const m = new Map<string, { name: string; load?: number; reps?: number; date: string; sessions: number }>();
    for (const s of sortedValidSessions(data.sessions)) {
      if (s.details.kind !== 'strength') continue;
      for (const e of s.details.entries) {
        const cur = m.get(e.exerciseId) ?? { name: e.exerciseName, date: s.startAt, sessions: 0 };
        cur.sessions++;
        for (const set of e.sets) {
          const betterLoad = set.load != null && (cur.load == null || set.load > cur.load || (set.load === cur.load && (set.reps ?? 0) > (cur.reps ?? 0)));
          const betterReps = set.load == null && cur.load == null && set.reps != null && set.reps > (cur.reps ?? 0);
          if (betterLoad || betterReps) Object.assign(cur, { load: set.load, reps: set.reps, date: s.startAt });
        }
        m.set(e.exerciseId, cur);
      }
    }
    return [...m.values()].filter((b) => b.load != null || b.reps != null);
  }, [data.sessions]);
  return (
    <section className="panel" aria-labelledby="pb-title">
      <div className="panel-head">
        <h2 id="pb-title">Strength bests</h2>
        <span className="tiny muted">From your logged sets</span>
      </div>
      {bests.length === 0 ? (
        <p className="muted small">Log sets with reps or load in a strength session and your best sets will appear here. Attempting records is never required.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Exercise</th>
              <th scope="col" className="r">Best set</th>
              <th scope="col" className="r hide-sm">When</th>
            </tr>
          </thead>
          <tbody>
            {bests.map((b) => (
              <tr key={b.name}>
                <td>{b.name}</td>
                <td className="r num">
                  {b.load != null ? `${b.load} ${units}` : 'Bodyweight'}
                  {b.reps != null ? ` × ${b.reps}` : ''}
                </td>
                <td className="r tiny muted hide-sm">{new Date(b.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function Debrief() {
  const store = useStore();
  const toast = useToast();
  const { data } = store;
  const profile = data.profile!;
  const [which, setWhich] = useState<'this' | 'last'>('this');
  const ws = startOfWeek(new Date());
  const weekStart = which === 'this' ? ws : addDays(ws, -7);
  const key = dayKey(weekStart);
  const summary = useMemo(() => summariseWeek(data.sessions, weekStart), [data.sessions, key]);
  const debrief = buildDebrief(summary, profile);
  const saved = data.weeklyReviews[key];
  const [rating, setRating] = useState<WeeklyReview['rating']>(saved?.rating);
  const [note, setNote] = useState(saved?.note ?? '');
  const [adjustment, setAdjustment] = useState<WeeklyReview['adjustment']>(saved?.adjustment);

  return (
    <section className="panel marked" aria-labelledby="db-title">
      <div className="panel-head">
        <div>
          <div className="eyebrow">Weekly debrief</div>
          <h2 id="db-title">Week of {weekStart.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}</h2>
        </div>
        <Segmented
          label="Which week"
          value={which}
          options={[
            { value: 'this', label: 'This week' },
            { value: 'last', label: 'Last week' },
          ]}
          onChange={(v) => {
            setWhich(v);
            const k = dayKey(v === 'this' ? ws : addDays(ws, -7));
            const r = data.weeklyReviews[k];
            setRating(r?.rating);
            setNote(r?.note ?? '');
            setAdjustment(r?.adjustment);
          }}
        />
      </div>
      <div className="grid grid-3 debrief">
        <div>
          <h3 className="detail-sub">What went well</h3>
          {debrief.wentWell.length ? (
            <ul className="bullets">
              {debrief.wentWell.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          ) : (
            <p className="small muted">Nothing logged yet this week.</p>
          )}
        </div>
        <div>
          <h3 className="detail-sub">What felt hard</h3>
          {debrief.feltHard.length ? (
            <ul className="bullets">
              {debrief.feltHard.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          ) : (
            <p className="small muted">No sessions reported as too hard or uncomfortable.</p>
          )}
        </div>
        <div>
          <h3 className="detail-sub">Small adjustments</h3>
          <ul className="bullets">
            {debrief.adjustments.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </div>
      <hr className="divider" />
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          store.saveWeeklyReview({ weekStart: key, rating, note: note.trim() || undefined, adjustment, savedAt: new Date().toISOString() });
          toast('Debrief saved.');
        }}
      >
        <div className="row" style={{ alignItems: 'flex-end', gap: 20 }}>
          <div className="field">
            <span className="field-label">How did the week feel?</span>
            <Segmented
              label="How did the week feel?"
              value={rating ?? ('' as never)}
              options={[
                { value: 'good', label: 'Good' },
                { value: 'mixed', label: 'Mixed' },
                { value: 'tough', label: 'Tough' },
              ]}
              onChange={setRating}
            />
          </div>
          <div className="field">
            <label htmlFor="db-adj">Next week I’d like…</label>
            <select id="db-adj" className="select" value={adjustment ?? ''} onChange={(e) => setAdjustment((e.target.value || undefined) as WeeklyReview['adjustment'])}>
              <option value="">No preference</option>
              <option value="keep">To keep the same plan</option>
              <option value="lighter">A lighter week</option>
              <option value="shorter_sessions">Shorter sessions</option>
              <option value="more_variety">More variety</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="db-note">Note to self (optional)</label>
          <input id="db-note" className="input" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        {(adjustment === 'lighter' || adjustment === 'shorter_sessions') && (
          <p className="small muted">
            You can lower your weekly target or session length in <a href={href('settings')}>Settings</a> — FRONTIER never changes them without you.
          </p>
        )}
        <div className="row">
          <button className="btn" type="submit">
            Save debrief
          </button>
          {saved && <span className="tiny muted">Saved {new Date(saved.savedAt).toLocaleDateString()}</span>}
        </div>
      </form>
    </section>
  );
}

function ArchiveSection() {
  const store = useStore();
  const { data, progress } = store;
  const profile = data.profile!;
  const owned = new Set(progress.archiveItemIds);
  const sourceNode = (id: string) => NODES.find((n) => n.rewardIds.includes(id));
  const groups = [
    { kind: 'fragment', title: 'Log entries', icon: ScrollText },
    { kind: 'outpost', title: 'Outpost modules', icon: Sparkles },
    { kind: 'title', title: 'Titles', icon: Award },
  ] as const;

  return (
    <section aria-labelledby="arch-title" className="stack-lg">
      <div className="section-head">
        <h2 id="arch-title">Archive</h2>
        <span className="muted small">Earned rewards are permanent. Nothing here can be bought or lost to inactivity.</span>
      </div>
      <div className="panel">
        <div className="panel-head">
          <h3>Achievements</h3>
          <span className="tiny muted">
            {progress.achievements.filter((a) => a.unlocked).length} / {progress.achievements.length}
          </span>
        </div>
        <ul className="ach-grid">
          {progress.achievements.map((a) => (
            <li key={a.def.id} className={`ach ${a.unlocked ? 'unlocked' : 'locked'}`}>
              <span className="ach-icon" aria-hidden="true">
                {a.unlocked ? <Award size={20} /> : <Lock size={16} />}
              </span>
              <span>
                <strong>{a.def.name}</strong>
                <span className="sr-only">{a.unlocked ? ' (unlocked)' : ' (locked)'}</span>
                <br />
                <span className="tiny muted">{a.def.description}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="grid grid-3">
        {groups.map((g) => (
          <div key={g.kind} className="panel">
            <div className="panel-head">
              <h3>{g.title}</h3>
              <g.icon size={16} className="muted" aria-hidden="true" />
            </div>
            <ul className="list">
              {ARCHIVE_ITEMS.filter((i) => i.kind === g.kind).map((i) => {
                const has = owned.has(i.id);
                const node = sourceNode(i.id);
                const active = profile.activeTitleId === i.id;
                return (
                  <li key={i.id} className={`archive-item ${has ? 'owned' : 'locked'}`}>
                    <span className="archive-mark" aria-hidden="true">
                      {has ? <Check size={14} /> : <Lock size={13} />}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontWeight: 500 }}>{i.name}</span>
                      <span className="tiny muted">{has ? i.description : `Unlocks at ${node?.title ?? 'a future waypoint'}`}</span>
                    </span>
                    {g.kind === 'title' && has && (
                      <button className="btn small" aria-pressed={active} onClick={() => store.updateProfile({ activeTitleId: active ? undefined : i.id })}>
                        {active ? 'Equipped' : 'Equip'}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
