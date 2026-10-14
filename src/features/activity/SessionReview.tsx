import { useEffect, useRef, useState } from 'react';
import { BookmarkPlus, Play, Save, Trash2, TriangleAlert } from 'lucide-react';
import type { ActivitySession, EffortFeedback, SessionDetails } from '../../domain/types';
import { useStore } from '../../state/store';
import { navigate } from '../../state/router';
import { elapsedMs, SUSPICIOUS_ELAPSED_SECONDS } from '../../domain/timer';
import { formatDuration } from '../../domain/time';
import { modalityLabel } from '../../domain/modalities';
import { Dialog, ModalityIcon } from '../../components/ui';
import { DetailsFields } from './DetailsFields';
import { FeedbackPicker, UncomfortableNotice, flagOptions } from './Feedback';
import { XP_RULES } from '../../domain/xp';
import { useToast } from '../../components/toast';

export function SessionReview({ preset }: { preset?: string }) {
  const store = useStore();
  const toast = useToast();
  const { data } = store;
  const timer = data.activeTimer;
  const profile = data.profile!;
  const measured = timer ? Math.round(elapsedMs(timer, Date.now()) / 1000) : 0;
  const [mins, setMins] = useState(() => String(Math.floor(measured / 60)));
  const [secs, setSecs] = useState(() => String(measured % 60));
  const [details, setDetails] = useState<SessionDetails | undefined>(timer?.details);
  const [feedback, setFeedback] = useState<EffortFeedback | undefined>(preset === 'uncomfortable' ? 'uncomfortable' : undefined);
  const [flagEx, setFlagEx] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string>();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const saving = useRef(false);

  useEffect(() => {
    if (!timer) navigate('home', { replace: true });
  }, [timer]);
  if (!timer || !details) return null;

  const duration = Math.round((Number(mins) || 0) * 60 + (Number(secs) || 0));
  const suspicious = measured > SUSPICIOUS_ELAPSED_SECONDS;

  const save = () => {
    if (saving.current) return;
    if (!Number.isFinite(duration) || duration < 1) return setError('Enter a duration of at least one second.');
    if (duration > 12 * 3600) return setError('That duration is longer than 12 hours. Please check it.');
    saving.current = true;
    const now = new Date().toISOString();
    const lastEnd = timer.intervals[timer.intervals.length - 1]?.end ?? Date.now();
    const session: ActivitySession = {
      id: timer.sessionId,
      modality: timer.modality,
      startAt: timer.startedAt,
      endAt: new Date(lastEnd).toISOString(),
      activeDurationSeconds: duration,
      status: 'completed',
      source: 'timer',
      notes: notes.trim() || undefined,
      effortFeedback: feedback,
      details,
      missionInstanceId: timer.missionInstanceId,
      createdAt: now,
      updatedAt: now,
    };
    store.saveSession(session, flagOptions(timer.modality, feedback, flagEx));
    if (details.kind === 'strength' && templateName.trim() && details.entries.length) {
      store.saveTemplate({ name: templateName.trim().slice(0, 60), exerciseIds: details.entries.map((e) => e.exerciseId) });
      toast(`Workout “${templateName.trim()}” saved for next time.`);
    }
    navigate(`complete/${session.id}`, { replace: true });
  };

  return (
    <div className="session review">
      <header className="session-top">
        <div className="row" style={{ gap: 10 }}>
          <ModalityIcon modality={timer.modality} boxed />
          <div>
            <div className="small" style={{ fontWeight: 600 }}>{timer.title}</div>
            <div className="tiny muted">{modalityLabel(timer.modality, profile)}</div>
          </div>
        </div>
        <span className="badge">Review</span>
      </header>
      <main className="session-main review-main" id="main">
        <div className="panel marked stack-lg" style={{ width: '100%' }}>
          <div>
            <div className="eyebrow">Session review</div>
            <h1 style={{ marginTop: 6 }}>Confirm your field log</h1>
          </div>
          {preset === 'uncomfortable' && (
            <div className="notice danger" role="alert">
              <TriangleAlert size={18} aria-hidden="true" />
              <span>Guidance stopped. Sit or lie down and breathe normally until you feel settled. If symptoms don’t pass, seek medical help.</span>
            </div>
          )}
          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="field-label" style={{ marginBottom: 6 }}>
              Active duration · measured {formatDuration(measured)}
            </legend>
            <div className="row">
              <input className="input dur-input" inputMode="numeric" aria-label="Minutes" value={mins} onChange={(e) => setMins(e.target.value.replace(/\D/g, ''))} />
              <span className="muted">min</span>
              <input className="input dur-input" inputMode="numeric" aria-label="Seconds" value={secs} onChange={(e) => setSecs(e.target.value.replace(/\D/g, '').slice(0, 2))} />
              <span className="muted">sec</span>
            </div>
            {suspicious && <span className="help" style={{ color: '#ffb19e' }}>This timer ran for a long time — was it left running? Adjust the duration if needed.</span>}
            {duration < XP_RULES.minValidSeconds && <span className="help">Sessions under a minute are saved to your log but don’t earn XP.</span>}
          </fieldset>

          {details.kind !== 'meditation' && details.kind !== 'breathwork' && (
            <div className="field">
              <span className="field-label">{details.kind === 'strength' ? 'Exercises & sets' : 'Details (optional)'}</span>
              <DetailsFields details={details} onChange={setDetails} excludeSessionId={timer.sessionId} />
            </div>
          )}
          {details.kind === 'strength' && details.entries.length > 0 && !details.templateId && (
            <div className="field" style={{ maxWidth: 420 }}>
              <label htmlFor="tpl-name">
                <BookmarkPlus size={14} style={{ display: 'inline', verticalAlign: '-2px' }} aria-hidden="true" /> Save these exercises as a reusable workout (optional)
              </label>
              <input id="tpl-name" className="input" placeholder="e.g. Home upper body" maxLength={60} value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
            </div>
          )}

          <FeedbackPicker value={feedback} onChange={setFeedback} />
          {feedback === 'uncomfortable' && (
            <UncomfortableNotice modality={timer.modality} profile={profile} entries={details.kind === 'strength' ? details.entries : undefined} flagged={flagEx} onToggle={(id) => setFlagEx((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]))} />
          )}
          {feedback === 'too_hard' && <p className="small muted">Noted. Your next comparable mission will be shorter.</p>}

          <div className="field">
            <label htmlFor="rv-notes">Notes (optional)</label>
            <textarea id="rv-notes" className="textarea" maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {error && (
            <p className="error-text" role="alert">
              <TriangleAlert size={16} aria-hidden="true" /> {error}
            </p>
          )}
          <div className="row between">
            <div className="row">
              <button className="btn primary large" onClick={save}>
                <Save size={18} aria-hidden="true" /> Save session
              </button>
              {preset !== 'uncomfortable' && (
                <button
                  className="btn"
                  onClick={() => {
                    store.resume();
                    navigate('session', { replace: true });
                  }}
                >
                  <Play size={16} aria-hidden="true" /> Resume timer
                </button>
              )}
            </div>
            <button className="btn ghost" onClick={() => setConfirmDiscard(true)}>
              <Trash2 size={16} aria-hidden="true" /> Discard
            </button>
          </div>
        </div>
      </main>
      <Dialog
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        title="Discard this session?"
        actions={
          <>
            <button className="btn" onClick={() => setConfirmDiscard(false)}>
              Go back
            </button>
            <button
              className="btn danger"
              onClick={() => {
                store.discardTimer();
                navigate('home', { replace: true });
              }}
            >
              Discard
            </button>
          </>
        }
      >
        <p className="muted">The recorded time won’t be saved.</p>
      </Dialog>
    </div>
  );
}
