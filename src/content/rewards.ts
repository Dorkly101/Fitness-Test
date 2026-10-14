/** Archive items (earned via waypoints) and achievements. All deterministic, none purchasable. */

export type ArchiveKind = 'fragment' | 'outpost' | 'title';

export interface ArchiveItem {
  id: string;
  kind: ArchiveKind;
  name: string;
  description: string;
  /** For outpost modules: which visual stage it adds on the home hero. */
  outpostStage?: number;
}

export const ARCHIVE_ITEMS: ArchiveItem[] = [
  { id: 'frag-touchdown', kind: 'fragment', name: 'Log 001 — Touchdown', description: 'The first entry. The plain, the sky, and a faint relay blinking past the ridge.' },
  { id: 'outpost-habitat', kind: 'outpost', name: 'Habitat Module', description: 'A pressurised module at Kepler Base. Lights on.', outpostStage: 1 },
  { id: 'title-surveyor', kind: 'title', name: 'Surveyor', description: 'Profile title. Earned by establishing Kepler Base.' },
  { id: 'frag-ridge-hum', kind: 'fragment', name: 'Log 014 — The Ridge Hums', description: 'Returning footprints form a trail. The ridge is no longer blank on the map.' },
  { id: 'outpost-antenna', kind: 'outpost', name: 'Long-range Antenna', description: 'Raised at Echo Relay. It caught one pulse from the dormant station.', outpostStage: 2 },
  { id: 'frag-echo-pattern', kind: 'fragment', name: 'Log 027 — Echo Pattern', description: 'The relay signal repeats. It is waiting for something.' },
  { id: 'frag-descent', kind: 'fragment', name: 'Log 031 — Descent', description: 'Into the basin. Wind gone, instruments calm.' },
  { id: 'title-signal-keeper', kind: 'title', name: 'Signal Keeper', description: 'Profile title. Earned at the Still Water anomaly.' },
  { id: 'outpost-solar', kind: 'outpost', name: 'Solar Array', description: 'Panels recovered from the Lowland Cache.', outpostStage: 3 },
  { id: 'frag-many-routes', kind: 'fragment', name: 'Log 040 — Many Routes', description: 'Every approach to the relay is charted. None of them is the only way.' },
  { id: 'outpost-conduit', kind: 'outpost', name: 'Power Conduit', description: 'Routes power uphill to the relay.', outpostStage: 4 },
  { id: 'outpost-beacon', kind: 'outpost', name: 'Relay Beacon', description: 'The restored relay, broadcasting across the frontier.', outpostStage: 5 },
  { id: 'title-relay-engineer', kind: 'title', name: 'Relay Engineer', description: 'Profile title. Earned by restoring the Relay Station.' },
];

export const ARCHIVE_BY_ID = Object.fromEntries(ARCHIVE_ITEMS.map((a) => [a.id, a])) as Record<string, ArchiveItem>;

export type AchievementRule =
  | { type: 'sessions'; count: number }
  | { type: 'modality_sessions'; modality: string; count: number }
  | { type: 'strength_sets'; count: number }
  | { type: 'distinct_modalities'; count: number }
  | { type: 'weekly_contracts'; count: number }
  | { type: 'comeback'; gapDays: number }
  | { type: 'feedback_count'; count: number };

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  rule: AchievementRule;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'ach-first-contact', name: 'First Contact', description: 'Complete your first session.', rule: { type: 'sessions', count: 1 } },
  { id: 'ach-field-regular', name: 'Field Regular', description: 'Complete five sessions.', rule: { type: 'sessions', count: 5 } },
  { id: 'ach-loadout-logged', name: 'Loadout Logged', description: 'Log at least one strength set.', rule: { type: 'strength_sets', count: 1 } },
  { id: 'ach-calm-frequency', name: 'Calm Frequency', description: 'Complete a meditation.', rule: { type: 'modality_sessions', modality: 'meditation', count: 1 } },
  { id: 'ach-in-sync', name: 'In Sync', description: 'Complete a breathwork session.', rule: { type: 'modality_sessions', modality: 'breathwork', count: 1 } },
  { id: 'ach-varied-terrain', name: 'Varied Terrain', description: 'Log three different activity types.', rule: { type: 'distinct_modalities', count: 3 } },
  { id: 'ach-contract-kept', name: 'Contract Kept', description: 'Meet your own weekly Field Presence target.', rule: { type: 'weekly_contracts', count: 1 } },
  { id: 'ach-reestablished', name: 'Re-established', description: 'Return after a break of a week or more. Breaks are normal.', rule: { type: 'comeback', gapDays: 7 } },
  { id: 'ach-honest-signal', name: 'Honest Signal', description: 'Report how five sessions felt. It helps tune your missions.', rule: { type: 'feedback_count', count: 5 } },
  { id: 'ach-cartographer', name: 'Cartographer', description: 'Complete twenty-five sessions.', rule: { type: 'sessions', count: 25 } },
];
