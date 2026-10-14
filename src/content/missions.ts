/**
 * Mission copy and templates. Edit text here to tune the theme without
 * touching quest logic. Objectives are deterministic and testable.
 */
import type { Modality, QuestDefinition } from '../domain/types';

/** Per-modality daily mission templates. `{min}` is replaced with the suggested duration. */
export const DAILY_BY_MODALITY: Record<Modality, { id: string; title: string; flavour: string }> = {
  walking_pad: { id: 'daily-recon-walk', title: 'Recon Walk', flavour: 'Sweep the landing perimeter on foot and log what the sensors pick up.' },
  treadmill: { id: 'daily-survey-rim', title: 'Survey the Rim', flavour: 'Trace the crater rim at a steady pace. The terrain scanner needs a clean pass.' },
  cycling: { id: 'daily-rover-transit', title: 'Rover Transit', flavour: 'Pedal the rover generator to move supplies toward the next waypoint.' },
  elliptical: { id: 'daily-orbital-glide', title: 'Orbital Glide', flavour: 'Hold a smooth orbit and keep the relay coils charged.' },
  vr_active: { id: 'daily-arena-sim', title: 'Arena Simulation', flavour: 'Run a reflex simulation in the training bay. Move, react, reset.' },
  strength: { id: 'daily-loadout', title: 'Loadout Calibration', flavour: 'Run your saved training protocol or build one now. Every logged set counts.' },
  meditation: { id: 'daily-stabilise', title: 'Stabilise the Signal', flavour: 'Quiet the channel. Sit with the signal until it settles.' },
  breathwork: { id: 'daily-signal-sync', title: 'Signal Sync', flavour: 'Match the beacon’s slow pulse. Comfortable breaths only.' },
  mobility: { id: 'daily-systems-check', title: 'Systems Check', flavour: 'Run a gentle diagnostic on every joint before the next push.' },
  other: { id: 'daily-field-task', title: 'Field Task', flavour: 'A custom task for the expedition log. Your call, your pace.' },
};

export const QUICK_OPS = {
  id: 'quick-recon-ping',
  title: 'Recon Ping',
  flavour: 'A small step still moves the expedition forward.',
};

export const COMEBACK = {
  id: 'comeback-reestablish',
  title: 'Re-establish Contact',
  flavour: 'No progress lost. Re-open the channel with a short mission.',
};

/** Weekly directives. Targets come from the player's own weekly contract. */
export const WEEKLY = {
  presence: { id: 'weekly-field-presence', title: 'Field Presence', flavour: 'Show up for the sessions you signed up for this week.' },
  movement: { id: 'weekly-distance-survey', title: 'Distance Survey', flavour: 'Accumulate movement minutes to extend the mapped area.' },
  strength: { id: 'weekly-loadout-cycle', title: 'Loadout Cycle', flavour: 'Complete your chosen number of strength protocols.' },
  mindful: { id: 'weekly-quiet-channel', title: 'Quiet Channel', flavour: 'Hold the signal steady with focus practice.' },
  variety: { id: 'weekly-varied-terrain', title: 'Varied Terrain', flavour: 'Survey the sector using two different approaches.' },
} as const;

/** Long-running expedition objectives. Cumulative across all logged activity. */
export const EXPEDITION_OBJECTIVES: QuestDefinition[] = [
  {
    id: 'exp-cartographer',
    category: 'expedition',
    domain: 'any',
    title: 'Cartographer',
    flavour: 'Twenty-five field logs make a map someone else could follow.',
    eligibleModalities: 'any',
    objective: { type: 'sessions', count: 25 },
    rewardXP: 10,
  },
  {
    id: 'exp-deep-survey',
    category: 'expedition',
    domain: 'any',
    title: 'Deep Survey',
    flavour: 'Five hundred active minutes of terrain data.',
    eligibleModalities: 'any',
    objective: { type: 'minutes', minutes: 500 },
    rewardXP: 10,
  },
  {
    id: 'exp-loadout-veteran',
    category: 'expedition',
    domain: 'strength',
    title: 'Loadout Veteran',
    flavour: 'Ten training protocols logged in the armoury.',
    eligibleModalities: ['strength'],
    objective: { type: 'sessions', count: 10 },
    rewardXP: 10,
  },
  {
    id: 'exp-quiet-hours',
    category: 'expedition',
    domain: 'focus',
    title: 'Quiet Hours',
    flavour: 'Ten focus practices. The channel remembers.',
    eligibleModalities: ['meditation', 'breathwork'],
    objective: { type: 'sessions', count: 10 },
    rewardXP: 10,
  },
  {
    id: 'exp-field-days',
    category: 'expedition',
    domain: 'any',
    title: 'Field Days',
    flavour: 'Twenty different days in the field, at whatever pace suits you.',
    eligibleModalities: 'any',
    objective: { type: 'active_days', days: 20 },
    rewardXP: 10,
  },
];

export const BRIEFING_LINES = {
  firstRun: 'Uplink stable. Your first field log will mark the landing zone.',
  restDay: 'Planned rest day. Recovery is part of the route — gentle options are here if you want them.',
  comeback: 'No progress lost. Re-establish contact with a quick mission.',
  doneToday: 'Field log updated today. Anything more is a bonus, not a requirement.',
  default: 'Uplink stable. Three missions are available.',
};
