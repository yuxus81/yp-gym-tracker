import type { SyncRow } from '@/domain/types';
import { db, type SyncTable } from './dexie';

type Listener = () => void;
const listeners = new Set<Listener>();

/** Der Sync-Motor hört hier zu, um nach Änderungen entprellt abzugleichen. */
export function onLocalWrite(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  for (const fn of listeners) fn();
}

export const nowIso = () => new Date().toISOString();

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  // Fallback für sehr alte WebViews
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

type Insert<T extends SyncRow> = Omit<T, 'updated_at' | 'dirty' | 'deleted_at' | 'id'> & { id?: string };

/** Legt eine Zeile lokal an. Kein Netz im Klickpfad — das Speichern kann nicht am Empfang scheitern. */
export async function insert<T extends SyncRow>(table: SyncTable, row: Insert<T>): Promise<T> {
  const full = { ...row, id: row.id ?? newId(), updated_at: nowIso(), deleted_at: null, dirty: 1 } as unknown as T;
  await db.table(table).put(full);
  notify();
  return full;
}

export async function insertMany<T extends SyncRow>(table: SyncTable, rows: Insert<T>[]): Promise<void> {
  const ts = nowIso();
  const full = rows.map((r) => ({ ...r, id: r.id ?? newId(), updated_at: ts, deleted_at: null, dirty: 1 }));
  await db.table(table).bulkPut(full);
  notify();
}

export async function patch<T extends SyncRow>(
  table: SyncTable,
  id: string,
  changes: Partial<Omit<T, 'id' | 'dirty' | 'updated_at'>>,
): Promise<void> {
  await db.table(table).update(id, { ...changes, updated_at: nowIso(), dirty: 1 });
  notify();
}

/** Löschen = Grabstein. So erfährt auch der Server bzw. ein anderes Gerät davon. */
export async function remove(table: SyncTable, id: string): Promise<void> {
  await patch(table, id, { deleted_at: nowIso() } as never);
}

export async function restore(table: SyncTable, id: string): Promise<void> {
  await patch(table, id, { deleted_at: null } as never);
}

/** Mehrere Änderungen atomar — z. B. Reihenfolge neu setzen. */
export async function patchMany(table: SyncTable, items: { id: string; changes: Record<string, unknown> }[]) {
  const ts = nowIso();
  await db.transaction('rw', db.table(table), async () => {
    for (const it of items) await db.table(table).update(it.id, { ...it.changes, updated_at: ts, dirty: 1 });
  });
  notify();
}

export const alive = <T extends { deleted_at: string | null }>(r: T) => !r.deleted_at;
