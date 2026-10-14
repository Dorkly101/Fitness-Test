import { Frown, Gauge, Smile, TriangleAlert } from 'lucide-react';
import type { EffortFeedback, Modality, StrengthEntry } from '../../domain/types';
import { modalityLabel } from '../../domain/modalities';
import type { UserProfile } from '../../domain/types';

const OPTIONS: { value: EffortFeedback; label: string; icon: typeof Smile }[] = [
  { value: 'easy', label: 'Easy', icon: Smile },
  { value: 'about_right', label: 'About right', icon: Gauge },
  { value: 'too_hard', label: 'Too hard', icon: Frown },
  { value: 'uncomfortable', label: 'Uncomfortable', icon: TriangleAlert },
];

export function FeedbackPicker({ value, onChange }: { value?: EffortFeedback; onChange: (v?: EffortFeedback) => void }) {
  return (
    <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="field-label" style={{ marginBottom: 8 }}>
        How did it feel? (optional)
      </legend>
      <div className="feedback" role="radiogroup" aria-label="How did it feel?">
        {OPTIONS.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className={`feedback-btn fb-${o.value}`} onClick={() => onChange(value === o.value ? undefined : o.value)}>
            <o.icon size={20} aria-hidden="true" />
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function UncomfortableNotice({ modality, profile, entries, flagged, onToggle }: { modality: Modality; profile: UserProfile; entries?: StrengthEntry[]; flagged: string[]; onToggle: (exerciseId: string) => void }) {
  return (
    <div className="notice warn" role="status">
      <TriangleAlert size={18} aria-hidden="true" />
      <div className="stack" style={{ gap: 8 }}>
        <span>
          Thanks for reporting that. It’s fine to stop here — what you did is still saved. {modality === 'strength' && entries?.length ? 'Mark any exercise that felt uncomfortable and it won’t be suggested again until you clear it.' : `${modalityLabel(modality, profile)} won’t be suggested automatically until you clear it in Settings.`}
        </span>
        {modality === 'strength' &&
          entries?.map((e) => (
            <label key={e.id} className="row small" style={{ gap: 8 }}>
              <input type="checkbox" checked={flagged.includes(e.exerciseId)} onChange={() => onToggle(e.exerciseId)} /> {e.exerciseName}
            </label>
          ))}
        <span className="tiny muted">FRONTIER can’t assess why something felt uncomfortable. If discomfort persists or worries you, check in with a qualified professional.</span>
      </div>
    </div>
  );
}

/**
 * "Uncomfortable" pauses suggestions: for strength, the specific exercises the
 * player ticked (or the whole modality if none); otherwise the modality.
 */
export function flagOptions(modality: Modality, feedback: EffortFeedback | undefined, flaggedExercises: string[]) {
  if (feedback !== 'uncomfortable') return {};
  if (modality === 'strength' && flaggedExercises.length) return { flagExerciseIds: flaggedExercises };
  return { flagModality: true };
}
