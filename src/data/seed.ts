import { db, getMeta, setMeta } from '@/db/dexie';
import { insertMany } from '@/db/repo';
import type { Exercise, PlanDay, PlanDayExercise } from '@/domain/types';
import type { MuscleId } from '@/domain/muscles';

type SeedEx = [name: string, primary: MuscleId[], secondary: MuscleId[], equipment: string, rest: number];

/** Start-Bibliothek. Frei änderbar — die App legt sie nur einmal pro Konto an. */
export const EXERCISE_SEED: SeedEx[] = [
  // Brust
  ['Bankdrücken (Langhantel)', ['chest'], ['front_delts', 'triceps'], 'Langhantel', 150],
  ['Schrägbankdrücken (Kurzhantel)', ['chest'], ['front_delts', 'triceps'], 'Kurzhantel', 120],
  ['Brustpresse (Maschine)', ['chest'], ['front_delts', 'triceps'], 'Maschine', 90],
  ['Butterfly (Maschine)', ['chest'], ['front_delts'], 'Maschine', 60],
  ['Kabelzug-Crossover', ['chest'], ['front_delts'], 'Kabel', 60],
  ['Dips', ['chest', 'triceps'], ['front_delts'], 'Körpergewicht', 90],
  ['Liegestütze', ['chest'], ['triceps', 'front_delts', 'abs'], 'Körpergewicht', 60],
  // Rücken
  ['Klimmzüge', ['lats'], ['biceps', 'upper_back', 'forearms'], 'Körpergewicht', 120],
  ['Latzug (breit)', ['lats'], ['biceps', 'upper_back'], 'Kabel', 90],
  ['Rudern (Langhantel)', ['upper_back', 'lats'], ['biceps', 'rear_delts', 'lower_back'], 'Langhantel', 120],
  ['Rudern am Kabel (eng)', ['upper_back', 'lats'], ['biceps', 'rear_delts'], 'Kabel', 90],
  ['Einarmiges Kurzhantelrudern', ['lats', 'upper_back'], ['biceps', 'rear_delts'], 'Kurzhantel', 90],
  ['T-Bar-Rudern', ['upper_back', 'lats'], ['biceps', 'rear_delts'], 'Maschine', 90],
  ['Kreuzheben', ['lower_back', 'glutes', 'hamstrings'], ['upper_back', 'traps', 'quads', 'forearms'], 'Langhantel', 180],
  ['Rückenstrecker', ['lower_back'], ['glutes', 'hamstrings'], 'Körpergewicht', 60],
  ['Shrugs (Kurzhantel)', ['traps'], ['forearms'], 'Kurzhantel', 60],
  // Schultern
  ['Schulterdrücken (Kurzhantel)', ['front_delts'], ['side_delts', 'triceps'], 'Kurzhantel', 120],
  ['Military Press (Langhantel)', ['front_delts'], ['side_delts', 'triceps', 'abs'], 'Langhantel', 150],
  ['Schulterpresse (Maschine)', ['front_delts'], ['side_delts', 'triceps'], 'Maschine', 90],
  ['Seitheben (Kurzhantel)', ['side_delts'], ['traps'], 'Kurzhantel', 60],
  ['Seitheben am Kabel', ['side_delts'], [], 'Kabel', 60],
  ['Frontheben', ['front_delts'], ['side_delts'], 'Kurzhantel', 60],
  ['Reverse Butterfly', ['rear_delts'], ['upper_back'], 'Maschine', 60],
  ['Face Pulls', ['rear_delts'], ['upper_back', 'traps'], 'Kabel', 60],
  ['Aufrechtes Rudern', ['side_delts', 'traps'], ['front_delts', 'biceps'], 'Langhantel', 60],
  // Arme
  ['Bizepscurls (Langhantel)', ['biceps'], ['forearms'], 'Langhantel', 60],
  ['Bizepscurls (Kurzhantel)', ['biceps'], ['forearms'], 'Kurzhantel', 60],
  ['Hammercurls', ['biceps', 'forearms'], [], 'Kurzhantel', 60],
  ['Scottcurls', ['biceps'], ['forearms'], 'Maschine', 60],
  ['Kabelcurls', ['biceps'], ['forearms'], 'Kabel', 60],
  ['Konzentrationscurls', ['biceps'], [], 'Kurzhantel', 60],
  ['Trizepsdrücken am Kabel', ['triceps'], [], 'Kabel', 60],
  ['Überkopf-Trizepsstrecken (Kabel)', ['triceps'], [], 'Kabel', 60],
  ['French Press (SZ-Stange)', ['triceps'], [], 'Langhantel', 60],
  ['Enges Bankdrücken', ['triceps'], ['chest', 'front_delts'], 'Langhantel', 90],
  ['Kickbacks', ['triceps'], [], 'Kurzhantel', 60],
  ['Unterarmcurls', ['forearms'], [], 'Langhantel', 45],
  // Beine
  ['Kniebeugen (Langhantel)', ['quads', 'glutes'], ['adductors', 'lower_back', 'hamstrings'], 'Langhantel', 180],
  ['Beinpresse', ['quads', 'glutes'], ['adductors', 'hamstrings'], 'Maschine', 120],
  ['Hackenschmidt-Kniebeuge', ['quads'], ['glutes', 'adductors'], 'Maschine', 120],
  ['Bulgarian Split Squats', ['quads', 'glutes'], ['adductors', 'hamstrings'], 'Kurzhantel', 90],
  ['Ausfallschritte', ['quads', 'glutes'], ['hamstrings', 'adductors'], 'Kurzhantel', 90],
  ['Beinstrecker', ['quads'], [], 'Maschine', 60],
  ['Rumänisches Kreuzheben', ['hamstrings', 'glutes'], ['lower_back', 'forearms'], 'Langhantel', 120],
  ['Beinbeuger liegend', ['hamstrings'], ['calves'], 'Maschine', 60],
  ['Beinbeuger sitzend', ['hamstrings'], [], 'Maschine', 60],
  ['Hip Thrust', ['glutes'], ['hamstrings', 'quads'], 'Langhantel', 90],
  ['Adduktorenmaschine', ['adductors'], [], 'Maschine', 60],
  ['Abduktorenmaschine', ['glutes'], [], 'Maschine', 60],
  ['Wadenheben stehend', ['calves'], [], 'Maschine', 60],
  ['Wadenheben sitzend', ['calves'], [], 'Maschine', 60],
  // Rumpf
  ['Crunches am Kabel', ['abs'], ['obliques'], 'Kabel', 60],
  ['Hängendes Beinheben', ['abs'], ['obliques', 'forearms'], 'Körpergewicht', 60],
  ['Plank', ['abs'], ['obliques', 'front_delts'], 'Körpergewicht', 60],
  ['Russian Twists', ['obliques'], ['abs'], 'Körpergewicht', 45],
  ['Ab-Roller', ['abs'], ['lats', 'obliques'], 'Gerät', 60],
];

const NAMESPACE = '6f1d3b3e-7a1f-4c55-9d3a-2b8e0c9f4a11';

/** UUIDv5 — gleicher Name ergibt auf jedem Gerät dieselbe ID (keine Dubletten beim Abgleich). */
export async function uuidV5(name: string, namespace = NAMESPACE): Promise<string> {
  const ns = namespace.replace(/-/g, '').match(/.{2}/g)!.map((h) => parseInt(h, 16));
  const bytes = new Uint8Array([...ns, ...new TextEncoder().encode(name)]);
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-1', bytes)).slice(0, 16);
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = [...hash].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Legt die Start-Bibliothek genau einmal an — erst nachdem der Server-Stand geladen ist. */
export async function seedIfEmpty(): Promise<void> {
  if (await getMeta<boolean>('seeded')) return;
  if ((await db.exercises.count()) === 0) {
    const rows = await Promise.all(
      EXERCISE_SEED.map(async ([name, primary, secondary, equipment, rest]) => ({
        id: await uuidV5(`exercise:${name}`),
        name,
        primary_muscles: primary,
        secondary_muscles: secondary,
        equipment,
        rest_sec: rest,
        notes: '',
      })),
    );
    await insertMany<Exercise>('exercises', rows);
  }
  await setMeta('seeded', true);
}

/** Beispielplan auf Knopfdruck (leerer Plan-Bildschirm). */
export const SAMPLE_PLAN: { name: string; color: number; weekdays: number[]; exercises: [string, number, number, number][] }[] = [
  {
    name: 'Brust & Trizeps',
    color: 0,
    weekdays: [0],
    exercises: [
      ['Bankdrücken (Langhantel)', 4, 6, 8],
      ['Schrägbankdrücken (Kurzhantel)', 3, 8, 10],
      ['Butterfly (Maschine)', 3, 10, 12],
      ['Trizepsdrücken am Kabel', 3, 10, 12],
      ['Überkopf-Trizepsstrecken (Kabel)', 3, 10, 12],
    ],
  },
  {
    name: 'Rücken & Bizeps',
    color: 2,
    weekdays: [1],
    exercises: [
      ['Klimmzüge', 4, 6, 10],
      ['Rudern am Kabel (eng)', 3, 8, 10],
      ['Latzug (breit)', 3, 10, 12],
      ['Face Pulls', 3, 12, 15],
      ['Bizepscurls (Kurzhantel)', 3, 8, 12],
      ['Hammercurls', 3, 10, 12],
    ],
  },
  {
    name: 'Beine',
    color: 1,
    weekdays: [3],
    exercises: [
      ['Kniebeugen (Langhantel)', 4, 5, 8],
      ['Rumänisches Kreuzheben', 3, 8, 10],
      ['Beinpresse', 3, 10, 12],
      ['Beinbeuger sitzend', 3, 10, 12],
      ['Wadenheben stehend', 4, 10, 15],
    ],
  },
  {
    name: 'Schulter & Arme',
    color: 3,
    weekdays: [4],
    exercises: [
      ['Schulterdrücken (Kurzhantel)', 4, 6, 10],
      ['Seitheben (Kurzhantel)', 4, 12, 15],
      ['Reverse Butterfly', 3, 12, 15],
      ['Scottcurls', 3, 8, 12],
      ['French Press (SZ-Stange)', 3, 8, 12],
    ],
  },
];

export async function createSamplePlan(): Promise<void> {
  const byName = new Map((await db.exercises.toArray()).filter((e) => !e.deleted_at).map((e) => [e.name, e.id]));
  const existing = await db.plan_days.count();
  const days: Omit<PlanDay, 'updated_at' | 'dirty' | 'deleted_at'>[] = [];
  const links: Omit<PlanDayExercise, 'updated_at' | 'dirty' | 'deleted_at'>[] = [];
  for (const [i, d] of SAMPLE_PLAN.entries()) {
    const dayId = crypto.randomUUID();
    days.push({ id: dayId, name: d.name, color: d.color, weekdays: d.weekdays, sort: existing + i, archived: false, notes: '' });
    d.exercises.forEach(([exName, sets, min, max], j) => {
      const exId = byName.get(exName);
      if (!exId) return;
      links.push({ id: crypto.randomUUID(), plan_day_id: dayId, exercise_id: exId, sort: j, target_sets: sets, reps_min: min, reps_max: max, rest_sec: null });
    });
  }
  await insertMany<PlanDay>('plan_days', days);
  await insertMany<PlanDayExercise>('plan_day_exercises', links);
}
