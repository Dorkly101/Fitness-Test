/**
 * Gentle, comfortable breathing presets. Deliberately no breath holds,
 * no forced deep breathing and no hold-time challenges. The optional
 * "soft pause" is a natural rest of two seconds or less.
 */
export interface BreathPhase {
  label: 'Inhale' | 'Exhale' | 'Soft pause';
  seconds: number;
}

export interface BreathPreset {
  id: string;
  name: string;
  description: string;
  phases: BreathPhase[];
}

export const BREATH_PRESETS: BreathPreset[] = [
  {
    id: 'steady',
    name: 'Steady 5 · 5',
    description: 'Even, unhurried breaths. A good default.',
    phases: [
      { label: 'Inhale', seconds: 5 },
      { label: 'Exhale', seconds: 5 },
    ],
  },
  {
    id: 'unwind',
    name: 'Unwind 4 · 6',
    description: 'A slightly longer out-breath to settle down.',
    phases: [
      { label: 'Inhale', seconds: 4 },
      { label: 'Exhale', seconds: 6 },
    ],
  },
  {
    id: 'settle',
    name: 'Settle 4 · 1 · 5',
    description: 'A brief, natural pause after the in-breath. Never strain.',
    phases: [
      { label: 'Inhale', seconds: 4 },
      { label: 'Soft pause', seconds: 1 },
      { label: 'Exhale', seconds: 5 },
    ],
  },
  {
    id: 'light',
    name: 'Light 3 · 4',
    description: 'Shorter cycles if longer breaths feel like effort.',
    phases: [
      { label: 'Inhale', seconds: 3 },
      { label: 'Exhale', seconds: 4 },
    ],
  },
];

export const MEDITATION_DURATIONS = [1, 3, 5, 10, 15];
export const BREATH_DURATIONS = [1, 2, 3, 5];

export const MEDITATION_TYPES = ['Breath focus', 'Open awareness', 'Body scan', 'Unguided'];
