import Dexie, { type Table } from 'dexie';
import type { Exercise, PlanDay, PlanDayExercise, Session, SessionSet } from '@/domain/types';

export interface MetaRow {
  key: string;
  value: unknown;
}

/**
 * Die eigentliche Datenbank der App. Die Oberfläche liest und schreibt nur hier;
 * Supabase ist Abgleich und Backup (siehe src/sync/sync.ts).
 */
class GymDB extends Dexie {
  exercises!: Table<Exercise, string>;
  plan_days!: Table<PlanDay, string>;
  plan_day_exercises!: Table<PlanDayExercise, string>;
  sessions!: Table<Session, string>;
  session_sets!: Table<SessionSet, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    // Interner Name aus der Entwicklungszeit — bleibt, damit vorhandene lokale Daten erhalten bleiben.
    super('kraftbuch');
    this.version(1).stores({
      exercises: 'id, dirty, name',
      plan_days: 'id, dirty, sort',
      plan_day_exercises: 'id, dirty, plan_day_id, exercise_id',
      sessions: 'id, dirty, started_at, plan_day_id',
      session_sets: 'id, dirty, session_id, exercise_id',
      meta: 'key',
    });
    // Umbau 16.09.2026: Plantage und Sessions tragen grobe Körperbereiche.
    this.version(2).stores({}).upgrade(async (tx) => {
      await tx.table('plan_days').toCollection().modify((d) => {
        d.areas ??= [];
      });
      await tx.table('sessions').toCollection().modify((s) => {
        s.areas ??= [];
      });
    });
  }
}

export const db = new GymDB();

/** Reihenfolge = Eltern vor Kindern (wichtig für den Upload). */
export const SYNC_TABLES = ['exercises', 'plan_days', 'plan_day_exercises', 'sessions', 'session_sets'] as const;
export type SyncTable = (typeof SYNC_TABLES)[number];

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value });
}

export async function clearAll(): Promise<void> {
  await db.transaction('rw', [...SYNC_TABLES.map((t) => db.table(t)), db.meta], async () => {
    for (const t of SYNC_TABLES) await db.table(t).clear();
    await db.meta.clear();
  });
}

export async function countDirty(): Promise<number> {
  let n = 0;
  for (const t of SYNC_TABLES) n += await db.table(t).where('dirty').equals(1).count();
  return n;
}
