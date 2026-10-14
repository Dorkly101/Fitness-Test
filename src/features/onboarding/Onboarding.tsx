import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Lock, ShieldCheck } from 'lucide-react';
import type { UserProfile } from '../../domain/types';
import { useStore } from '../../state/store';
import { navigate } from '../../state/router';
import { uid } from '../../state/uid';
import { DEFAULT_SETTINGS, DEFAULT_TARGETS } from '../../storage/schema';
import { PlanetHero } from '../../components/art/PlanetHero';
import { BrandMark } from '../../components/art/Glyphs';
import {
  ActivitiesField,
  CallsignField,
  DisplayField,
  EquipmentField,
  MotivationsField,
  RestrictionsField,
  ScheduleField,
  TargetsField,
} from '../profile/ProfileFields';

function initialDraft(): UserProfile {
  const now = new Date().toISOString();
  return {
    id: uid('pro'),
    createdAt: now,
    updatedAt: now,
    enabledModalities: [],
    favouriteModalities: [],
    modalityLabels: {},
    availableEquipment: [],
    excludedMovements: [],
    weeklyAvailability: [0, 1, 2, 3, 4, 5, 6],
    preferredDurationRange: '15-30',
    startingBaseline: 'new',
    primaryMotivations: [],
    weeklyTargets: { ...DEFAULT_TARGETS },
    standingTargets: {},
    flaggedModalities: [],
    flaggedExercises: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

const STEPS = [
  { id: 'crew', eyebrow: 'Crew manifest', title: 'Who’s joining the expedition?', intro: 'Everything here is optional and editable later in Settings.' },
  { id: 'activities', eyebrow: 'Field kit', title: 'How do you like to move?', intro: 'Pick at least one. Missions are built only from what you enable.' },
  { id: 'schedule', eyebrow: 'Mission windows', title: 'When and how long?', intro: 'Suggestions stay inside these limits.' },
  { id: 'targets', eyebrow: 'Weekly contract', title: 'Set your own pace', intro: 'A weekly target, not a daily streak. Missing a day never costs progress.' },
  { id: 'safety', eyebrow: 'Safety settings', title: 'Anything to steer around?', intro: 'FRONTIER is for motivation and logging, not medical advice. Stop any activity that causes pain, dizziness or chest discomfort.' },
  { id: 'display', eyebrow: 'Display', title: 'Tune the interface', intro: 'Accessibility options you can change at any time.' },
] as const;

export function Onboarding() {
  const { completeOnboarding } = useStore();
  const [step, setStep] = useState(-1);
  const [draft, setDraft] = useState<UserProfile>(initialDraft);
  const [error, setError] = useState<string>();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const patch = (p: Partial<UserProfile>) => {
    setError(undefined);
    setDraft((d) => ({ ...d, ...p }));
  };

  const go = (to: number) => {
    if (STEPS[step]?.id === 'activities' && to > step && draft.enabledModalities.length === 0) {
      setError('Enable at least one activity so missions have something to suggest.');
      return;
    }
    setError(undefined);
    setStep(to);
    window.scrollTo({ top: 0 });
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  const finish = () => {
    const now = new Date().toISOString();
    const favourites = draft.favouriteModalities.length ? draft.favouriteModalities : draft.enabledModalities.slice(0, 2);
    completeOnboarding({ ...draft, callsign: draft.callsign?.trim() || undefined, favouriteModalities: favourites, createdAt: now, updatedAt: now });
    navigate('home', { replace: true });
  };

  if (step < 0) {
    return (
      <div className="onboard-welcome">
        <PlanetHero className="onboard-art" palette="arrival" outpostStage={0} waypointsLit={0} />
        <div className="onboard-welcome-body">
          <div className="row" style={{ gap: 10, marginBottom: 20 }}>
            <BrandMark size={32} />
            <span className="brand-word" style={{ fontSize: '1.05rem' }}>
              FRONTIER
            </span>
          </div>
          <h1 className="display-xl">The map is blank. Your movement fills it in.</h1>
          <p className="lead">
            Walks become recon. Strength sessions train the operative. Meditation and gentle breathing calibrate the signal. Every real session you log moves the expedition forward.
          </p>
          <div className="row" style={{ marginTop: 28, gap: 16 }}>
            <button className="btn primary large" onClick={() => go(0)}>
              Begin expedition <ArrowRight size={18} aria-hidden="true" />
            </button>
            <span className="row small muted" style={{ gap: 6 }}>
              <Lock size={14} aria-hidden="true" /> No account. Your data stays on this device.
            </span>
          </div>
        </div>
      </div>
    );
  }

  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div className="onboard">
      <header className="onboard-top">
        <div className="row" style={{ gap: 10 }}>
          <BrandMark size={26} />
          <span className="brand-word">FRONTIER</span>
        </div>
        <ol className="steps" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
          {STEPS.map((x, i) => (
            <li key={x.id} className={i < step ? 'done' : i === step ? 'current' : ''} aria-current={i === step ? 'step' : undefined}>
              <span className="sr-only">
                {x.eyebrow}
                {i < step ? ' (done)' : ''}
              </span>
            </li>
          ))}
        </ol>
      </header>
      <section className="onboard-body panel marked" aria-labelledby="onboard-title">
        <div className="eyebrow">
          {String(step + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')} · {s.eyebrow}
        </div>
        <h1 id="onboard-title" tabIndex={-1} ref={headingRef} style={{ margin: '8px 0 8px', outline: 'none' }}>
          {s.title}
        </h1>
        <p className="muted" style={{ marginBottom: 28, maxWidth: 620 }}>
          {s.id === 'safety' && <ShieldCheck size={16} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 6 }} aria-hidden="true" />}
          {s.intro}
        </p>

        {s.id === 'crew' && (
          <div className="stack-lg">
            <CallsignField value={draft} onChange={patch} />
            <MotivationsField value={draft} onChange={patch} />
          </div>
        )}
        {s.id === 'activities' && (
          <div className="stack-lg">
            <ActivitiesField value={draft} onChange={patch} />
            <EquipmentField value={draft} onChange={patch} />
          </div>
        )}
        {s.id === 'schedule' && <ScheduleField value={draft} onChange={patch} />}
        {s.id === 'targets' && <TargetsField value={draft} onChange={patch} />}
        {s.id === 'safety' && <RestrictionsField value={draft} onChange={patch} />}
        {s.id === 'display' && <DisplayField value={draft} onChange={patch} />}

        {error && (
          <p className="error-text" role="alert" style={{ marginTop: 20 }}>
            {error}
          </p>
        )}

        <div className="onboard-actions">
          <button className="btn ghost" onClick={() => go(step - 1)}>
            <ArrowLeft size={16} aria-hidden="true" /> Back
          </button>
          <div className="row">
            {!last && s.id !== 'activities' && (
              <button className="btn ghost" onClick={() => go(step + 1)}>
                Skip
              </button>
            )}
            {last ? (
              <button className="btn primary large" onClick={finish}>
                Open Mission Control <ArrowRight size={18} aria-hidden="true" />
              </button>
            ) : (
              <button className="btn primary" onClick={() => go(step + 1)}>
                Continue <ArrowRight size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
