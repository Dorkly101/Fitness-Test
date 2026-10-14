import { useEffect, useMemo, useRef, useState } from 'react';
import { Award, CheckCircle2, History, Map, Rocket, ScrollText, Sparkles } from 'lucide-react';
import { useStore } from '../../state/store';
import { href, navigate } from '../../state/router';
import { rewardsForSession } from '../../domain/progression';
import { formatMinutes } from '../../domain/time';
import { modalityLabel } from '../../domain/modalities';
import { ModalityIcon, ProgressBar } from '../../components/ui';
import { LevelEmblem, NodeGlyph, SignalRings } from '../../components/art/Glyphs';
import { ARCHIVE_BY_ID } from '../../content/rewards';
import { chime } from '../../components/sound';

function useCountUp(target: number, enabled: boolean) {
  const [v, setV] = useState(enabled ? 0 : target);
  useEffect(() => {
    if (!enabled) {
      setV(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const dur = 900;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, enabled]);
  return v;
}

export function Completion({ sessionId }: { sessionId?: string }) {
  const { data, progress, markSeen } = useStore();
  const profile = data.profile!;
  const session = data.sessions.find((s) => s.id === sessionId);
  const r = useMemo(() => (session ? rewardsForSession(progress, session.id) : undefined), [progress, session]);
  const reduced = profile.settings.motion === 'reduced' || (profile.settings.motion === 'system' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const xp = useCountUp(r?.xp?.total ?? 0, !reduced);
  const keys = useMemo(
    () => (r ? [...r.nodes.map((n) => `node:${n.node.id}`), ...r.achievements.map((a) => `achievement:${a.def.id}`), ...(r.xp && r.xp.levelAfter > r.xp.levelBefore ? [`level:${r.xp.levelAfter}`] : [])] : []),
    [r],
  );
  // Celebrate only the first time this screen is seen for these rewards.
  const firstView = useRef(keys.some((k) => !data.seenRewards.includes(k)));
  useEffect(() => {
    if (keys.length) markSeen(keys);
    if (firstView.current && keys.length) chime(profile.settings.sound, 'reward');
  }, [keys, markSeen, profile.settings.sound]);

  if (!session || !r) {
    return (
      <div className="page narrow">
        <div className="panel">
          <h1>Session not found</h1>
          <p className="muted" style={{ margin: '8px 0 16px' }}>It may have been deleted.</p>
          <a className="btn" href={href('log')}>
            Open activity log
          </a>
        </div>
      </div>
    );
  }

  const levelUp = r.xp && r.xp.levelAfter > r.xp.levelBefore;
  const milestone = levelUp || r.nodes.length > 0;
  const items = r.nodes.flatMap((n) => n.node.rewardIds).map((id) => ARCHIVE_BY_ID[id]);

  return (
    <div className="page narrow">
      <section className={`complete-hero panel marked ${milestone ? 'milestone' : ''} ${firstView.current ? 'celebrate' : ''}`} aria-labelledby="done-title">
        <div className="complete-rings" aria-hidden="true">
          <SignalRings tone={milestone ? 'var(--reactor-orange)' : 'var(--ion-lime)'} />
        </div>
        <div className="complete-body">
          <div className="row" style={{ gap: 10 }}>
            <ModalityIcon modality={session.modality} boxed />
            <span className="eyebrow">
              {modalityLabel(session.modality, profile)} · {formatMinutes(session.activeDurationSeconds)}
            </span>
          </div>
          <h1 id="done-title" style={{ marginTop: 12 }}>
            {r.nodes.length ? 'Waypoint discovered.' : levelUp ? `Level ${r.xp!.levelAfter} reached.` : 'Field log updated.'}
          </h1>
          {r.xp ? (
            <div className="xp-total" aria-label={`${r.xp.total} XP earned`}>
              <span className="num xp-num">+{xp}</span>
              <span className="xp-unit">XP</span>
            </div>
          ) : (
            <p className="muted" style={{ marginTop: 12 }}>
              {session.activeDurationSeconds < 60 ? 'Saved to your log. Sessions under a minute don’t earn XP, but they still count as showing up.' : 'Saved to your log.'}
            </p>
          )}
          {r.xp && (
            <dl className="xp-breakdown">
              <div>
                <dt>Session</dt>
                <dd className="num">+{r.xp.baseXP}</dd>
              </div>
              <div>
                <dt>Duration</dt>
                <dd className="num">+{r.xp.durationXP}</dd>
              </div>
              <div>
                <dt>Mission bonus</dt>
                <dd className="num">+{r.xp.questXP}</dd>
              </div>
            </dl>
          )}
          {r.xp?.diminished && <p className="tiny muted">Several sessions logged today — base XP is reduced after the third. Everything is still recorded.</p>}
        </div>
      </section>

      {levelUp && (
        <section className="panel level-moment" aria-label="Level up">
          <LevelEmblem level={r.xp!.levelAfter} size={64} />
          <div>
            <div className="eyebrow">Level up</div>
            <h2>Level {r.xp!.levelAfter}</h2>
            <p className="small muted">Levels reward showing up. They aren’t a measure of fitness.</p>
          </div>
        </section>
      )}

      {r.nodes.map((n) => (
        <section key={n.node.id} className={`panel discovery kind-${n.node.kind}`} aria-label={`Discovered ${n.node.title}`}>
          <div className="discovery-glyph">
            <NodeGlyph kind={n.node.kind} status="discovered" size={64} />
          </div>
          <div className="stack" style={{ gap: 6 }}>
            <span className="eyebrow">Waypoint discovered</span>
            <h2>{n.node.title}</h2>
            <blockquote className="story">
              <ScrollText size={16} aria-hidden="true" />
              <p>{n.node.story}</p>
            </blockquote>
            <a className="btn small" href={href(`expedition/${n.node.id}`)} style={{ justifySelf: 'start' }}>
              <Map size={15} aria-hidden="true" /> View on map
            </a>
          </div>
        </section>
      ))}

      {(r.quests.length > 0 || r.achievements.length > 0 || items.length > 0) && (
        <section className="panel" aria-label="Unlocked">
          <ul className="list">
            {r.quests.map((q) => (
              <li key={q.instance.instanceId} className="list-item">
                <CheckCircle2 size={18} color="var(--ion-lime)" aria-hidden="true" />
                <span style={{ flex: 1 }}>
                  Mission complete: <strong>{q.instance.title}</strong>
                </span>
                <span className="badge lime">+{q.instance.rewardXP} XP</span>
              </li>
            ))}
            {r.achievements.map((a) => (
              <li key={a.def.id} className="list-item">
                <Award size={18} color="var(--reactor-orange)" aria-hidden="true" />
                <span style={{ flex: 1 }}>
                  Achievement: <strong>{a.def.name}</strong> <span className="muted small">— {a.def.description}</span>
                </span>
              </li>
            ))}
            {items.map((i) => (
              <li key={i.id} className="list-item">
                <Sparkles size={18} color="var(--anomaly-violet)" aria-hidden="true" />
                <span style={{ flex: 1 }}>
                  Archive: <strong>{i.name}</strong> <span className="muted small">— {i.description}</span>
                </span>
              </li>
            ))}
          </ul>
          {r.xp && r.xp.questXP === 10 && r.quests.reduce((n, q) => n + q.instance.rewardXP, 0) > 10 && <p className="tiny muted" style={{ marginTop: 8 }}>Mission bonus is capped at +10 XP per session.</p>}
        </section>
      )}

      <section className="panel tight">
        <div className="row between small">
          <span>Level {progress.level.level}</span>
          <span className="muted num">
            {progress.level.intoLevel} / {progress.level.span} XP
          </span>
        </div>
        <ProgressBar value={progress.level.intoLevel} max={progress.level.span} label="Progress to next level" lime />
      </section>

      <div className="row">
        <button className="btn primary" onClick={() => navigate('home')}>
          <Rocket size={16} aria-hidden="true" /> Mission Control
        </button>
        <a className="btn" href={href('expedition')}>
          <Map size={16} aria-hidden="true" /> Expedition map
        </a>
        <a className="btn ghost" href={href(`log/${session.id}`)}>
          <History size={16} aria-hidden="true" /> View or edit entry
        </a>
      </div>
    </div>
  );
}
