import { CheckCircle2, Clock, Play, Shuffle, Zap } from 'lucide-react';
import type { QuestProgress } from '../../domain/types';
import { objectiveLabel } from '../../domain/quests';
import { ModalityIcon, ProgressBar, domainClass } from '../../components/ui';
import { navigate } from '../../state/router';
import { useStore } from '../../state/store';
import { modalityLabel } from '../../domain/modalities';

const SLOT_LABEL = { recommended: 'Recommended', quick: 'Quick win', fun: 'Something fun' } as const;
const CATEGORY_LABEL = { quick: 'Quick Ops', daily: 'Daily Mission', weekly: 'Weekly Directive', expedition: 'Expedition Objective', comeback: 'Comeback' } as const;

export function launchMission(q: QuestProgress['instance']) {
  if (!q.suggestedModality) {
    navigate('start');
    return;
  }
  navigate(`start/${q.suggestedModality}/${encodeURIComponent(q.instanceId)}`);
}

export function MissionCard({ qp, featured, onSwap }: { qp: QuestProgress; featured?: boolean; onSwap?: () => void }) {
  const { data } = useStore();
  const q = qp.instance;
  const label = q.slot ? SLOT_LABEL[q.slot] : CATEGORY_LABEL[q.category];
  const m = q.suggestedModality;
  const canStart = !qp.complete && (q.category === 'daily' || q.category === 'quick' || q.category === 'comeback');
  const objective = q.objective.type === 'single_session' && m ? `${q.objective.minutes} min of ${modalityLabel(m, data.profile).toLowerCase()}` : objectiveLabel(q.objective);

  return (
    <article className={`mission ${featured ? 'featured' : ''} ${qp.complete ? 'complete' : ''} ${domainClass(q.domain)}`} aria-label={`${label}: ${q.title}`}>
      <div className="mission-top">
        <span className={`badge ${q.slot === 'recommended' ? 'lime' : q.category === 'comeback' ? 'cyan' : ''}`}>{label}</span>
        {qp.complete ? (
          <span className="badge lime">
            <CheckCircle2 size={12} aria-hidden="true" /> Complete
          </span>
        ) : (
          <span className="badge" title="Reward preview">
            <Zap size={12} aria-hidden="true" /> +{q.rewardXP} XP
          </span>
        )}
      </div>
      <div className="mission-title-row">
        {m ? <ModalityIcon modality={m} boxed large={featured} /> : <span className={`domain-dot ${featured ? 'lg' : ''}`} aria-hidden="true"><Zap size={16} /></span>}
        <div style={{ minWidth: 0 }}>
          <h3 className="mission-title">{q.title}</h3>
          <p className="mission-objective">{objective}</p>
        </div>
      </div>
      <p className="mission-flavour">{q.flavour}</p>
      {q.reason && !qp.complete && <p className="mission-reason">{q.reason}</p>}
      <div className="mission-progress">
        <ProgressBar value={qp.current} max={qp.target} label={`${q.title} progress`} lime={qp.complete} thin />
        <span className="tiny muted num">
          {qp.current}/{qp.target}
        </span>
      </div>
      <div className="mission-actions">
        {canStart && (
          <button className={`btn ${featured ? 'primary' : ''}`} onClick={() => launchMission(q)}>
            <Play size={16} aria-hidden="true" /> Start
            {q.suggestedMinutes && q.objective.type === 'single_session' ? (
              <span className="muted-on-btn">
                <Clock size={13} aria-hidden="true" /> {q.suggestedMinutes} min
              </span>
            ) : null}
          </button>
        )}
        {onSwap && !qp.complete && qp.current === 0 && (
          <button className="btn ghost small" onClick={onSwap} aria-label={`Swap ${label.toLowerCase()} mission for another option`}>
            <Shuffle size={15} aria-hidden="true" /> Swap
          </button>
        )}
      </div>
    </article>
  );
}
