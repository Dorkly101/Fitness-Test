import type { Domain, Modality, SessionDetails, UserProfile } from './types';

export interface ModalityMeta {
  id: Modality;
  label: string;
  /** Mission-flavoured name used in the game layer. */
  callName: string;
  domain: Domain;
  /** Low-friction activities are good candidates for Quick Ops and comeback missions. */
  lowFriction: boolean;
  /** Movement caution tags that make this whole modality unsuitable. */
  cautionTags: string[];
}

export const MODALITIES: Record<Modality, ModalityMeta> = {
  strength: { id: 'strength', label: 'Strength training', callName: 'Training protocol', domain: 'strength', lowFriction: false, cautionTags: [] },
  walking_pad: { id: 'walking_pad', label: 'Walking pad', callName: 'Recon walk', domain: 'endurance', lowFriction: true, cautionTags: [] },
  treadmill: { id: 'treadmill', label: 'Treadmill', callName: 'Survey run', domain: 'endurance', lowFriction: false, cautionTags: [] },
  cycling: { id: 'cycling', label: 'Cycling / bike', callName: 'Rover transit', domain: 'endurance', lowFriction: true, cautionTags: [] },
  elliptical: { id: 'elliptical', label: 'Elliptical', callName: 'Orbital glide', domain: 'endurance', lowFriction: true, cautionTags: [] },
  vr_active: { id: 'vr_active', label: 'VR boxing / active VR', callName: 'Arena simulation', domain: 'endurance', lowFriction: false, cautionTags: ['high-impact-upper'] },
  meditation: { id: 'meditation', label: 'Meditation', callName: 'Signal calibration', domain: 'focus', lowFriction: true, cautionTags: [] },
  breathwork: { id: 'breathwork', label: 'Breathwork', callName: 'Signal sync', domain: 'focus', lowFriction: true, cautionTags: [] },
  mobility: { id: 'mobility', label: 'Mobility / stretching', callName: 'Systems check', domain: 'recovery', lowFriction: true, cautionTags: [] },
  other: { id: 'other', label: 'Other activity', callName: 'Field task', domain: 'endurance', lowFriction: false, cautionTags: [] },
};

export const ALL_MODALITIES = Object.keys(MODALITIES) as Modality[];

export const DOMAIN_LABEL: Record<Domain, string> = {
  strength: 'Strength',
  endurance: 'Endurance',
  focus: 'Focus',
  recovery: 'Recovery',
};

export function domainOf(m: Modality): Domain {
  return MODALITIES[m].domain;
}

export function modalityLabel(m: Modality, profile?: UserProfile | null): string {
  return profile?.modalityLabels?.[m]?.trim() || MODALITIES[m].label;
}

/** Whether the player can be *recommended* this modality (manual logging is always allowed). */
export function isRecommendable(m: Modality, profile: UserProfile): boolean {
  if (!profile.enabledModalities.includes(m)) return false;
  if (profile.flaggedModalities.includes(m)) return false;
  const meta = MODALITIES[m];
  if (meta.cautionTags.some((t) => profile.excludedMovements.includes(t))) return false;
  return true;
}

export function emptyDetails(m: Modality): SessionDetails {
  switch (m) {
    case 'strength':
      return { kind: 'strength', entries: [] };
    case 'walking_pad':
    case 'treadmill':
    case 'cycling':
    case 'elliptical':
      return { kind: 'cardio' };
    case 'vr_active':
      return { kind: 'vr' };
    case 'meditation':
      return { kind: 'meditation' };
    case 'breathwork':
      return { kind: 'breathwork', presetId: 'steady', presetName: 'Steady 5 · 5' };
    case 'mobility':
      return { kind: 'mobility' };
    case 'other':
      return { kind: 'other' };
  }
}
