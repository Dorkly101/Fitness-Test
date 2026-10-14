import { useRef, useState } from 'react';
import { ArrowLeft, Save, TriangleAlert } from 'lucide-react';
import type { ActivitySession, EffortFeedback, Modality, SessionDetails } from '../../domain/types';
import { useStore } from '../../state/store';
import { href, navigate } from '../../state/router';
import { ALL_MODALITIES, emptyDetails, modalityLabel } from '../../domain/modalities';
import { ModalityIcon, Option, PageHead } from '../../components/ui';
import { toLocalInput } from '../../domain/time';
import { looksLikeDuplicate } from '../../domain/sessions';
import { uid } from '../../state/uid';
import { DetailsFields } from './DetailsFields';
import { FeedbackPicker, UncomfortableNotice, flagOptions } from './Feedback';
import { baseMinutes } from '../../domain/generator';

export function QuickLog({ initialModality, missionId }: { initialModality?: string; missionId?: string }) {
  const store = useStore();
  const { data, progress } = store;
  const profile = data.profile!;
  const init = initialModality && (ALL_MODALITIES as string[]).includes(initialModality) ? (initialModality as Modality) : undefined;
  const mission = missionId ? progress.quests.find((q) => q.instance.instanceId === missionId)?.instance : undefined;
  const [modality, setModality] = useState<Modality | undefined>(init);
  const [minutes, setMinutes] = useState<string>(init ? String(mission?.suggestedMinutes ?? baseMinutes(init, profile)) : '');
  const [when, setWhen] = useState(() => toLocalInput(new Date()));
  const [details, setDetails] = useState<SessionDetails | undefined>(init ? emptyDetails(init) : undefined);
  const [notes, setNotes] = useState('');
  const [feedback, setFeedback] = useState<EffortFeedback>();
  const [flagEx, setFlagEx] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const submitting = useRef(false);

  const choose = (m: Modality) => {
    setModality(m);
    setDetails(emptyDetails(m));
    if (!minutes) setMinutes(String(baseMinutes(m, profile)));
    setError(undefined);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    if (!modality || !details) return setError('Choose an activity type.');
    const mins = Number(minutes);
    if (!Number.isFinite(mins) || mins < 1 || mins > 600) return setError('Enter a duration between 1 and 600 minutes.');
    const end = new Date(when);
    if (Number.isNaN(end.getTime())) return setError('Enter a valid date and time.');
    if (end.getTime() > Date.now() + 5 * 60_000) return setError('That time is in the future. Log sessions after they happen.');
    const secs = Math.round(mins * 60);
    const start = new Date(end.getTime() - secs * 1000);
    const now = new Date().toISOString();
    const session: ActivitySession = {
      id: uid('ses'),
      modality,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      activeDurationSeconds: secs,
      status: 'completed',
      source: 'quick_log',
      notes: notes.trim() || undefined,
      effortFeedback: feedback,
      details,
      missionInstanceId: mission?.instanceId,
      createdAt: now,
      updatedAt: now,
    };
    if (looksLikeDuplicate(session, data.sessions, Date.now())) return setError('This looks identical to a session you just saved, so it wasn’t added twice.');
    submitting.current = true;
    store.saveSession(session, flagOptions(modality, feedback, flagEx));
    navigate(`complete/${session.id}`, { replace: true });
  };

  const enabled = profile.enabledModalities;
  const list = [...enabled, ...ALL_MODALITIES.filter((m) => !enabled.includes(m))];
  const backdated = new Date(when).getTime() < Date.now() - 36 * 3600_000;

  return (
    <div className="page narrow">
      <a className="btn ghost small back-link" href={href('start')}>
        <ArrowLeft size={16} aria-hidden="true" /> Back
      </a>
      <PageHead eyebrow="Field log" title="Log a finished session">
        Already done it? Record it in three steps. Only the activity and duration are required.
      </PageHead>
      <form className="panel stack-lg" onSubmit={save} noValidate>
        <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="field-label" style={{ marginBottom: 8 }}>
            1 · Activity
          </legend>
          <div className="option-grid">
            {list.map((m) => (
              <Option key={m} role="radio" pressed={modality === m} onClick={() => choose(m)}>
                <ModalityIcon modality={m} boxed />
                <span>{modalityLabel(m, profile)}</span>
              </Option>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-2">
          <div className="field">
            <label htmlFor="ql-min">2 · Active minutes</label>
            <input id="ql-min" className="input" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/[^\d.]/g, ''))} placeholder="e.g. 20" aria-invalid={!!error && /duration/.test(error)} required />
          </div>
          <div className="field">
            <label htmlFor="ql-when">Finished at</label>
            <input id="ql-when" className="input" type="datetime-local" value={when} max={toLocalInput(new Date())} onChange={(e) => setWhen(e.target.value)} />
            {backdated && <span className="help">Backfilled sessions are recorded on the date you choose, not today.</span>}
          </div>
        </div>

        {modality && details && (
          <div className="field">
            <span className="field-label">Details (optional)</span>
            <DetailsFields details={details} onChange={setDetails} />
          </div>
        )}

        <FeedbackPicker value={feedback} onChange={setFeedback} />
        {feedback === 'uncomfortable' && modality && (
          <UncomfortableNotice modality={modality} profile={profile} entries={details?.kind === 'strength' ? details.entries : undefined} flagged={flagEx} onToggle={(id) => setFlagEx((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]))} />
        )}

        <div className="field">
          <label htmlFor="ql-notes">Notes (optional)</label>
          <textarea id="ql-notes" className="textarea" maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth remembering" />
        </div>

        {error && (
          <p className="error-text" role="alert">
            <TriangleAlert size={16} aria-hidden="true" /> {error}
          </p>
        )}
        <div className="row">
          <button className="btn primary large" type="submit">
            <Save size={18} aria-hidden="true" /> 3 · Save to field log
          </button>
        </div>
      </form>
    </div>
  );
}
