import type { SessionDetails } from '../../domain/types';
import { BREATH_PRESETS, MEDITATION_TYPES } from '../../content/presets';
import { StrengthEditor } from './StrengthEditor';

/** Modality-specific optional metrics. Unknown values stay blank — never zero, never invented. */
export function DetailsFields({ details, onChange, excludeSessionId }: { details: SessionDetails; onChange: (d: SessionDetails) => void; excludeSessionId?: string }) {
  const num = (v: string): number | undefined => {
    if (v.trim() === '') return undefined;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };
  switch (details.kind) {
    case 'strength':
      return <StrengthEditor entries={details.entries} onChange={(entries) => onChange({ ...details, entries })} excludeSessionId={excludeSessionId} />;
    case 'cardio':
      return (
        <div className="grid grid-3">
          <div className="field">
            <label htmlFor="d-dist">Distance (km)</label>
            <input id="d-dist" className="input" inputMode="decimal" placeholder="Optional" value={details.distanceKm ?? ''} onChange={(e) => onChange({ ...details, distanceKm: num(e.target.value) })} />
          </div>
          <div className="field">
            <label htmlFor="d-steps">Steps</label>
            <input id="d-steps" className="input" inputMode="numeric" placeholder="Optional" value={details.steps ?? ''} onChange={(e) => onChange({ ...details, steps: num(e.target.value) })} />
          </div>
          <div className="field">
            <label htmlFor="d-res">Incline / resistance</label>
            <input id="d-res" className="input" placeholder="Optional, e.g. 4%" value={details.resistance ?? ''} maxLength={40} onChange={(e) => onChange({ ...details, resistance: e.target.value || undefined })} />
          </div>
        </div>
      );
    case 'vr':
      return (
        <div className="grid grid-2">
          <div className="field">
            <label htmlFor="d-game">Game or activity</label>
            <input id="d-game" className="input" placeholder="Optional" maxLength={60} value={details.gameName ?? ''} onChange={(e) => onChange({ ...details, gameName: e.target.value || undefined })} />
          </div>
          <div className="field">
            <label htmlFor="d-eff">Effort (1–10)</label>
            <input id="d-eff" className="input" inputMode="numeric" placeholder="Optional" value={details.effort ?? ''} onChange={(e) => onChange({ ...details, effort: (() => { const n = num(e.target.value); return n == null ? undefined : Math.min(10, Math.max(1, Math.round(n))); })() })} />
          </div>
        </div>
      );
    case 'meditation':
      return (
        <div className="field" style={{ maxWidth: 320 }}>
          <label htmlFor="d-medtype">Session type</label>
          <select id="d-medtype" className="select" value={details.sessionType ?? ''} onChange={(e) => onChange({ ...details, sessionType: e.target.value || undefined })}>
            <option value="">Not specified</option>
            {MEDITATION_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
      );
    case 'breathwork':
      return (
        <div className="field" style={{ maxWidth: 320 }}>
          <label htmlFor="d-preset">Pattern</label>
          <select
            id="d-preset"
            className="select"
            value={details.presetId}
            onChange={(e) => {
              const p = BREATH_PRESETS.find((x) => x.id === e.target.value)!;
              onChange({ kind: 'breathwork', presetId: p.id, presetName: p.name });
            }}
          >
            {BREATH_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      );
    case 'mobility':
    case 'other':
      return (
        <div className="field" style={{ maxWidth: 420 }}>
          <label htmlFor="d-label">Label</label>
          <input id="d-label" className="input" placeholder={details.kind === 'mobility' ? 'Optional, e.g. Hips & ankles' : 'Optional, e.g. Rowing'} maxLength={60} value={details.label ?? ''} onChange={(e) => onChange({ ...details, label: e.target.value || undefined })} />
        </div>
      );
  }
}
