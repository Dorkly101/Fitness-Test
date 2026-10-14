/**
 * First campaign: four sectors, twelve waypoints. Unlock rules are
 * transparent and tied to logged activity. Every rule offers a path that
 * does not require any particular activity type, and none require
 * consecutive days, extreme durations or maximal effort.
 */

export type ProgressMetric =
  | 'sessions'
  | 'minutes'
  | 'activeDays'
  | 'activeWeeks'
  | 'weeklyContracts'
  | 'focusRecoverySessions'
  | 'distinctModalities';

export interface UnlockCondition {
  metric: ProgressMetric;
  value: number;
}

export interface ExpeditionNode {
  id: string;
  sectorId: string;
  title: string;
  description: string;
  story: string;
  /** Node unlocks when ANY condition is met (alternate routes) and the previous node is discovered. */
  unlockRule: UnlockCondition[];
  kind: 'waypoint' | 'outpost' | 'anomaly';
  rewardIds: string[];
  artKey: string;
}

export interface Sector {
  id: string;
  index: number;
  name: string;
  tagline: string;
  palette: 'arrival' | 'ridge' | 'basin' | 'relay';
}

export const METRIC_LABEL: Record<ProgressMetric, (n: number) => string> = {
  sessions: (n) => `${n} completed session${n === 1 ? '' : 's'}`,
  minutes: (n) => `${n} active minutes`,
  activeDays: (n) => `active on ${n} different day${n === 1 ? '' : 's'}`,
  activeWeeks: (n) => `active in ${n} different week${n === 1 ? '' : 's'}`,
  weeklyContracts: (n) => `meet your weekly Field Presence target ${n === 1 ? 'once' : `${n} times`}`,
  focusRecoverySessions: (n) => `${n} focus or recovery sessions`,
  distinctModalities: (n) => `${n} different activity types`,
};

export const SECTORS: Sector[] = [
  { id: 'arrival', index: 1, name: 'Arrival', tagline: 'Establish the base and calibrate the equipment.', palette: 'arrival' },
  { id: 'ridge', index: 2, name: 'Signal Ridge', tagline: 'Reveal routes through repeated field missions.', palette: 'ridge' },
  { id: 'basin', index: 3, name: 'The Quiet Basin', tagline: 'A sheltered lowland where focus and recovery open side routes.', palette: 'basin' },
  { id: 'relay', index: 4, name: 'Relay Station', tagline: 'Restore the dormant relay and reconnect the chain.', palette: 'relay' },
];

export const NODES: ExpeditionNode[] = [
  {
    id: 'arrival-landing',
    sectorId: 'arrival',
    title: 'Landing Zone',
    description: 'The drop site. Your first field log plants the beacon.',
    story: 'Touchdown confirmed. The plain is quiet, the sky enormous. Somewhere past the ridge, a relay still blinks on reserve power.',
    unlockRule: [{ metric: 'sessions', value: 1 }],
    kind: 'waypoint',
    rewardIds: ['frag-touchdown'],
    artKey: 'beacon',
  },
  {
    id: 'arrival-array',
    sectorId: 'arrival',
    title: 'Calibration Array',
    description: 'Three field logs align the survey instruments.',
    story: 'The array hums awake. Instruments agree with one another for the first time since landing.',
    unlockRule: [{ metric: 'sessions', value: 3 }],
    kind: 'waypoint',
    rewardIds: ['outpost-habitat'],
    artKey: 'array',
  },
  {
    id: 'arrival-base',
    sectorId: 'arrival',
    title: 'Kepler Base',
    description: 'Five sessions in, the base becomes somewhere to come back to.',
    story: 'Lights on in the habitat. The base has a name now, and a log that grows every time you return.',
    unlockRule: [{ metric: 'sessions', value: 5 }],
    kind: 'outpost',
    rewardIds: ['title-surveyor'],
    artKey: 'outpost',
  },
  {
    id: 'ridge-trailhead',
    sectorId: 'ridge',
    title: 'Ridge Trailhead',
    description: 'Field activity on four different days reveals a path up the ridge.',
    story: 'Patterns in the logs: footprints that return to the same trail. The ridge path resolves on the map.',
    unlockRule: [{ metric: 'activeDays', value: 4 }],
    kind: 'waypoint',
    rewardIds: ['frag-ridge-hum'],
    artKey: 'trail',
  },
  {
    id: 'ridge-echo',
    sectorId: 'ridge',
    title: 'Echo Relay',
    description: 'Meet your own weekly target once — or bank 180 active minutes — to raise the antenna.',
    story: 'The antenna unfolds against the wind. For a moment the relay answers: one pulse, then static.',
    unlockRule: [
      { metric: 'weeklyContracts', value: 1 },
      { metric: 'minutes', value: 180 },
    ],
    kind: 'outpost',
    rewardIds: ['outpost-antenna'],
    artKey: 'antenna',
  },
  {
    id: 'ridge-crest',
    sectorId: 'ridge',
    title: 'Ridge Crest',
    description: 'Ten sessions bring you to the crest and a view of the basin below.',
    story: 'From the crest the basin is a bowl of mist. The relay signal is clearer here — it repeats a pattern.',
    unlockRule: [{ metric: 'sessions', value: 10 }],
    kind: 'waypoint',
    rewardIds: ['frag-echo-pattern'],
    artKey: 'crest',
  },
  {
    id: 'basin-rim',
    sectorId: 'basin',
    title: 'Basin Rim',
    description: 'Activity in three different weeks opens a way down into the basin.',
    story: 'The descent is gentle. Down here the wind drops away and the instruments read calm.',
    unlockRule: [
      { metric: 'activeWeeks', value: 3 },
      { metric: 'sessions', value: 16 },
    ],
    kind: 'waypoint',
    rewardIds: ['frag-descent'],
    artKey: 'rim',
  },
  {
    id: 'basin-still-water',
    sectorId: 'basin',
    title: 'Still Water',
    description: 'An anomaly. Four focus or recovery sessions — or activity on twelve different days — reveal it.',
    story: 'A lake so still it reflects the ringed planet perfectly. The signal is strongest when you are quiet.',
    unlockRule: [
      { metric: 'focusRecoverySessions', value: 4 },
      { metric: 'activeDays', value: 12 },
    ],
    kind: 'anomaly',
    rewardIds: ['title-signal-keeper'],
    artKey: 'lake',
  },
  {
    id: 'basin-cache',
    sectorId: 'basin',
    title: 'Lowland Cache',
    description: 'Four hundred active minutes uncover a supply cache with solar panels.',
    story: 'A sealed cache from an earlier crew. Inside: folded solar panels and a note — “keep going, it’s worth it.”',
    unlockRule: [{ metric: 'minutes', value: 400 }],
    kind: 'outpost',
    rewardIds: ['outpost-solar'],
    artKey: 'cache',
  },
  {
    id: 'relay-approach',
    sectorId: 'relay',
    title: 'Relay Approach',
    description: 'Try three different activity types — or log 22 sessions — to chart the approach.',
    story: 'Many routes lead to the relay. The map shows all of them now.',
    unlockRule: [
      { metric: 'distinctModalities', value: 3 },
      { metric: 'sessions', value: 22 },
    ],
    kind: 'waypoint',
    rewardIds: ['frag-many-routes'],
    artKey: 'approach',
  },
  {
    id: 'relay-conduit',
    sectorId: 'relay',
    title: 'Power Conduit',
    description: 'Activity in five different weeks routes power to the relay.',
    story: 'Cable by cable, the conduit carries power uphill. The relay’s reserve light turns from red to amber.',
    unlockRule: [
      { metric: 'activeWeeks', value: 5 },
      { metric: 'sessions', value: 26 },
    ],
    kind: 'outpost',
    rewardIds: ['outpost-conduit'],
    artKey: 'conduit',
  },
  {
    id: 'relay-station',
    sectorId: 'relay',
    title: 'Relay Station',
    description: 'Thirty sessions restore the relay and reconnect the chain of outposts.',
    story: 'Outpost systems restored. The relay sings across the frontier — and far away, another one answers.',
    unlockRule: [{ metric: 'sessions', value: 30 }],
    kind: 'outpost',
    rewardIds: ['outpost-beacon', 'title-relay-engineer'],
    artKey: 'relay',
  },
];
