import { useEffect, useId, useRef, type ReactNode } from 'react';
import {
  Bike,
  Check,
  Dumbbell,
  Footprints,
  Gamepad2,
  Gauge,
  Minus,
  Orbit,
  PersonStanding,
  Plus,
  Radar,
  Sparkles,
  Wind,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { Domain, Modality } from '../domain/types';
import { domainOf } from '../domain/modalities';

export const MODALITY_ICON: Record<Modality, LucideIcon> = {
  strength: Dumbbell,
  walking_pad: Footprints,
  treadmill: Gauge,
  cycling: Bike,
  elliptical: Orbit,
  vr_active: Gamepad2,
  meditation: Radar,
  breathwork: Wind,
  mobility: PersonStanding,
  other: Sparkles,
};

export function ModalityIcon({ modality, size = 18, boxed = false, large = false }: { modality: Modality; size?: number; boxed?: boolean; large?: boolean }) {
  const Icon = MODALITY_ICON[modality];
  if (!boxed) return <Icon size={size} strokeWidth={1.75} aria-hidden="true" />;
  return (
    <span className={`domain-dot dom-${domainOf(modality)}${large ? ' lg' : ''}`} aria-hidden="true">
      <Icon size={large ? 22 : 16} strokeWidth={1.75} />
    </span>
  );
}

export function domainClass(d: Domain | 'any'): string {
  return d === 'any' ? '' : `dom-${d}`;
}

export function ProgressBar({ value, max, label, lime, thin }: { value: number; max: number; label: string; lime?: boolean; thin?: boolean }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={`bar${lime ? ' lime' : ''}${thin ? ' thin' : ''}`} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(value, max)}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Chip({ pressed, onClick, children, disabled }: { pressed: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button type="button" className="chip" aria-pressed={pressed} onClick={onClick} disabled={disabled}>
      <span className="chip-check" aria-hidden="true">
        {pressed && <Check size={11} strokeWidth={3} />}
      </span>
      {children}
    </button>
  );
}

export function Option({ pressed, onClick, children, role = 'checkbox' }: { pressed: boolean; onClick: () => void; children: ReactNode; role?: 'checkbox' | 'radio' }) {
  return (
    <button type="button" className="option" role={role} aria-checked={pressed} onClick={onClick}>
      {children}
      <span className="option-mark" aria-hidden="true">
        {pressed && <Check size={13} strokeWidth={3} />}
      </span>
    </button>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" role="radio" aria-checked={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} className="switch" onClick={() => onChange(!checked)}>
      <span>
        <span style={{ display: 'block', fontWeight: 500 }}>{label}</span>
        {hint && <span className="help">{hint}</span>}
      </span>
      <span className="switch-track" aria-hidden="true" />
    </button>
  );
}

export function Stepper({ value, onChange, min = 0, max = 99, step = 1, label, suffix }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; label: string; suffix?: string }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" aria-label={`Decrease ${label}`} onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min}>
        <Minus size={16} />
      </button>
      <output aria-live="polite">
        {value}
        {suffix && <span className="muted tiny"> {suffix}</span>}
      </output>
      <button type="button" aria-label={`Increase ${label}`} onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max}>
        <Plus size={16} />
      </button>
    </div>
  );
}

export function Dialog({ open, onClose, title, children, actions, labelledBy }: { open: boolean; onClose: () => void; title: string; children: ReactNode; actions?: ReactNode; labelledBy?: string }) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const focusables = () => [...(node?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? [])].filter((el) => !el.hasAttribute('disabled'));
    focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const f = focusables();
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby={labelledBy ?? id} ref={ref}>
        <div className="dialog-head">
          <h2 id={id}>{title}</h2>
          <button type="button" className="btn ghost icon" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>
        {children}
        {actions && <div className="dialog-actions">{actions}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ art, title, children, action }: { art: ReactNode; title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-art" aria-hidden="true">
        {art}
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}

export function PageHead({ eyebrow, title, children, actions }: { eyebrow?: string; title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {children && <p className="muted" style={{ marginTop: 6, maxWidth: 640 }}>{children}</p>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </header>
  );
}
