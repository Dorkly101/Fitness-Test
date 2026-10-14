import { useState } from 'react';
import { ArrowLeft, ClipboardPlus, Play, ShieldCheck, TriangleAlert, Wind } from 'lucide-react';
import type { Modality, SessionDetails } from '../../domain/types';
import { useStore } from '../../state/store';
import { href, navigate } from '../../state/router';
import { ALL_MODALITIES, MODALITIES, emptyDetails, isRecommendable, modalityLabel } from '../../domain/modalities';
import { ModalityIcon, Option, PageHead, Segmented } from '../../components/ui';
import { BREATH_DURATIONS, BREATH_PRESETS, MEDITATION_DURATIONS, MEDITATION_TYPES } from '../../content/presets';
import { suitableExercise } from './StrengthEditor';
import { uid } from '../../state/uid';
import { objectiveLabel } from '../../domain/quests';
import { baseMinutes } from '../../domain/generator';

export function StartActivity({ modality, missionId }: { modality?: string; missionId?: string }) {
  const { data } = useStore();
  const valid = modality && (ALL_MODALITIES as string[]).includes(modality) ? (modality as Modality) : undefined;

  if (data.activeTimer) {
    return (
      <div className="page">
        <PageHead eyebrow="Session control" title="A session is already running" />
        <div className="panel">
          <p className="muted" style={{ marginBottom: 16 }}>
            Finish or discard <strong>{data.activeTimer.title}</strong> before starting another one.
          </p>
          <button className="btn primary" onClick={() => navigate(data.activeTimer?.reviewing ? 'review' : 'session')}>
            Return to session
          </button>
        </div>
      </div>
    );
  }

  if (!valid) return <ModalityPicker />;
  return <Setup key={`${valid}-${missionId}`} modality={valid} missionId={missionId} />;
}

function ModalityPicker() {
  const { data } = useStore();
  const profile = data.profile!;
  const enabled = profile.enabledModalities;
  const others = ALL_MODALITIES.filter((m) => !enabled.includes(m));
  return (
    <div className="page">
      <PageHead eyebrow="Session control" title="Start an activity" actions={<a className="btn" href={href('quick-log')}><ClipboardPlus size={16} aria-hidden="true" /> Log a finished session</a>}>
        Start a timer now, or log something you’ve already done. Short sessions count.
      </PageHead>
      <div className="option-grid launch-grid">
        {enabled.map((m) => (
          <button key={m} className="launch" onClick={() => navigate(`start/${m}`)}>
            <ModalityIcon modality={m} boxed large />
            <span className="launch-name">{modalityLabel(m, profile)}</span>
            <span className="tiny muted">{MODALITIES[m].callName}</span>
            {profile.flaggedModalities.includes(m) && <span className="badge orange">Paused from suggestions</span>}
          </button>
        ))}
      </div>
      {others.length > 0 && (
        <details className="disclosure">
          <summary>Other activity types ({others.length})</summary>
          <div className="option-grid" style={{ marginTop: 12 }}>
            {others.map((m) => (
              <button key={m} className="option" onClick={() => navigate(`start/${m}`)}>
                <ModalityIcon modality={m} boxed />
                <span>{modalityLabel(m, profile)}</span>
              </button>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function Setup({ modality, missionId }: { modality: Modality; missionId?: string }) {
  const store = useStore();
  const { data, progress, exercises } = store;
  const profile = data.profile!;
  const mission = missionId ? progress.quests.find((q) => q.instance.instanceId === missionId)?.instance : undefined;
  const suggested = mission?.suggestedMinutes ?? baseMinutes(modality, profile);
  const label = modalityLabel(modality, profile);
  const flagged = profile.flaggedModalities.includes(modality);
  const restricted = !isRecommendable(modality, profile) && profile.enabledModalities.includes(modality) && !flagged;

  const [medMinutes, setMedMinutes] = useState(() => MEDITATION_DURATIONS.reduce((best, d) => (Math.abs(d - suggested) < Math.abs(best - suggested) ? d : best), 5));
  const [medType, setMedType] = useState('Breath focus');
  const [preset, setPreset] = useState(BREATH_PRESETS[0].id);
  const [breathMinutes, setBreathMinutes] = useState(() => BREATH_DURATIONS.reduce((best, d) => (Math.abs(d - suggested) < Math.abs(best - suggested) ? d : best), 3));
  const [templateId, setTemplateId] = useState<string>('');
  const [targetMinutes, setTargetMinutes] = useState<number>(suggested);

  const begin = () => {
    let details: SessionDetails = emptyDetails(modality);
    let targetSeconds: number | undefined;
    let title = mission?.title ?? `${label}`;
    if (modality === 'meditation') {
      details = { kind: 'meditation', sessionType: medType, plannedMinutes: medMinutes };
      targetSeconds = medMinutes * 60;
      title = mission?.title ?? 'Signal calibration';
    } else if (modality === 'breathwork') {
      const p = BREATH_PRESETS.find((x) => x.id === preset)!;
      details = { kind: 'breathwork', presetId: p.id, presetName: p.name };
      targetSeconds = breathMinutes * 60;
      title = mission?.title ?? 'Signal sync';
    } else if (modality === 'strength') {
      const tpl = data.templates.find((t) => t.id === templateId);
      const entries = (tpl?.exerciseIds ?? [])
        .map((id) => exercises.find((e) => e.id === id))
        .filter((e): e is NonNullable<typeof e> => !!e && suitableExercise(e, profile.excludedMovements, profile.flaggedExercises))
        .map((e) => ({ id: uid('ent'), exerciseId: e.id, exerciseName: e.name, sets: [] }));
      details = { kind: 'strength', entries, templateId: tpl?.id };
      title = mission?.title ?? tpl?.name ?? 'Training protocol';
    } else {
      targetSeconds = targetMinutes > 0 ? targetMinutes * 60 : undefined;
    }
    store.startTimer({ modality, details, targetSeconds, missionInstanceId: mission?.instanceId, title });
    navigate('session');
  };

  return (
    <div className="page narrow">
      <a className="btn ghost small back-link" href={href('start')}>
        <ArrowLeft size={16} aria-hidden="true" /> All activities
      </a>
      <header className="setup-head">
        <ModalityIcon modality={modality} boxed large />
        <div>
          <div className="eyebrow">{MODALITIES[modality].callName}</div>
          <h1>{label}</h1>
        </div>
      </header>

      {mission && (
        <div className="notice info">
          <Play size={18} color="var(--signal-cyan)" aria-hidden="true" />
          <span>
            <strong>{mission.title}</strong> — {mission.objective.type === 'single_session' ? `${mission.objective.minutes} min` : objectiveLabel(mission.objective)}. +{mission.rewardXP} XP when complete.
          </span>
        </div>
      )}
      {flagged && (
        <div className="notice warn">
          <TriangleAlert size={18} aria-hidden="true" />
          <span>You marked this as uncomfortable recently, so it’s paused from suggestions. Only continue if it feels okay — you can clear the flag in Settings.</span>
        </div>
      )}
      {restricted && (
        <div className="notice warn">
          <TriangleAlert size={18} aria-hidden="true" />
          <span>This activity conflicts with a movement you chose to avoid, so it isn’t suggested. You can still log it if you choose.</span>
        </div>
      )}
      {profile.safetyNotes && (
        <div className="notice">
          <ShieldCheck size={18} aria-hidden="true" />
          <span>
            <span className="tiny muted">Your notes</span>
            <br />
            {profile.safetyNotes}
          </span>
        </div>
      )}

      <section className="panel stack-lg">
        {modality === 'meditation' && (
          <>
            <div className="field">
              <span className="field-label">Duration</span>
              <Segmented label="Meditation duration" value={medMinutes} options={MEDITATION_DURATIONS.map((d) => ({ value: d, label: `${d} min` }))} onChange={setMedMinutes} />
            </div>
            <div className="field">
              <span className="field-label">Focus</span>
              <Segmented label="Meditation type" value={medType} options={MEDITATION_TYPES.map((t) => ({ value: t, label: t }))} onChange={setMedType} />
            </div>
            <p className="small muted">A quiet countdown with a slow signal animation. No scores, no ratings required.</p>
          </>
        )}

        {modality === 'breathwork' && (
          <>
            <div className="field">
              <span className="field-label">Pattern</span>
              <div className="option-grid">
                {BREATH_PRESETS.map((p) => (
                  <Option key={p.id} role="radio" pressed={preset === p.id} onClick={() => setPreset(p.id)}>
                    <span>
                      <span style={{ display: 'block', fontWeight: 500 }}>{p.name}</span>
                      <span className="tiny muted">{p.description}</span>
                    </span>
                  </Option>
                ))}
              </div>
            </div>
            <div className="field">
              <span className="field-label">Duration</span>
              <Segmented label="Breathwork duration" value={breathMinutes} options={BREATH_DURATIONS.map((d) => ({ value: d, label: `${d} min` }))} onChange={setBreathMinutes} />
            </div>
            <div className="notice">
              <Wind size={18} aria-hidden="true" />
              <span className="small">Breathe comfortably through the nose if you can. No breath holds, no forcing. Stop straight away if you feel dizzy, light-headed or uncomfortable.</span>
            </div>
          </>
        )}

        {modality === 'strength' && (
          <div className="field">
            <span className="field-label">Start from</span>
            <div className="option-grid">
              <Option role="radio" pressed={templateId === ''} onClick={() => setTemplateId('')}>
                <span>
                  <span style={{ display: 'block', fontWeight: 500 }}>Free-form session</span>
                  <span className="tiny muted">Add exercises as you go</span>
                </span>
              </Option>
              {data.templates.map((t) => (
                <Option key={t.id} role="radio" pressed={templateId === t.id} onClick={() => setTemplateId(t.id)}>
                  <span>
                    <span style={{ display: 'block', fontWeight: 500 }}>{t.name}</span>
                    <span className="tiny muted">{t.exerciseIds.length} exercises</span>
                  </span>
                </Option>
              ))}
            </div>
            {data.templates.length === 0 && <span className="help">Save a session as a workout afterwards to reuse it here.</span>}
          </div>
        )}

        {!['meditation', 'breathwork', 'strength'].includes(modality) && (
          <div className="field">
            <span className="field-label">Target (optional)</span>
            <Segmented
              label="Target minutes"
              value={targetMinutes}
              options={[0, 5, 10, 15, 20, 30, 45].concat([suggested].filter((s) => ![0, 5, 10, 15, 20, 30, 45].includes(s))).sort((a, b) => a - b).map((v) => ({ value: v, label: v === 0 ? 'Open' : `${v} min` }))}
              onChange={setTargetMinutes}
            />
            <span className="help">The timer counts up. A target just shows a marker — keep going or stop whenever you like.</span>
          </div>
        )}

        <div className="row" style={{ gap: 12 }}>
          <button className="btn primary large" onClick={begin}>
            <Play size={18} aria-hidden="true" /> Start {modality === 'meditation' || modality === 'breathwork' ? 'practice' : 'timer'}
          </button>
          <a className="btn" href={href(`quick-log/${modality}${mission ? `/${encodeURIComponent(mission.instanceId)}` : ''}`)}>
            <ClipboardPlus size={16} aria-hidden="true" /> Already done? Log it
          </a>
        </div>
      </section>
    </div>
  );
}
