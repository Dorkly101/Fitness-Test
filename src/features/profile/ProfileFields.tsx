import { ArrowDown, ArrowUp, Star } from 'lucide-react';
import type { Baseline, DurationRange, Modality, Motivation, UserProfile, Weekday } from '../../domain/types';
import { ALL_MODALITIES, MODALITIES, modalityLabel } from '../../domain/modalities';
import { WEEKDAY_SHORT } from '../../domain/time';
import { CAUTION_TAGS, EQUIPMENT } from '../../content/exercises';
import { Chip, ModalityIcon, Option, Segmented, Stepper, Switch } from '../../components/ui';

export type Draft = UserProfile;
type Props = { value: Draft; onChange: (patch: Partial<Draft>) => void };

const MOTIVATIONS: { id: Motivation; label: string }[] = [
  { id: 'consistency', label: 'Consistency' },
  { id: 'strength', label: 'Strength' },
  { id: 'endurance', label: 'Cardio / endurance' },
  { id: 'mindfulness', label: 'Mindfulness' },
  { id: 'variety', label: 'Variety & fun' },
];

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export function CallsignField({ value, onChange }: Props) {
  return (
    <div className="field">
      <label htmlFor="callsign">Callsign (optional)</label>
      <input id="callsign" className="input" maxLength={40} placeholder="e.g. Vega" value={value.callsign ?? ''} onChange={(e) => onChange({ callsign: e.target.value })} autoComplete="nickname" />
      <span className="help">Shown in Mission Control. Leave blank to be called “Operative”.</span>
    </div>
  );
}

export function MotivationsField({ value, onChange }: Props) {
  return (
    <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="field-label" style={{ marginBottom: 8 }}>
        What brings you here? Pick any.
      </legend>
      <div className="chips">
        {MOTIVATIONS.map((m) => (
          <Chip key={m.id} pressed={value.primaryMotivations.includes(m.id)} onClick={() => onChange({ primaryMotivations: toggle(value.primaryMotivations, m.id) })}>
            {m.label}
          </Chip>
        ))}
      </div>
    </fieldset>
  );
}

export function ActivitiesField({ value, onChange }: Props) {
  const setEnabled = (m: Modality) => {
    const enabled = toggle(value.enabledModalities, m);
    onChange({ enabledModalities: enabled, favouriteModalities: value.favouriteModalities.filter((f) => enabled.includes(f)) });
  };
  const toggleFav = (m: Modality) => onChange({ favouriteModalities: toggle(value.favouriteModalities, m) });
  const move = (m: Modality, dir: -1 | 1) => {
    const list = [...value.favouriteModalities];
    const i = list.indexOf(m);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    onChange({ favouriteModalities: list });
  };
  return (
    <div className="stack-lg">
      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="field-label" style={{ marginBottom: 8 }}>
          Which activities can you do? Missions only use what you enable.
        </legend>
        <div className="option-grid">
          {ALL_MODALITIES.map((m) => (
            <Option key={m} pressed={value.enabledModalities.includes(m)} onClick={() => setEnabled(m)}>
              <ModalityIcon modality={m} boxed />
              <span>
                <span style={{ display: 'block', fontWeight: 500 }}>{modalityLabel(m, value)}</span>
                <span className="tiny muted">{MODALITIES[m].callName}</span>
              </span>
            </Option>
          ))}
        </div>
      </fieldset>
      {value.enabledModalities.includes('other') && (
        <div className="field" style={{ maxWidth: 360 }}>
          <label htmlFor="other-label">Name your custom activity</label>
          <input id="other-label" className="input" maxLength={40} placeholder="e.g. Rowing, Dance, Swimming" value={value.modalityLabels.other ?? ''} onChange={(e) => onChange({ modalityLabels: { ...value.modalityLabels, other: e.target.value } })} />
        </div>
      )}
      {value.enabledModalities.length > 0 && (
        <div className="field">
          <span className="field-label">Favourites — starred activities are suggested more often. Use the arrows to rank them.</span>
          <ul className="list fav-list">
            {[...value.favouriteModalities, ...value.enabledModalities.filter((m) => !value.favouriteModalities.includes(m))].map((m) => {
              const fav = value.favouriteModalities.indexOf(m);
              return (
                <li key={m} className="list-item">
                  <ModalityIcon modality={m} boxed />
                  <span style={{ flex: 1 }}>
                    {fav >= 0 && <span className="num muted small">#{fav + 1} </span>}
                    {modalityLabel(m, value)}
                  </span>
                  {fav >= 0 && (
                    <>
                      <button type="button" className="btn ghost icon small" aria-label={`Move ${modalityLabel(m, value)} up`} onClick={() => move(m, -1)} disabled={fav === 0}>
                        <ArrowUp size={16} />
                      </button>
                      <button type="button" className="btn ghost icon small" aria-label={`Move ${modalityLabel(m, value)} down`} onClick={() => move(m, 1)} disabled={fav === value.favouriteModalities.length - 1}>
                        <ArrowDown size={16} />
                      </button>
                    </>
                  )}
                  <button type="button" className="btn ghost small" aria-pressed={fav >= 0} onClick={() => toggleFav(m)}>
                    <Star size={16} fill={fav >= 0 ? 'var(--ion-lime)' : 'none'} color={fav >= 0 ? 'var(--ion-lime)' : 'currentColor'} aria-hidden="true" />
                    {fav >= 0 ? 'Favourite' : 'Add favourite'}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export function EquipmentField({ value, onChange }: Props) {
  return (
    <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="field-label" style={{ marginBottom: 8 }}>
        Equipment you have access to (used to filter strength exercises)
      </legend>
      <div className="chips">
        {EQUIPMENT.map((e) => (
          <Chip key={e.id} pressed={value.availableEquipment.includes(e.id)} onClick={() => onChange({ availableEquipment: toggle(value.availableEquipment, e.id) })}>
            {e.label}
          </Chip>
        ))}
      </div>
    </fieldset>
  );
}

const RANGES: { value: DurationRange; label: string }[] = [
  { value: '5-15', label: '5–15 min' },
  { value: '15-30', label: '15–30 min' },
  { value: '30-45', label: '30–45 min' },
  { value: '45-60', label: '45–60 min' },
];

const BASELINES: { value: Baseline; label: string; hint: string }[] = [
  { value: 'new', label: 'Just starting', hint: 'Shortest suggestions; build gradually.' },
  { value: 'returning', label: 'Getting back into it', hint: 'Modest suggestions within your range.' },
  { value: 'regular', label: 'Fairly regular', hint: 'Suggestions in the middle of your range.' },
];

export function ScheduleField({ value, onChange }: Props) {
  return (
    <div className="stack-lg">
      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="field-label" style={{ marginBottom: 8 }}>
          Days that usually work. Other days are treated as planned rest days.
        </legend>
        <div className="chips">
          {WEEKDAY_SHORT.map((d, i) => (
            <Chip key={d} pressed={value.weeklyAvailability.includes(i as Weekday)} onClick={() => onChange({ weeklyAvailability: toggle(value.weeklyAvailability, i as Weekday).sort() })}>
              {d}
            </Chip>
          ))}
        </div>
        {value.weeklyAvailability.length === 0 && <span className="help">No days selected: every day is available.</span>}
      </fieldset>
      <div className="field">
        <span className="field-label">Comfortable session length</span>
        <Segmented label="Comfortable session length" value={value.preferredDurationRange} options={RANGES} onChange={(v) => onChange({ preferredDurationRange: v })} />
      </div>
      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="field-label" style={{ marginBottom: 8 }}>
          Starting point — your call, not a test
        </legend>
        <div className="option-grid">
          {BASELINES.map((b) => (
            <Option key={b.value} role="radio" pressed={value.startingBaseline === b.value} onClick={() => onChange({ startingBaseline: b.value })}>
              <span>
                <span style={{ display: 'block', fontWeight: 500 }}>{b.label}</span>
                <span className="tiny muted">{b.hint}</span>
              </span>
            </Option>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

export function TargetsField({ value, onChange }: Props) {
  const t = value.weeklyTargets;
  const set = (patch: Partial<typeof t>) => onChange({ weeklyTargets: { ...t, ...patch } });
  const hasEndurance = value.enabledModalities.some((m) => MODALITIES[m].domain === 'endurance');
  const hasFocus = value.enabledModalities.some((m) => MODALITIES[m].domain === 'focus');
  return (
    <div className="stack-lg">
      <div className="target-row">
        <div>
          <div style={{ fontWeight: 600 }}>Field Presence</div>
          <div className="help">Sessions per week — your weekly contract. Any activity counts.</div>
        </div>
        <Stepper label="Sessions per week" value={t.sessions} min={1} max={14} onChange={(v) => set({ sessions: v })} />
      </div>
      {hasEndurance && (
        <div className="target-row">
          <div>
            <div style={{ fontWeight: 600 }}>Movement minutes</div>
            <div className="help">Optional. Walking, cycling, elliptical, VR and similar. 0 = no target.</div>
          </div>
          <Stepper label="Movement minutes per week" value={t.movementMinutes} min={0} max={600} step={15} suffix="min" onChange={(v) => set({ movementMinutes: v })} />
        </div>
      )}
      {value.enabledModalities.includes('strength') && (
        <div className="target-row">
          <div>
            <div style={{ fontWeight: 600 }}>Strength sessions</div>
            <div className="help">Optional. 0 = no target.</div>
          </div>
          <Stepper label="Strength sessions per week" value={t.strengthSessions} min={0} max={7} onChange={(v) => set({ strengthSessions: v })} />
        </div>
      )}
      {hasFocus && (
        <div className="target-row">
          <div>
            <div style={{ fontWeight: 600 }}>Focus practice</div>
            <div className="help">Optional. Meditation or breathwork sessions. 0 = no target.</div>
          </div>
          <Stepper label="Focus sessions per week" value={t.mindfulnessSessions} min={0} max={14} onChange={(v) => set({ mindfulnessSessions: v })} />
        </div>
      )}
      <details className="disclosure">
        <summary>Optional reference: public-health guidance</summary>
        <p className="small muted">
          The WHO suggests adults aim for 150–300 minutes of moderate aerobic activity a week plus muscle-strengthening on two or more days. That’s a long-term reference, not a starting requirement — pick targets that fit your life now and adjust any time.
        </p>
      </details>
    </div>
  );
}

export function RestrictionsField({ value, onChange }: Props) {
  return (
    <div className="stack-lg">
      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="field-label" style={{ marginBottom: 8 }}>
          Movements to avoid. Missions and exercise suggestions will never include these.
        </legend>
        <div className="chips">
          {CAUTION_TAGS.map((c) => (
            <Chip key={c.id} pressed={value.excludedMovements.includes(c.id)} onClick={() => onChange({ excludedMovements: toggle(value.excludedMovements, c.id) })}>
              <span>
                {c.label}
                <span className="tiny muted"> · {c.hint}</span>
              </span>
            </Chip>
          ))}
        </div>
        <span className="help">Overhead pressing and bar-on-back movements are already off by default in the exercise library; you can enable them yourself.</span>
      </fieldset>
      <div className="field">
        <label htmlFor="safety-notes">Other notes for yourself (optional)</label>
        <textarea id="safety-notes" className="textarea" maxLength={1000} placeholder="e.g. Keep cardio conversational. No floor work on bad-knee days." value={value.safetyNotes ?? ''} onChange={(e) => onChange({ safetyNotes: e.target.value })} />
        <span className="help">Stored on this device only and shown back to you before sessions. FRONTIER doesn’t interpret or diagnose anything.</span>
      </div>
    </div>
  );
}

export function DisplayField({ value, onChange }: Props) {
  const s = value.settings;
  const set = (patch: Partial<typeof s>) => onChange({ settings: { ...s, ...patch } });
  return (
    <div className="stack-lg">
      <div className="field">
        <span className="field-label">Animation</span>
        <Segmented
          label="Animation"
          value={s.motion}
          options={[
            { value: 'system', label: 'Match device' },
            { value: 'reduced', label: 'Reduced' },
            { value: 'full', label: 'Full' },
          ]}
          onChange={(v) => set({ motion: v })}
        />
        <span className="help">Reduced motion replaces animations with static equivalents. Nothing important depends on animation.</span>
      </div>
      <div className="field">
        <span className="field-label">Text size</span>
        <Segmented
          label="Text size"
          value={s.fontScale}
          options={[
            { value: 1, label: 'Default' },
            { value: 1.125, label: 'Large' },
            { value: 1.25, label: 'Larger' },
          ]}
          onChange={(v) => set({ fontScale: v })}
        />
      </div>
      <Switch label="Higher contrast" hint="Brighter secondary text and borders." checked={s.highContrast} onChange={(v) => set({ highContrast: v })} />
      <Switch label="Sound cues" hint="Soft tones at the end of timers. Off by default." checked={s.sound} onChange={(v) => set({ sound: v })} />
      <div className="field">
        <span className="field-label">Load units</span>
        <Segmented
          label="Load units"
          value={s.units}
          options={[
            { value: 'kg', label: 'kg' },
            { value: 'lb', label: 'lb' },
          ]}
          onChange={(v) => set({ units: v })}
        />
      </div>
    </div>
  );
}
