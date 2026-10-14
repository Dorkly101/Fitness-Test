import { useState } from 'react';
import { ArrowLeft, Pencil, Save, Trash2, TriangleAlert } from 'lucide-react';
import type { ActivitySession, EffortFeedback, SessionDetails } from '../../domain/types';
import { useStore } from '../../state/store';
import { href, navigate } from '../../state/router';
import { modalityLabel } from '../../domain/modalities';
import { Dialog, ModalityIcon } from '../../components/ui';
import { formatDuration, formatMinutes, toLocalInput } from '../../domain/time';
import { DetailsFields } from '../activity/DetailsFields';
import { FeedbackPicker, UncomfortableNotice, flagOptions } from '../activity/Feedback';
import { formatSets } from '../activity/StrengthEditor';
import { useToast } from '../../components/toast';

const FEEDBACK_LABEL = { easy: 'Easy', about_right: 'About right', too_hard: 'Too hard', uncomfortable: 'Uncomfortable' } as const;

export function SessionDetail({ id }: { id: string }) {
  const store = useStore();
  const toast = useToast();
  const { data, progress } = store;
  const profile = data.profile!;
  const session = data.sessions.find((s) => s.id === id);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!session) {
    return (
      <div className="page narrow">
        <div className="panel">
          <h1>Entry not found</h1>
          <p className="muted" style={{ margin: '8px 0 16px' }}>It may have been deleted.</p>
          <a className="btn" href={href('log')}>
            Back to activity log
          </a>
        </div>
      </div>
    );
  }
  const xp = progress.sessionRewards[session.id];
  const d = session.details;

  return (
    <div className="page narrow">
      <a className="btn ghost small back-link" href={href('log')}>
        <ArrowLeft size={16} aria-hidden="true" /> Activity log
      </a>
      <header className="setup-head">
        <ModalityIcon modality={session.modality} boxed large />
        <div style={{ flex: 1 }}>
          <div className="eyebrow">{new Date(session.startAt).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
          <h1>{modalityLabel(session.modality, profile)}</h1>
        </div>
        {!editing && (
          <div className="row">
            <button className="btn" onClick={() => setEditing(true)}>
              <Pencil size={16} aria-hidden="true" /> Edit
            </button>
            <button className="btn ghost" onClick={() => setConfirmDelete(true)} aria-label="Delete session">
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </div>
        )}
      </header>

      {editing ? (
        <EditForm
          session={session}
          onCancel={() => setEditing(false)}
          onSave={(s, flags) => {
            store.saveSession(s, flags);
            setEditing(false);
            toast('Entry updated. Progress recalculated.');
          }}
        />
      ) : (
        <>
          <section className="panel">
            <dl className="kv">
              <dt>Active time</dt>
              <dd className="num">
                {formatDuration(session.activeDurationSeconds)} ({formatMinutes(session.activeDurationSeconds)})
              </dd>
              <dt>Started</dt>
              <dd>{new Date(session.startAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</dd>
              <dt>Recorded by</dt>
              <dd>{session.source === 'timer' ? 'Timer' : session.source === 'quick_log' ? 'Quick log' : 'Import'}</dd>
              <dt>Felt</dt>
              <dd>{session.effortFeedback ? FEEDBACK_LABEL[session.effortFeedback] : <span className="muted">Not reported</span>}</dd>
              {d.kind === 'cardio' && d.distanceKm != null && (
                <>
                  <dt>Distance</dt>
                  <dd>{d.distanceKm} km</dd>
                </>
              )}
              {d.kind === 'cardio' && d.steps != null && (
                <>
                  <dt>Steps</dt>
                  <dd>{d.steps}</dd>
                </>
              )}
              {d.kind === 'cardio' && d.resistance && (
                <>
                  <dt>Incline / resistance</dt>
                  <dd>{d.resistance}</dd>
                </>
              )}
              {d.kind === 'vr' && d.gameName && (
                <>
                  <dt>Game</dt>
                  <dd>{d.gameName}</dd>
                </>
              )}
              {d.kind === 'vr' && d.effort != null && (
                <>
                  <dt>Effort</dt>
                  <dd>{d.effort} / 10</dd>
                </>
              )}
              {d.kind === 'meditation' && d.sessionType && (
                <>
                  <dt>Type</dt>
                  <dd>{d.sessionType}</dd>
                </>
              )}
              {d.kind === 'breathwork' && (
                <>
                  <dt>Pattern</dt>
                  <dd>{d.presetName}</dd>
                </>
              )}
              {(d.kind === 'mobility' || d.kind === 'other') && d.label && (
                <>
                  <dt>Label</dt>
                  <dd>{d.label}</dd>
                </>
              )}
              {session.notes && (
                <>
                  <dt>Notes</dt>
                  <dd style={{ whiteSpace: 'pre-wrap' }}>{session.notes}</dd>
                </>
              )}
            </dl>
          </section>
          {d.kind === 'strength' && (
            <section className="panel">
              <h2 style={{ marginBottom: 12 }}>Exercises</h2>
              {d.entries.length === 0 ? (
                <p className="muted small">No sets recorded for this session.</p>
              ) : (
                <ul className="list">
                  {d.entries.map((e) => (
                    <li key={e.id} className="list-item" style={{ display: 'block' }}>
                      <strong>{e.exerciseName}</strong>
                      <div className="small muted">{e.sets.length ? `${e.sets.length} set${e.sets.length === 1 ? '' : 's'}: ${formatSets(e.sets, profile.settings.units)}` : 'No sets'}</div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
          <section className="panel tight">
            <div className="row between">
              <span className="small">Rewards from this session</span>
              <span className="badge lime">{xp ? `+${xp.total} XP` : 'No XP'}</span>
            </div>
            {xp ? (
              <p className="tiny muted" style={{ marginTop: 6 }}>
                Session +{xp.baseXP} · Duration +{xp.durationXP} · Mission bonus +{xp.questXP}
                {xp.diminished ? ' · reduced base (4th+ session that day)' : ''}
              </p>
            ) : (
              <p className="tiny muted" style={{ marginTop: 6 }}>Sessions under a minute are logged without XP.</p>
            )}
          </section>
        </>
      )}

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this entry?"
        actions={
          <>
            <button className="btn" onClick={() => setConfirmDelete(false)}>
              Keep it
            </button>
            <button
              className="btn danger"
              onClick={() => {
                store.deleteSession(session.id);
                toast('Entry deleted. Progress recalculated.', 'info');
                navigate('log', { replace: true });
              }}
            >
              <Trash2 size={16} aria-hidden="true" /> Delete
            </button>
          </>
        }
      >
        <p className="muted">XP, missions and map progress are recalculated from your remaining log. This can’t be undone (unless you have an export).</p>
      </Dialog>
    </div>
  );
}

function EditForm({ session, onCancel, onSave }: { session: ActivitySession; onCancel: () => void; onSave: (s: ActivitySession, flags: ReturnType<typeof flagOptions>) => void }) {
  const { data } = useStore();
  const profile = data.profile!;
  const [mins, setMins] = useState(String(Math.round((session.activeDurationSeconds / 60) * 10) / 10));
  const [start, setStart] = useState(toLocalInput(session.startAt));
  const [details, setDetails] = useState<SessionDetails>(session.details);
  const [feedback, setFeedback] = useState<EffortFeedback | undefined>(session.effortFeedback);
  const [notes, setNotes] = useState(session.notes ?? '');
  const [flagEx, setFlagEx] = useState<string[]>([]);
  const [error, setError] = useState<string>();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const m = Number(mins);
    if (!Number.isFinite(m) || m <= 0 || m > 720) return setError('Enter a duration between 0 and 720 minutes.');
    const st = new Date(start);
    if (Number.isNaN(st.getTime())) return setError('Enter a valid start time.');
    if (st.getTime() > Date.now() + 5 * 60_000) return setError('Start time can’t be in the future.');
    const secs = Math.round(m * 60);
    const newlyUncomfortable = feedback === 'uncomfortable' && session.effortFeedback !== 'uncomfortable';
    onSave(
      {
        ...session,
        activeDurationSeconds: secs,
        startAt: st.toISOString(),
        endAt: new Date(st.getTime() + secs * 1000).toISOString(),
        details,
        effortFeedback: feedback,
        notes: notes.trim() || undefined,
        updatedAt: new Date().toISOString(),
      },
      newlyUncomfortable ? flagOptions(session.modality, feedback, flagEx) : {},
    );
  };

  return (
    <form className="panel stack-lg" onSubmit={submit} noValidate>
      <div className="grid grid-2">
        <div className="field">
          <label htmlFor="e-min">Active minutes</label>
          <input id="e-min" className="input" inputMode="decimal" value={mins} onChange={(e) => setMins(e.target.value.replace(/[^\d.]/g, ''))} />
        </div>
        <div className="field">
          <label htmlFor="e-start">Started at</label>
          <input id="e-start" className="input" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <span className="field-label">Details</span>
        <DetailsFields details={details} onChange={setDetails} excludeSessionId={session.id} />
      </div>
      <FeedbackPicker value={feedback} onChange={setFeedback} />
      {feedback === 'uncomfortable' && session.effortFeedback !== 'uncomfortable' && (
        <UncomfortableNotice modality={session.modality} profile={profile} entries={details.kind === 'strength' ? details.entries : undefined} flagged={flagEx} onToggle={(id) => setFlagEx((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]))} />
      )}
      <div className="field">
        <label htmlFor="e-notes">Notes</label>
        <textarea id="e-notes" className="textarea" maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {error && (
        <p className="error-text" role="alert">
          <TriangleAlert size={16} aria-hidden="true" /> {error}
        </p>
      )}
      <div className="row">
        <button className="btn primary" type="submit">
          <Save size={16} aria-hidden="true" /> Save changes
        </button>
        <button className="btn ghost" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
