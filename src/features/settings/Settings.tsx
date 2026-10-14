import { useRef, useState } from 'react';
import { Download, FileJson, Info, RotateCcw, ShieldCheck, Trash2, TriangleAlert, Upload } from 'lucide-react';
import type { AppData, UserProfile } from '../../domain/types';
import { useStore } from '../../state/store';
import { navigate } from '../../state/router';
import { Dialog, ModalityIcon, PageHead, Switch } from '../../components/ui';
import { modalityLabel } from '../../domain/modalities';
import { parseAppData, toExportFile, ValidationError } from '../../storage/schema';
import { dayKey } from '../../domain/time';
import { useToast } from '../../components/toast';
import { CAUTION_TAGS } from '../../content/exercises';
import { ActivitiesField, CallsignField, DisplayField, EquipmentField, MotivationsField, RestrictionsField, ScheduleField, TargetsField } from '../profile/ProfileFields';

const SECTIONS = [
  { id: 'profile', label: 'Profile' },
  { id: 'activities', label: 'Activities & equipment' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'targets', label: 'Weekly targets' },
  { id: 'safety', label: 'Safety & restrictions' },
  { id: 'library', label: 'Exercise library' },
  { id: 'display', label: 'Display & sound' },
  { id: 'data', label: 'Your data' },
  { id: 'about', label: 'About' },
];

export function Settings() {
  const store = useStore();
  const toast = useToast();
  const profile = store.data.profile!;
  const onChange = (patch: Partial<UserProfile>) => {
    if (patch.enabledModalities && patch.enabledModalities.length === 0) {
      toast('Keep at least one activity enabled.', 'info');
      return;
    }
    store.updateProfile(patch);
  };

  return (
    <div className="page">
      <PageHead eyebrow="Configuration" title="Settings">
        Changes save automatically and apply to future missions. Today’s missions refresh if you haven’t started them.
      </PageHead>
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#/settings`} onClick={(e) => { e.preventDefault(); document.getElementById(`set-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
              {s.label}
            </a>
          ))}
        </nav>
        <div className="stack-lg">
          <Section id="profile" title="Profile">
            <CallsignField value={profile} onChange={onChange} />
            <MotivationsField value={profile} onChange={onChange} />
          </Section>
          <Section id="activities" title="Activities & equipment">
            <ActivitiesField value={profile} onChange={onChange} />
            <div className="field" style={{ maxWidth: 520 }}>
              <span className="field-label">Rename activities</span>
              <div className="stack">
                {profile.enabledModalities.map((m) => (
                  <div key={m} className="row" style={{ flexWrap: 'nowrap' }}>
                    <ModalityIcon modality={m} boxed />
                    <input className="input" aria-label={`Display name for ${modalityLabel(m)}`} placeholder={modalityLabel(m)} maxLength={40} value={profile.modalityLabels[m] ?? ''} onChange={(e) => onChange({ modalityLabels: { ...profile.modalityLabels, [m]: e.target.value } })} />
                  </div>
                ))}
              </div>
            </div>
            <EquipmentField value={profile} onChange={onChange} />
          </Section>
          <Section id="schedule" title="Schedule">
            <ScheduleField value={profile} onChange={onChange} />
            <StandingTargets />
          </Section>
          <Section id="targets" title="Weekly targets">
            <TargetsField value={profile} onChange={onChange} />
          </Section>
          <Section id="safety" title="Safety & restrictions">
            <RestrictionsField value={profile} onChange={onChange} />
            <Flagged />
          </Section>
          <Section id="library" title="Exercise library">
            <Library />
          </Section>
          <Section id="display" title="Display & sound">
            <DisplayField value={profile} onChange={onChange} />
          </Section>
          <Section id="data" title="Your data">
            <DataControls />
          </Section>
          <Section id="about" title="About FRONTIER">
            <About />
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={`set-${id}`} className="panel stack-lg settings-section" aria-labelledby={`set-${id}-h`}>
      <h2 id={`set-${id}-h`}>{title}</h2>
      {children}
    </section>
  );
}

function StandingTargets() {
  const store = useStore();
  const profile = store.data.profile!;
  const entries = Object.entries(profile.standingTargets) as [keyof UserProfile['standingTargets'], number][];
  if (!entries.length) return <p className="help">Accepted “step up” offers will appear here, and you can undo them any time.</p>;
  return (
    <div className="field">
      <span className="field-label">Accepted session targets</span>
      <ul className="list">
        {entries.map(([m, v]) => (
          <li key={m} className="list-item">
            <ModalityIcon modality={m} boxed />
            <span style={{ flex: 1 }}>
              {modalityLabel(m, profile)} · <span className="num">{v} min</span>
            </span>
            <button
              className="btn small"
              onClick={() => {
                const next = { ...profile.standingTargets };
                delete next[m];
                store.updateProfile({ standingTargets: next });
              }}
            >
              Reset to default
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Flagged() {
  const store = useStore();
  const { data, exercises } = store;
  const profile = data.profile!;
  const none = profile.flaggedModalities.length === 0 && profile.flaggedExercises.length === 0;
  return (
    <div className="field">
      <span className="field-label">Paused after “Uncomfortable” reports</span>
      {none ? (
        <p className="help">Nothing paused. If you report a session as uncomfortable, that activity or exercise stops being suggested and appears here for you to review.</p>
      ) : (
        <ul className="list">
          {profile.flaggedModalities.map((m) => (
            <li key={m} className="list-item">
              <ModalityIcon modality={m} boxed />
              <span style={{ flex: 1 }}>{modalityLabel(m, profile)}</span>
              <button className="btn small" onClick={() => store.updateProfile({ flaggedModalities: profile.flaggedModalities.filter((x) => x !== m) })}>
                Resume suggestions
              </button>
            </li>
          ))}
          {profile.flaggedExercises.map((id) => (
            <li key={id} className="list-item">
              <ModalityIcon modality="strength" boxed />
              <span style={{ flex: 1 }}>{exercises.find((e) => e.id === id)?.name ?? 'Exercise'}</span>
              <button className="btn small" onClick={() => store.updateProfile({ flaggedExercises: profile.flaggedExercises.filter((x) => x !== id) })}>
                Resume suggestions
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Library() {
  const store = useStore();
  const { data, exercises } = store;
  const profile = data.profile!;
  return (
    <div className="stack">
      <p className="help">Disabled exercises never appear in the picker. Exercises matching a movement you avoid are hidden regardless.</p>
      <ul className="list">
        {exercises.map((e) => {
          const blocked = e.cautionTags.filter((t) => profile.excludedMovements.includes(t));
          return (
            <li key={e.id} className="list-item lib-item">
              <div style={{ flex: 1, minWidth: 0 }}>
                <Switch
                  label={e.name}
                  hint={[e.isCustom ? 'Custom' : null, e.cautionTags.length ? `Involves: ${e.cautionTags.map((t) => CAUTION_TAGS.find((c) => c.id === t)?.label ?? t).join(', ')}` : null, blocked.length ? 'Hidden by your restrictions' : null].filter(Boolean).join(' · ') || undefined}
                  checked={e.isEnabled}
                  onChange={(v) => store.setExerciseEnabled(e.id, v)}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DataControls() {
  const store = useStore();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<AppData>();
  const [importError, setImportError] = useState<string>();
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [resetOpen, setResetOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const doExport = () => {
    const file = toExportFile(store.data);
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `frontier-export-${dayKey(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Export downloaded.');
  };

  const onFile = async (f: File | undefined) => {
    setImportError(undefined);
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) return setImportError('That file is larger than 20 MB — it doesn’t look like a FRONTIER export.');
    try {
      const text = await f.text();
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        throw new ValidationError('The file isn’t valid JSON.');
      }
      setPending(parseAppData(json));
    } catch (e) {
      setImportError(e instanceof ValidationError ? e.message : 'The file could not be read.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="stack-lg">
      <div className="notice">
        <ShieldCheck size={18} aria-hidden="true" />
        <span className="small">All data is stored locally in this browser. Nothing is sent anywhere — there are no analytics, accounts or servers. Clearing browser data will remove it, so export a backup now and then.</span>
      </div>
      <div className="data-actions">
        <div className="data-card">
          <Download size={20} aria-hidden="true" />
          <div>
            <h3>Export</h3>
            <p className="small muted">Download everything as a JSON file: profile, sessions, missions, reviews.</p>
          </div>
          <button className="btn" onClick={doExport}>
            <FileJson size={16} aria-hidden="true" /> Export data
          </button>
        </div>
        <div className="data-card">
          <Upload size={20} aria-hidden="true" />
          <div>
            <h3>Import</h3>
            <p className="small muted">Restore or merge a FRONTIER export. Files are validated first; rewards are never duplicated.</p>
          </div>
          <label className="btn">
            <Upload size={16} aria-hidden="true" /> Choose file
            <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
        </div>
        <div className="data-card danger-card">
          <Trash2 size={20} aria-hidden="true" />
          <div>
            <h3>Delete all data</h3>
            <p className="small muted">Erase your profile and every session from this device and start over.</p>
          </div>
          <button className="btn danger" onClick={() => setResetOpen(true)}>
            <RotateCcw size={16} aria-hidden="true" /> Reset FRONTIER
          </button>
        </div>
      </div>
      {importError && (
        <p className="error-text" role="alert">
          <TriangleAlert size={16} aria-hidden="true" /> Import rejected: {importError}
        </p>
      )}

      <Dialog
        open={!!pending}
        onClose={() => setPending(undefined)}
        title="Import data"
        actions={
          <>
            <button className="btn" onClick={() => setPending(undefined)}>
              Cancel
            </button>
            <button
              className={`btn ${mode === 'replace' ? 'danger' : 'primary'}`}
              onClick={() => {
                if (!pending) return;
                if (mode === 'replace' && !pending.profile) {
                  setImportError('That file has no profile, so it can’t replace your data. Use merge instead.');
                  setPending(undefined);
                  return;
                }
                store.importData(pending, mode);
                setPending(undefined);
                toast(mode === 'merge' ? 'Import merged.' : 'Data replaced from file.');
                navigate('home');
              }}
            >
              {mode === 'merge' ? 'Merge' : 'Replace everything'}
            </button>
          </>
        }
      >
        {pending && (
          <div className="stack">
            <p className="muted">
              This file contains <strong>{pending.sessions.length}</strong> session{pending.sessions.length === 1 ? '' : 's'}
              {pending.profile ? ' and a profile' : ''}. You currently have <strong>{store.data.sessions.length}</strong>.
            </p>
            <div className="stack" role="radiogroup" aria-label="Import mode">
              <label className="option" style={{ cursor: 'pointer' }}>
                <input type="radio" name="mode" checked={mode === 'merge'} onChange={() => setMode('merge')} />
                <span>
                  <strong>Merge</strong>
                  <br />
                  <span className="tiny muted">Add sessions that aren’t already here. Matching sessions keep the newest edit. Your profile stays.</span>
                </span>
              </label>
              <label className="option" style={{ cursor: 'pointer' }}>
                <input type="radio" name="mode" checked={mode === 'replace'} onChange={() => setMode('replace')} />
                <span>
                  <strong>Replace</strong>
                  <br />
                  <span className="tiny muted">Discard everything on this device and use the file instead.</span>
                </span>
              </label>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog
        open={resetOpen}
        onClose={() => {
          setResetOpen(false);
          setConfirmText('');
        }}
        title="Delete all FRONTIER data?"
        actions={
          <>
            <button className="btn" onClick={() => setResetOpen(false)}>
              Cancel
            </button>
            <button
              className="btn danger"
              disabled={confirmText.trim().toLowerCase() !== 'delete'}
              onClick={() => {
                store.resetAll();
                setResetOpen(false);
                navigate('home', { replace: true });
              }}
            >
              <Trash2 size={16} aria-hidden="true" /> Delete everything
            </button>
          </>
        }
      >
        <div className="stack">
          <p className="muted">This permanently erases your profile, {store.data.sessions.length} session{store.data.sessions.length === 1 ? '' : 's'}, missions and archive from this device. Consider exporting first.</p>
          <div className="field">
            <label htmlFor="confirm-del">
              Type <strong>delete</strong> to confirm
            </label>
            <input id="confirm-del" className="input" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function About() {
  return (
    <div className="stack small">
      <div className="notice info">
        <Info size={18} color="var(--signal-cyan)" aria-hidden="true" />
        <span>FRONTIER is a motivation and logging tool. It is not medical advice and doesn’t diagnose, assess or treat anything. Stop any activity that causes pain, dizziness or chest discomfort, and seek professional advice if you’re unsure what’s right for you.</span>
      </div>
      <ul className="bullets">
        <li>XP, levels and attributes reward participation. They are not calories, fitness scores or health measures.</li>
        <li>Missions are generated by simple, transparent rules from your settings and recent sessions — no AI service, no network.</li>
        <li>Missing days never removes XP, levels or unlocks. Rest days are part of the plan.</li>
        <li>Deleting or editing a session recalculates progress from your log, so rewards always match what you recorded.</li>
      </ul>
      <p className="muted">
        Optional reference: the WHO suggests 150–300 minutes of moderate aerobic activity weekly plus muscle-strengthening on two or more days for adults. Use it as context, not a requirement. Research behind the design: Mazeas et al. 2022 (JMIR), Ntoumanis & Moller 2025, Samdal et al. 2017; breathing comfort guidance from NHS inform.
      </p>
      <p className="tiny muted">Version 0.1.0 · data schema v1</p>
    </div>
  );
}
