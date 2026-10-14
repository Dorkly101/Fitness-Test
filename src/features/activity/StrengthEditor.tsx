import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react';
import type { ActivitySession, StrengthEntry, StrengthExercise, StrengthSet } from '../../domain/types';
import { useStore } from '../../state/store';
import { uid } from '../../state/uid';
import { CAUTION_TAGS, EQUIPMENT } from '../../content/exercises';
import { Dialog } from '../../components/ui';
import { compareSessions } from '../../domain/sessions';

export function suitableExercise(e: StrengthExercise, excluded: string[], flagged: string[]): boolean {
  return e.isEnabled && !e.cautionTags.some((t) => excluded.includes(t)) && !flagged.includes(e.id);
}

export function hasEquipment(e: StrengthExercise, available: string[]): boolean {
  return e.equipment.length === 0 || e.equipment.some((x) => available.includes(x));
}

/** Most recent logged sets for an exercise, excluding the session being edited. */
export function lastSetsFor(exerciseId: string, sessions: ActivitySession[], excludeSessionId?: string): { date: string; sets: StrengthSet[] } | undefined {
  const sorted = sessions.filter((s) => s.status === 'completed' && s.id !== excludeSessionId && s.details.kind === 'strength').sort(compareSessions);
  for (let i = sorted.length - 1; i >= 0; i--) {
    const d = sorted[i].details;
    if (d.kind !== 'strength') continue;
    const e = d.entries.find((x) => x.exerciseId === exerciseId && x.sets.length);
    if (e) return { date: sorted[i].startAt, sets: e.sets };
  }
  return undefined;
}

export function formatSets(sets: StrengthSet[], units: string): string {
  return sets.map((s) => `${s.reps ?? '–'}${s.load != null ? ` × ${s.load} ${units}` : ''}`).join(', ');
}

export function StrengthEditor({ entries, onChange, excludeSessionId }: { entries: StrengthEntry[]; onChange: (e: StrengthEntry[]) => void; excludeSessionId?: string }) {
  const { data, exercises } = useStore();
  const profile = data.profile!;
  const units = profile.settings.units;
  const [picking, setPicking] = useState(false);

  const update = (id: string, fn: (e: StrengthEntry) => StrengthEntry) => onChange(entries.map((e) => (e.id === id ? fn(e) : e)));
  const reindex = (sets: StrengthSet[]) => sets.map((s, i) => ({ ...s, setIndex: i }));
  const addSet = (entry: StrengthEntry) =>
    update(entry.id, (e) => {
      const prev = e.sets[e.sets.length - 1];
      return { ...e, sets: reindex([...e.sets, { id: uid('set'), exerciseId: e.exerciseId, setIndex: e.sets.length, reps: prev?.reps, load: prev?.load }]) };
    });
  const setField = (entry: StrengthEntry, setId: string, patch: Partial<StrengthSet>) => update(entry.id, (e) => ({ ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }));
  const removeSet = (entry: StrengthEntry, setId: string) => update(entry.id, (e) => ({ ...e, sets: reindex(e.sets.filter((s) => s.id !== setId)) }));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= entries.length) return;
    const next = [...entries];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const addExercise = (ex: StrengthExercise) => {
    const last = lastSetsFor(ex.id, data.sessions, excludeSessionId);
    const firstSet: StrengthSet = { id: uid('set'), exerciseId: ex.id, setIndex: 0, reps: last?.sets[0]?.reps, load: last?.sets[0]?.load };
    onChange([...entries, { id: uid('ent'), exerciseId: ex.id, exerciseName: ex.name, sets: [firstSet] }]);
    setPicking(false);
  };
  const num = (v: string): number | undefined => {
    if (v.trim() === '') return undefined;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };

  return (
    <div className="strength">
      {entries.length === 0 && <p className="muted small">No exercises yet. Add one, or just save the session — sets are optional.</p>}
      {entries.map((entry, i) => {
        const last = lastSetsFor(entry.exerciseId, data.sessions, excludeSessionId);
        return (
          <div key={entry.id} className="ex-card">
            <div className="ex-head">
              <div style={{ minWidth: 0 }}>
                <h3 className="ex-name">{entry.exerciseName}</h3>
                {last ? (
                  <p className="tiny muted">
                    Last time ({new Date(last.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}): {formatSets(last.sets, units)}
                  </p>
                ) : (
                  <p className="tiny muted">First time logging this exercise.</p>
                )}
              </div>
              <div className="row" style={{ gap: 2 }}>
                <button type="button" className="btn ghost icon small" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${entry.exerciseName} up`}>
                  <ArrowUp size={16} />
                </button>
                <button type="button" className="btn ghost icon small" onClick={() => move(i, 1)} disabled={i === entries.length - 1} aria-label={`Move ${entry.exerciseName} down`}>
                  <ArrowDown size={16} />
                </button>
                <button type="button" className="btn ghost icon small" onClick={() => onChange(entries.filter((e) => e.id !== entry.id))} aria-label={`Remove ${entry.exerciseName}`}>
                  <X size={16} />
                </button>
              </div>
            </div>
            <table className="sets">
              <thead>
                <tr>
                  <th scope="col">Set</th>
                  <th scope="col">Reps</th>
                  <th scope="col">Load ({units})</th>
                  <th scope="col">
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {entry.sets.map((s, si) => (
                  <tr key={s.id}>
                    <td className="num muted">{si + 1}</td>
                    <td>
                      <input className="input set-input" inputMode="numeric" aria-label={`${entry.exerciseName} set ${si + 1} reps`} value={s.reps ?? ''} onChange={(e) => setField(entry, s.id, { reps: num(e.target.value) })} placeholder="–" />
                    </td>
                    <td>
                      <input className="input set-input" inputMode="decimal" aria-label={`${entry.exerciseName} set ${si + 1} load in ${units}`} value={s.load ?? ''} onChange={(e) => setField(entry, s.id, { load: num(e.target.value) })} placeholder="–" />
                    </td>
                    <td>
                      <button type="button" className="btn ghost icon small" onClick={() => removeSet(entry, s.id)} aria-label={`Delete set ${si + 1} of ${entry.exerciseName}`}>
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="btn small" onClick={() => addSet(entry)}>
              <Plus size={15} aria-hidden="true" /> Add set
            </button>
          </div>
        );
      })}
      <button type="button" className="btn" onClick={() => setPicking(true)}>
        <Plus size={16} aria-hidden="true" /> Add exercise
      </button>
      <ExercisePicker open={picking} onClose={() => setPicking(false)} onPick={addExercise} exercises={exercises} />
    </div>
  );
}

export function ExercisePicker({ open, onClose, onPick, exercises }: { open: boolean; onClose: () => void; onPick: (e: StrengthExercise) => void; exercises: StrengthExercise[] }) {
  const { data, addExercise } = useStore();
  const profile = data.profile!;
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [custom, setCustom] = useState('');
  const [category, setCategory] = useState<StrengthExercise['category']>('full');
  const list = useMemo(() => {
    const ok = exercises.filter((e) => suitableExercise(e, profile.excludedMovements, profile.flaggedExercises));
    const filtered = showAll ? ok : ok.filter((e) => hasEquipment(e, profile.availableEquipment));
    return filtered.filter((e) => e.name.toLowerCase().includes(query.toLowerCase()));
  }, [exercises, profile, showAll, query]);
  const hiddenByRestriction = exercises.filter((e) => !suitableExercise(e, profile.excludedMovements, profile.flaggedExercises)).length;

  return (
    <Dialog open={open} onClose={onClose} title="Add exercise">
      <div className="stack">
        <input className="input" placeholder="Search exercises" aria-label="Search exercises" value={query} onChange={(e) => setQuery(e.target.value)} />
        <ul className="list picker-list">
          {list.map((e) => (
            <li key={e.id}>
              <button type="button" className="picker-item" onClick={() => onPick(e)}>
                <span>
                  {e.name}
                  {e.isCustom && <span className="badge" style={{ marginLeft: 8 }}>Custom</span>}
                </span>
                <span className="tiny muted">{e.equipment.length ? e.equipment.map((x) => EQUIPMENT.find((q) => q.id === x)?.label ?? x).join(' / ') : 'Bodyweight'}</span>
              </button>
            </li>
          ))}
          {list.length === 0 && <li className="muted small" style={{ padding: 12 }}>No matching exercises.</li>}
        </ul>
        <label className="row small" style={{ gap: 8 }}>
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Include exercises that need equipment you haven’t listed
        </label>
        {hiddenByRestriction > 0 && (
          <p className="tiny muted">
            {hiddenByRestriction} exercise{hiddenByRestriction === 1 ? ' is' : 's are'} hidden by your movement restrictions or disabled in the library ({CAUTION_TAGS.filter((c) => profile.excludedMovements.includes(c.id)).map((c) => c.label).join(', ') || 'library settings'}). Manage in Settings.
          </p>
        )}
        <hr className="divider" />
        <form
          className="stack"
          onSubmit={(ev) => {
            ev.preventDefault();
            if (!custom.trim()) return;
            const ex = addExercise({ name: custom.trim().slice(0, 60), equipment: [], category, isEnabled: true, cautionTags: [] });
            setCustom('');
            onPick(ex);
          }}
        >
          <label className="field-label" htmlFor="custom-ex">
            Or create a custom exercise
          </label>
          <div className="row">
            <input id="custom-ex" className="input" style={{ flex: 1, minWidth: 180 }} placeholder="e.g. Cable row" value={custom} onChange={(e) => setCustom(e.target.value)} />
            <select className="select" style={{ width: 'auto' }} aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value as StrengthExercise['category'])}>
              <option value="full">Full body</option>
              <option value="push">Push</option>
              <option value="pull">Pull</option>
              <option value="legs">Legs</option>
              <option value="core">Core</option>
              <option value="carry">Carry</option>
            </select>
            <button className="btn" type="submit" disabled={!custom.trim()}>
              Create & add
            </button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
