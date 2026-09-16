import { describe, expect, it } from 'vitest';
import { mergeIncoming, nextCursor, stillSame, toRemote } from './merge';

const base = { id: 'a', updated_at: '2026-09-16T10:00:00Z', deleted_at: null, name: 'x' };

describe('mergeIncoming', () => {
  it('lokal ungesichert gewinnt', () => {
    expect(mergeIncoming({ ...base, dirty: 1 as const }, { ...base, name: 'server' })).toBeNull();
  });

  it('sonst übernimmt der Server, user_id fliegt raus', () => {
    const r = mergeIncoming({ ...base, dirty: 0 as const }, { ...base, name: 'server', user_id: 'u1' });
    expect(r).toEqual({ ...base, name: 'server', dirty: 0 });
  });

  it('neue Zeile vom Server wird angelegt', () => {
    expect(mergeIncoming(undefined, { ...base })).toEqual({ ...base, dirty: 0 });
  });

  it('Grabstein vom Server wird übernommen', () => {
    const r = mergeIncoming({ ...base, dirty: 0 as const }, { ...base, deleted_at: '2026-09-16T11:00:00Z' });
    expect(r?.deleted_at).toBe('2026-09-16T11:00:00Z');
  });
});

describe('nextCursor', () => {
  const rows = (...ts: string[]) => ts.map((updated_at) => ({ updated_at }));

  it('leere Seite lässt Cursor stehen', () => {
    expect(nextCursor([], false, 'p')).toBe('p');
  });

  it('nicht volle Seite: letzter Zeitstempel', () => {
    expect(nextCursor(rows('1', '2', '3'), false, 'p')).toBe('3');
  });

  it('volle Seite: Cursor bleibt vor der letzten Zeitstempel-Gruppe', () => {
    expect(nextCursor(rows('1', '2', '3', '3'), true, 'p')).toBe('2');
  });
});

describe('Upload-Bestätigung', () => {
  it('nur unveränderte Zeilen werden sauber', () => {
    expect(stillSame('t1', { updated_at: 't1' })).toBe(true);
    expect(stillSame('t1', { updated_at: 't2' })).toBe(false);
    expect(stillSame('t1', undefined)).toBe(false);
  });

  it('doppelter Upload ist idempotent (gleiche Nutzlast)', () => {
    const row = { ...base, dirty: 1 as const };
    expect(toRemote(row)).toEqual(toRemote({ ...row }));
    expect('dirty' in toRemote(row)).toBe(false);
  });
});
