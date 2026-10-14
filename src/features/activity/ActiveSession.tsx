import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CircleStop, Flag, Pause, Play, Trash2, TriangleAlert } from 'lucide-react';
import { useStore } from '../../state/store';
import { navigate } from '../../state/router';
import { elapsedMs, isRunning, remainingSeconds } from '../../domain/timer';
import { formatDuration } from '../../domain/time';
import { MODALITIES, modalityLabel } from '../../domain/modalities';
import { Dialog, ModalityIcon } from '../../components/ui';
import { SignalRings } from '../../components/art/Glyphs';
import { BREATH_PRESETS, type BreathPreset } from '../../content/presets';
import { DetailsFields } from './DetailsFields';
import { chime } from '../../components/sound';

function useNow(ms: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms);
    const vis = () => setNow(Date.now());
    document.addEventListener('visibilitychange', vis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', vis);
    };
  }, [ms]);
  return now;
}

function usePrefersReducedMotion(setting: string) {
  const [sys, setSys] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const on = () => setSys(mq.matches);
    mq?.addEventListener('change', on);
    return () => mq?.removeEventListener('change', on);
  }, []);
  return setting === 'reduced' || (setting === 'system' && sys);
}

export function ActiveSession() {
  const store = useStore();
  const { data } = store;
  const timer = data.activeTimer;
  const profile = data.profile!;
  const breath = timer?.details.kind === 'breathwork';
  const now = useNow(breath ? 100 : 500);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const autoFinished = useRef(false);
  const reduced = usePrefersReducedMotion(profile.settings.motion);

  const elapsed = timer ? elapsedMs(timer, now) / 1000 : 0;
  const remaining = timer ? remainingSeconds(timer, now) : undefined;
  const running = timer ? isRunning(timer) : false;
  const countdown = timer && (timer.details.kind === 'meditation' || timer.details.kind === 'breathwork') && timer.targetSeconds;

  // Opened directly (e.g. after a reload): send the player where the timer actually is.
  useEffect(() => {
    if (!timer) navigate('home', { replace: true });
    else if (timer.reviewing) navigate('review', { replace: true });
  }, []);

  // Countdown practices end themselves gently.
  useEffect(() => {
    if (!timer || !countdown || autoFinished.current) return;
    if (remaining !== undefined && remaining <= 0) {
      autoFinished.current = true;
      chime(profile.settings.sound);
      store.beginReview();
      navigate('review', { replace: true });
    }
  }, [remaining, countdown, timer, store, profile.settings.sound]);

  if (!timer) return null;
  const finish = () => {
    store.beginReview();
    navigate('review');
  };
  const stopUncomfortable = () => {
    store.updateTimer({ details: timer.details });
    store.beginReview();
    navigate('review/uncomfortable');
  };

  const kind = timer.details.kind;
  const targetProgress = timer.targetSeconds ? Math.min(1, elapsed / timer.targetSeconds) : undefined;
  const big = countdown ? formatDuration(Math.ceil(remaining ?? 0)) : formatDuration(elapsed);
  const preset = kind === 'breathwork' ? BREATH_PRESETS.find((p) => p.id === (timer.details as { presetId: string }).presetId) ?? BREATH_PRESETS[0] : undefined;

  return (
    <div className={`session session-${MODALITIES[timer.modality].domain}`}>
      <header className="session-top">
        <button className="btn ghost small" onClick={() => navigate('home')} aria-label="Leave screen; the timer keeps running">
          <ArrowLeft size={16} aria-hidden="true" /> Mission Control
        </button>
        <div className="row" style={{ gap: 10 }}>
          <ModalityIcon modality={timer.modality} boxed />
          <div>
            <div className="small" style={{ fontWeight: 600 }}>{timer.title}</div>
            <div className="tiny muted">{modalityLabel(timer.modality, profile)}</div>
          </div>
        </div>
        <span className={`badge ${running ? 'lime' : ''}`} aria-live="polite">
          {running ? 'Recording' : 'Paused'}
        </span>
      </header>

      <main className="session-main" id="main">
        {kind === 'meditation' && (
          <div className={`med-visual ${running ? 'running' : ''}`}>
            <SignalRings tone="var(--anomaly-violet)" animate={running && !reduced} />
          </div>
        )}
        {kind === 'breathwork' && preset && <BreathOrb preset={preset} elapsed={elapsed} running={running} reduced={reduced} />}

        <div className="timer-block">
          <div className="eyebrow">{countdown ? 'Remaining' : 'Active time'}</div>
          <div className="timer num" role="timer" aria-live="off" aria-label={`${countdown ? 'Remaining' : 'Elapsed'} ${big}`}>
            {big}
          </div>
          {targetProgress !== undefined && !countdown && (
            <div className="target-line">
              <div className="bar lime">
                <span style={{ width: `${targetProgress * 100}%` }} />
              </div>
              <span className="tiny muted">
                {targetProgress >= 1 ? (
                  <>
                    <Flag size={12} aria-hidden="true" /> Target reached — keep going or finish whenever you like
                  </>
                ) : (
                  `Target ${Math.round((timer.targetSeconds ?? 0) / 60)} min`
                )}
              </span>
            </div>
          )}
        </div>

        <div className="session-controls">
          {running ? (
            <button className="btn large" onClick={store.pause}>
              <Pause size={20} aria-hidden="true" /> Pause
            </button>
          ) : (
            <button className="btn large" onClick={store.resume}>
              <Play size={20} aria-hidden="true" /> Resume
            </button>
          )}
          <button className="btn primary large" onClick={finish}>
            <CircleStop size={20} aria-hidden="true" /> {countdown ? 'End now' : 'Finish'}
          </button>
        </div>
        {kind === 'breathwork' && (
          <button className="btn danger" onClick={stopUncomfortable}>
            <TriangleAlert size={16} aria-hidden="true" /> Stop — I feel dizzy or uncomfortable
          </button>
        )}

        {(kind === 'strength' || kind === 'cardio' || kind === 'vr' || kind === 'mobility' || kind === 'other') && (
          <section className="panel session-details" aria-label="Session details">
            <h2 className="small eyebrow" style={{ marginBottom: 12 }}>
              {kind === 'strength' ? 'Sets & exercises' : 'Optional details'}
            </h2>
            <DetailsFields details={timer.details} onChange={(details) => store.updateTimer({ details })} excludeSessionId={timer.sessionId} />
          </section>
        )}

        <button className="btn ghost small" onClick={() => setConfirmDiscard(true)}>
          <Trash2 size={15} aria-hidden="true" /> Discard session
        </button>
      </main>

      <Dialog
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        title="Discard this session?"
        actions={
          <>
            <button className="btn" onClick={() => setConfirmDiscard(false)}>
              Keep recording
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
        <p className="muted">Nothing will be saved. If you just want to stop early, choose Finish instead — partial sessions still count.</p>
      </Dialog>
    </div>
  );
}

function BreathOrb({ preset, elapsed, running, reduced }: { preset: BreathPreset; elapsed: number; running: boolean; reduced: boolean }) {
  const cycle = preset.phases.reduce((n, p) => n + p.seconds, 0);
  let t = elapsed % cycle;
  let idx = 0;
  while (idx < preset.phases.length - 1 && t >= preset.phases[idx].seconds) {
    t -= preset.phases[idx].seconds;
    idx++;
  }
  const phase = preset.phases[idx];
  const frac = Math.min(1, t / phase.seconds);
  const ease = (x: number) => 0.5 - Math.cos(Math.PI * x) / 2;
  let scale = 0.62;
  if (phase.label === 'Inhale') scale = 0.62 + 0.38 * ease(frac);
  else if (phase.label === 'Exhale') scale = 1 - 0.38 * ease(frac);
  else scale = idx > 0 && preset.phases[idx - 1].label === 'Inhale' ? 1 : 0.62;
  const left = Math.ceil(phase.seconds - t);

  return (
    <div className="breath" aria-live="polite">
      <div className="breath-stage">
        {!reduced && <div className="breath-orb" style={{ transform: `scale(${running ? scale : 0.8})` }} aria-hidden="true" />}
        {reduced && <div className="breath-orb static" aria-hidden="true" />}
        <div className="breath-ring" aria-hidden="true" />
        <div className="breath-label">
          <span className="breath-phase">{running ? phase.label : 'Paused'}</span>
          {running && <span className="num muted">{left}</span>}
        </div>
      </div>
      {reduced && running && (
        <div className="bar thin" style={{ width: 200 }} aria-hidden="true">
          <span style={{ width: `${frac * 100}%`, transition: 'none' }} />
        </div>
      )}
      <p className="tiny muted">{preset.name} · breathe comfortably, never strain</p>
    </div>
  );
}
