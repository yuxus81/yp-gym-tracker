/** Regionen der Körperfigur (Zeichnung). Ausgewählt wird nicht einzeln, sondern über AREAS. */
export type MuscleId =
  | 'chest'
  | 'front_delts'
  | 'side_delts'
  | 'rear_delts'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'obliques'
  | 'traps'
  | 'lats'
  | 'upper_back'
  | 'lower_back'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'adductors'
  | 'calves';

/** Intensität je Region: 0 = aus, 1 = voll. */
export type MuscleLoad = Partial<Record<MuscleId, number>>;

/** Grobe Bereiche, die man pro Trainingstag antippt. Die IDs landen so in der Datenbank. */
export const AREAS = [
  { id: 'brust', label: 'Brust', muscles: ['chest'] },
  { id: 'schultern', label: 'Schultern', muscles: ['front_delts', 'side_delts', 'rear_delts'] },
  { id: 'nacken', label: 'Nacken', muscles: ['traps'] },
  { id: 'oberer_ruecken', label: 'Oberer Rücken', muscles: ['upper_back'] },
  { id: 'ruecken', label: 'Rücken', muscles: ['lats'] },
  { id: 'unterer_ruecken', label: 'Unterer Rücken', muscles: ['lower_back'] },
  { id: 'bizeps', label: 'Bizeps', muscles: ['biceps'] },
  { id: 'trizeps', label: 'Trizeps', muscles: ['triceps'] },
  { id: 'unterarme', label: 'Unterarme', muscles: ['forearms'] },
  { id: 'bauch', label: 'Bauch', muscles: ['abs', 'obliques'] },
  { id: 'po', label: 'Po', muscles: ['glutes'] },
  { id: 'beine', label: 'Beine', muscles: ['quads', 'hamstrings', 'adductors'] },
  { id: 'waden', label: 'Waden', muscles: ['calves'] },
] as const satisfies readonly { id: string; label: string; muscles: readonly MuscleId[] }[];

export type AreaId = (typeof AREAS)[number]['id'];

const AREA_BY_ID = new Map<string, (typeof AREAS)[number]>(AREAS.map((a) => [a.id, a]));

/** Welcher Bereich gehört zu einer angetippten Region der Figur? */
export function areaOfMuscle(m: MuscleId): AreaId | undefined {
  return AREAS.find((a) => (a.muscles as readonly MuscleId[]).includes(m))?.id;
}

export function areaLabel(id: string): string {
  return AREA_BY_ID.get(id)?.label ?? id;
}

/** Bereiche in fester Reihenfolge (unbekannte IDs fallen weg). */
export function sortAreas(ids: readonly string[]): AreaId[] {
  return AREAS.filter((a) => ids.includes(a.id)).map((a) => a.id);
}

export function loadFromAreas(ids: readonly string[] | undefined, value = 1): MuscleLoad {
  const load: MuscleLoad = {};
  for (const id of ids ?? []) for (const m of AREA_BY_ID.get(id)?.muscles ?? []) load[m] = value;
  return load;
}

/** Verteilt erledigte Sätze auf Bereiche und normiert auf 0..1 (Minimum 0.25, damit nichts verschwindet). */
export function loadFromAreaCounts(entries: { areas: readonly string[]; sets: number }[]): MuscleLoad {
  const raw = new Map<string, number>();
  for (const e of entries) for (const a of e.areas) raw.set(a, (raw.get(a) ?? 0) + e.sets);
  const max = Math.max(0, ...raw.values());
  if (max === 0) return {};
  const out: MuscleLoad = {};
  for (const [a, v] of raw) for (const m of AREA_BY_ID.get(a)?.muscles ?? []) out[m] = Math.max(0.25, v / max);
  return out;
}

/** Bereiche einer Session: eigene Momentaufnahme, sonst (ältere Sessions) die des Plantags. */
export function sessionAreas(session: { areas?: string[] }, day?: { areas?: string[] } | null): string[] {
  if (session.areas?.length) return session.areas;
  return day?.areas ?? [];
}
