import { create } from 'zustand';
import { db, getMeta, setMeta, SYNC_TABLES, type SyncTable } from '@/db/dexie';
import { onLocalWrite } from '@/db/repo';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth';
import type { SyncRow } from '@/domain/types';
import { mergeIncoming, nextCursor, stillSame, toRemote } from './merge';
import { seedIfEmpty } from '@/data/seed';

type Phase = 'idle' | 'syncing' | 'offline' | 'error' | 'device';

interface SyncState {
  phase: Phase;
  lastSyncedAt: number | null;
  error: string | null;
}

export const useSync = create<SyncState>(() => ({ phase: 'idle', lastSyncedAt: null, error: null }));

const PUSH_CHUNK = 200;
const PULL_PAGE = 1000;
const EPOCH = '1970-01-01T00:00:00Z';

let running = false;
let queued = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let failures = 0;

async function push(table: SyncTable) {
  if (!supabase) return;
  const t = db.table<SyncRow, string>(table);
  for (;;) {
    const rows = await t.where('dirty').equals(1).limit(PUSH_CHUNK).toArray();
    if (rows.length === 0) return;
    const { error } = await supabase.from(table).upsert(rows.map(toRemote), { onConflict: 'id' });
    if (error) throw new Error(`${table}: ${error.message}`);
    // Nur bestätigen, was sich während des Uploads nicht erneut geändert hat.
    let cleared = 0;
    await db.transaction('rw', t, async () => {
      for (const r of rows) {
        const cur = await t.get(r.id);
        if (stillSame(r.updated_at, cur)) {
          await t.update(r.id, { dirty: 0 });
          cleared++;
        }
      }
    });
    if (cleared === 0) return; // alles wurde parallel geändert → nächste Runde erledigt es
  }
}

async function pull(table: SyncTable) {
  if (!supabase) return;
  const key = `cursor:${table}`;
  let cursor = (await getMeta<string>(key)) ?? EPOCH;
  const t = db.table<SyncRow, string>(table);
  // Beim ersten Abruf 2 Minuten Überlappung: Zeilen, die ein anderes Gerät kurz vor dem
  // letzten Cursor geschrieben, aber später bestätigt hat, gehen so nicht verloren.
  let from = cursor === EPOCH ? EPOCH : new Date(Date.parse(cursor) - 120_000).toISOString();
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .gt('updated_at', from)
      .order('updated_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(PULL_PAGE);
    if (error) throw new Error(`${table}: ${error.message}`);
    const rows = (data ?? []) as (Record<string, unknown> & { id: string; updated_at: string })[];
    if (rows.length === 0) return;
    await db.transaction('rw', t, async () => {
      for (const r of rows) {
        const merged = mergeIncoming(await t.get(r.id), r);
        if (merged) await t.put(merged);
      }
    });
    const full = rows.length === PULL_PAGE;
    const candidate = nextCursor(rows, full, cursor);
    const next = candidate > cursor ? candidate : cursor;
    await setMeta(key, next);
    if (!full || next === cursor) return;
    cursor = next;
    from = next;
  }
}

async function runOnce() {
  const auth = useAuth.getState();
  if (auth.status === 'device') {
    useSync.setState({ phase: 'device' });
    return;
  }
  if (!supabase || auth.status !== 'signedIn') return;
  if (!navigator.onLine) {
    useSync.setState({ phase: 'offline' });
    return;
  }
  const { data } = await supabase.auth.getSession();
  if (!data.session) return; // Token wird erneuert, sobald Netz stabil ist

  useSync.setState({ phase: 'syncing' });
  for (const table of SYNC_TABLES) await push(table);
  for (const table of SYNC_TABLES) await pull(table);
  await seedIfEmpty();
  // Frisch angelegte Start-Übungen gleich mit hochladen.
  for (const table of SYNC_TABLES) await push(table);
  failures = 0;
  useSync.setState({ phase: 'idle', lastSyncedAt: Date.now(), error: null });
}

export async function syncNow(): Promise<void> {
  if (running) {
    queued = true;
    return;
  }
  running = true;
  try {
    await runOnce();
  } catch (e) {
    failures++;
    const msg = e instanceof Error ? e.message : String(e);
    const offline = !navigator.onLine || /fetch|network|load failed/i.test(msg);
    useSync.setState({ phase: offline ? 'offline' : 'error', error: offline ? null : msg });
    // Daten bleiben dirty; später erneut versuchen (max. 5 Minuten Abstand).
    schedule(Math.min(300_000, 5000 * 2 ** Math.min(failures, 6)));
  } finally {
    running = false;
    if (queued) {
      queued = false;
      schedule(500);
    }
  }
}

export function schedule(ms = 2000) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void syncNow();
  }, ms);
}

let started = false;
export function startSync() {
  if (started) return;
  started = true;

  void (async () => {
    if (useAuth.getState().status === 'device') {
      await seedIfEmpty();
      useSync.setState({ phase: 'device' });
    }
    void syncNow();
  })();

  onLocalWrite(() => schedule(2000));
  window.addEventListener('online', () => schedule(300));
  window.addEventListener('offline', () => useSync.setState({ phase: 'offline' }));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') schedule(300);
  });
  setInterval(() => {
    if (document.visibilityState === 'visible') void syncNow();
  }, 60_000);
  useAuth.subscribe((s, prev) => {
    if (s.status === 'signedIn' && prev.status !== 'signedIn') schedule(100);
  });

  // Browser bitten, die lokalen Daten nicht bei Platzmangel zu löschen.
  void navigator.storage?.persist?.().catch(() => false);
}
