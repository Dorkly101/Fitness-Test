import type { StrengthExercise } from '../domain/types';

export const EQUIPMENT: { id: string; label: string }[] = [
  { id: 'dumbbells', label: 'Dumbbells' },
  { id: 'kettlebell', label: 'Kettlebell' },
  { id: 'bands', label: 'Resistance bands' },
  { id: 'bench', label: 'Bench or sturdy step' },
  { id: 'barbell', label: 'Barbell & rack' },
  { id: 'pullup_bar', label: 'Pull-up bar' },
  { id: 'walking_pad', label: 'Walking pad' },
  { id: 'treadmill', label: 'Treadmill' },
  { id: 'bike', label: 'Bike / stationary bike' },
  { id: 'elliptical', label: 'Elliptical' },
  { id: 'vr_headset', label: 'VR headset' },
];

/** Movement caution tags the player can choose to avoid. No diagnosis is implied. */
export const CAUTION_TAGS: { id: string; label: string; hint: string }[] = [
  { id: 'overhead', label: 'Overhead pressing', hint: 'Pressing weight above the head' },
  { id: 'neck-loaded', label: 'Load on neck / upper back', hint: 'e.g. bar-on-back squats' },
  { id: 'heavy-hinge', label: 'Heavy hip hinging', hint: 'e.g. deadlift variations' },
  { id: 'floor', label: 'Getting down to the floor', hint: 'Floor-based exercises' },
  { id: 'kneeling', label: 'Kneeling', hint: 'Exercises with a knee on the ground' },
  { id: 'jumping', label: 'Jumping / high impact', hint: 'Hops, jumps, bounding' },
  { id: 'high-impact-upper', label: 'Punching / fast arm movements', hint: 'Affects VR boxing suggestions' },
];

/**
 * Starter library. Overhead pressing and neck-loaded movements exist so the
 * player can choose them, but are disabled by default and never prescribed
 * automatically.
 */
export const STARTER_EXERCISES: StrengthExercise[] = [
  { id: 'ex-goblet-squat', name: 'Goblet squat', equipment: ['dumbbells', 'kettlebell'], category: 'legs', isCustom: false, isEnabled: true, cautionTags: [] },
  { id: 'ex-sit-to-stand', name: 'Sit-to-stand (box squat)', equipment: [], category: 'legs', isCustom: false, isEnabled: true, cautionTags: [] },
  { id: 'ex-split-squat', name: 'Split squat', equipment: [], category: 'legs', isCustom: false, isEnabled: true, cautionTags: [] },
  { id: 'ex-db-rdl', name: 'Dumbbell Romanian deadlift', equipment: ['dumbbells'], category: 'legs', isCustom: false, isEnabled: true, cautionTags: ['heavy-hinge'] },
  { id: 'ex-glute-bridge', name: 'Glute bridge', equipment: [], category: 'legs', isCustom: false, isEnabled: true, cautionTags: ['floor'] },
  { id: 'ex-incline-pushup', name: 'Incline push-up', equipment: ['bench'], category: 'push', isCustom: false, isEnabled: true, cautionTags: [] },
  { id: 'ex-pushup', name: 'Push-up', equipment: [], category: 'push', isCustom: false, isEnabled: true, cautionTags: ['floor'] },
  { id: 'ex-db-bench', name: 'Dumbbell bench press', equipment: ['dumbbells', 'bench'], category: 'push', isCustom: false, isEnabled: true, cautionTags: [] },
  { id: 'ex-db-row', name: 'One-arm dumbbell row', equipment: ['dumbbells'], category: 'pull', isCustom: false, isEnabled: true, cautionTags: [] },
  { id: 'ex-band-row', name: 'Band row', equipment: ['bands'], category: 'pull', isCustom: false, isEnabled: true, cautionTags: [] },
  { id: 'ex-band-pull-apart', name: 'Band pull-apart', equipment: ['bands'], category: 'pull', isCustom: false, isEnabled: true, cautionTags: [] },
  { id: 'ex-dead-bug', name: 'Dead bug', equipment: [], category: 'core', isCustom: false, isEnabled: true, cautionTags: ['floor'] },
  { id: 'ex-suitcase-carry', name: 'Suitcase carry', equipment: ['dumbbells', 'kettlebell'], category: 'carry', isCustom: false, isEnabled: true, cautionTags: [] },
  { id: 'ex-db-ohp', name: 'Dumbbell overhead press', equipment: ['dumbbells'], category: 'push', isCustom: false, isEnabled: false, cautionTags: ['overhead'] },
  { id: 'ex-back-squat', name: 'Barbell back squat', equipment: ['barbell'], category: 'legs', isCustom: false, isEnabled: false, cautionTags: ['neck-loaded'] },
];
