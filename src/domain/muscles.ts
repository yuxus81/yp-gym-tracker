export const MUSCLES = {
  chest: 'Brust',
  front_delts: 'Vordere Schulter',
  side_delts: 'Seitliche Schulter',
  rear_delts: 'Hintere Schulter',
  biceps: 'Bizeps',
  triceps: 'Trizeps',
  forearms: 'Unterarme',
  abs: 'Bauch',
  obliques: 'Seitlicher Bauch',
  traps: 'Nacken',
  lats: 'Latissimus',
  upper_back: 'Oberer Rücken',
  lower_back: 'Unterer Rücken',
  glutes: 'Gesäß',
  quads: 'Quadrizeps',
  hamstrings: 'Beinbeuger',
  adductors: 'Adduktoren',
  calves: 'Waden',
} as const;

export type MuscleId = keyof typeof MUSCLES;
export const MUSCLE_IDS = Object.keys(MUSCLES) as MuscleId[];

/** Gruppen für die Auswahl im Übungs-Editor. */
export const MUSCLE_GROUPS: { label: string; ids: MuscleId[] }[] = [
  { label: 'Oberkörper vorne', ids: ['chest', 'front_delts', 'side_delts', 'biceps', 'forearms'] },
  { label: 'Oberkörper hinten', ids: ['rear_delts', 'triceps', 'traps', 'lats', 'upper_back', 'lower_back'] },
  { label: 'Rumpf', ids: ['abs', 'obliques'] },
  { label: 'Beine', ids: ['glutes', 'quads', 'hamstrings', 'adductors', 'calves'] },
];

/** Intensität je Muskel: 1 = Hauptmuskel, ~0.45 = mitbeansprucht. */
export type MuscleLoad = Partial<Record<MuscleId, number>>;

export function loadFromExercises(
  exercises: { primary_muscles: MuscleId[]; secondary_muscles: MuscleId[] }[],
): MuscleLoad {
  const load: MuscleLoad = {};
  for (const ex of exercises) {
    for (const m of ex.secondary_muscles) load[m] = Math.max(load[m] ?? 0, 0.45);
    for (const m of ex.primary_muscles) load[m] = 1;
  }
  return load;
}

/** Verteilt Arbeitssätze auf Muskeln (Hauptmuskel 1, Nebenmuskel 0.5) und normiert auf 0..1. */
export function loadFromSetCounts(
  entries: { primary_muscles: MuscleId[]; secondary_muscles: MuscleId[]; sets: number }[],
): MuscleLoad {
  const raw: MuscleLoad = {};
  for (const e of entries) {
    for (const m of e.primary_muscles) raw[m] = (raw[m] ?? 0) + e.sets;
    for (const m of e.secondary_muscles) raw[m] = (raw[m] ?? 0) + e.sets * 0.5;
  }
  const max = Math.max(0, ...Object.values(raw).map((v) => v ?? 0));
  if (max === 0) return {};
  const out: MuscleLoad = {};
  for (const [k, v] of Object.entries(raw)) out[k as MuscleId] = Math.max(0.2, (v ?? 0) / max);
  return out;
}
