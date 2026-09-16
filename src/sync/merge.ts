import type { SyncRow } from '@/domain/types';

type Remote = Record<string, unknown> & { id: string; updated_at: string };

/**
 * Entscheidet, was lokal mit einer Server-Zeile passiert.
 * Lokal ungesicherte Änderungen (dirty) gewinnen immer — sie werden beim nächsten
 * Upload ohnehin zum Server geschickt. Sonst übernimmt der Server.
 */
export function mergeIncoming<T extends SyncRow>(local: T | undefined, remote: Remote): T | null {
  if (local && local.dirty === 1) return null;
  const { user_id: _ignored, ...rest } = remote;
  void _ignored;
  return { ...rest, dirty: 0 } as unknown as T;
}

/**
 * Neuer Pull-Cursor. Ist die Seite voll, könnten weitere Zeilen mit exakt demselben
 * Zeitstempel wie die letzte noch fehlen (ein Upload-Paket bekommt serverseitig einen
 * gemeinsamen Zeitstempel). Dann bleibt der Cursor vor dieser Gruppe stehen; doppelt
 * geladene Zeilen schaden nicht.
 */
export function nextCursor(rows: { updated_at: string }[], pageFull: boolean, prev: string): string {
  if (rows.length === 0) return prev;
  const last = rows[rows.length - 1].updated_at;
  if (!pageFull) return last;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i].updated_at !== last) return rows[i].updated_at;
  }
  // Ganze Seite hat denselben Zeitstempel — darf bei Paketgröße < Seitengröße nicht passieren.
  return last;
}

/**
 * Nach erfolgreichem Upload: nur Zeilen als sauber markieren, die sich währenddessen
 * nicht erneut geändert haben.
 */
export function stillSame(sentUpdatedAt: string, current: { updated_at: string } | undefined): boolean {
  return !!current && current.updated_at === sentUpdatedAt;
}

export function toRemote<T extends SyncRow>(row: T): Omit<T, 'dirty'> {
  const { dirty: _d, ...rest } = row;
  void _d;
  return rest;
}
