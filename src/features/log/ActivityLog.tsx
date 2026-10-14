import { useMemo, useState } from 'react';
import { ClipboardPlus, ChevronRight } from 'lucide-react';
import type { Modality } from '../../domain/types';
import { useStore } from '../../state/store';
import { href } from '../../state/router';
import { ALL_MODALITIES, modalityLabel } from '../../domain/modalities';
import { EmptyState, ModalityIcon, PageHead } from '../../components/ui';
import { ContourField } from '../../components/art/Glyphs';
import { compareSessions } from '../../domain/sessions';
import { dayKey, formatMinutes, fromDayKey } from '../../domain/time';

const FEEDBACK_LABEL = { easy: 'Easy', about_right: 'About right', too_hard: 'Too hard', uncomfortable: 'Uncomfortable' } as const;
type Range = '7' | '30' | '90' | 'all';

export function ActivityLog() {
  const { data, progress } = useStore();
  const profile = data.profile!;
  const [modality, setModality] = useState<Modality | 'all'>('all');
  const [range, setRange] = useState<Range>('all');

  const filtered = useMemo(() => {
    const cutoff = range === 'all' ? 0 : Date.now() - Number(range) * 86_400_000;
    return [...data.sessions]
      .filter((s) => s.status === 'completed')
      .filter((s) => modality === 'all' || s.modality === modality)
      .filter((s) => new Date(s.startAt).getTime() >= cutoff)
      .sort((a, b) => compareSessions(b, a));
  }, [data.sessions, modality, range]);

  const groups = useMemo(() => {
    const m = new Map<string, typeof filtered>();
    for (const s of filtered) {
      const k = dayKey(s.startAt);
      m.set(k, [...(m.get(k) ?? []), s]);
    }
    return [...m.entries()];
  }, [filtered]);

  const used = ALL_MODALITIES.filter((m) => data.sessions.some((s) => s.modality === m));
  const total = data.sessions.filter((s) => s.status === 'completed').length;

  return (
    <div className="page">
      <PageHead eyebrow="Field log" title="Activity Log" actions={<a className="btn" href={href('quick-log')}><ClipboardPlus size={16} aria-hidden="true" /> Log a session</a>}>
        Everything you’ve recorded, newest first. Open an entry to edit or delete it — progress recalculates automatically.
      </PageHead>

      {total === 0 ? (
        <div className="panel">
          <EmptyState art={<ContourField />} title="No field logs yet" action={<a className="btn primary" href={href('start')}>Start your first session</a>}>
            Sessions you time or log will appear here. Nothing is pre-filled — this record is yours.
          </EmptyState>
        </div>
      ) : (
        <>
          <div className="filters panel tight" role="group" aria-label="Filters">
            <div className="field">
              <label htmlFor="f-mod">Activity</label>
              <select id="f-mod" className="select" value={modality} onChange={(e) => setModality(e.target.value as Modality | 'all')}>
                <option value="all">All activities</option>
                {used.map((m) => (
                  <option key={m} value={m}>
                    {modalityLabel(m, profile)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="f-range">Date range</label>
              <select id="f-range" className="select" value={range} onChange={(e) => setRange(e.target.value as Range)}>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="all">All time</option>
              </select>
            </div>
            <p className="small muted filters-count" aria-live="polite">
              {filtered.length} session{filtered.length === 1 ? '' : 's'}
            </p>
          </div>

          {groups.length === 0 ? (
            <div className="panel muted">No sessions match these filters.</div>
          ) : (
            groups.map(([day, sessions]) => (
              <section key={day} className="log-day" aria-label={fromDayKey(day).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}>
                <h2 className="log-day-title">{fromDayKey(day).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h2>
                <div className="panel tight">
                  <ul className="list">
                    {sessions.map((s) => {
                      const xp = progress.sessionRewards[s.id];
                      return (
                        <li key={s.id}>
                          <a className="list-item" href={href(`log/${s.id}`)}>
                            <ModalityIcon modality={s.modality} boxed />
                            <span style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ display: 'block', fontWeight: 500 }}>{modalityLabel(s.modality, profile)}</span>
                              <span className="tiny muted">
                                {new Date(s.startAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} · {formatMinutes(s.activeDurationSeconds)}
                                {s.details.kind === 'strength' && s.details.entries.length ? ` · ${s.details.entries.length} exercise${s.details.entries.length === 1 ? '' : 's'}` : ''}
                                {s.source === 'quick_log' ? ' · logged' : s.source === 'imported' ? ' · imported' : ' · timed'}
                              </span>
                            </span>
                            {s.effortFeedback && <span className={`badge ${s.effortFeedback === 'uncomfortable' ? 'orange' : ''} hide-sm`}>{FEEDBACK_LABEL[s.effortFeedback]}</span>}
                            <span className="badge lime">{xp ? `+${xp.total} XP` : 'No XP'}</span>
                            <ChevronRight size={16} className="muted" aria-hidden="true" />
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </section>
            ))
          )}
        </>
      )}
    </div>
  );
}
