import { db } from '@/db/dexie';
import { insert, insertMany, nowIso, patch, patchMany, remove } from '@/db/repo';
import { getActiveSession, lastSetsFor } from '@/db/queries';
import { oneRepMax } from '@/domain/calc';
import type { PlanDay, Session, SessionSet, SetKind } from '@/domain/types';

export async function startSession(day: PlanDay | null): Promise<Session> {
  const active = await getActiveSession();
  if (active) return active;
  let exerciseIds: string[] = [];
  if (day) {
    const links = (await db.plan_day_exercises.where('plan_day_id').equals(day.id).toArray())
      .filter((l) => !l.deleted_at)
      .sort((a, b) => a.sort - b.sort);
    exerciseIds = links.map((l) => l.exercise_id);
  }
  return insert<Session>('sessions', {
    plan_day_id: day?.id ?? null,
    name: day?.name ?? 'Freies Training',
    color: day?.color ?? 0,
    started_at: nowIso(),
    ended_at: null,
    exercise_ids: exerciseIds,
    areas: day?.areas ?? [],
    notes: '',
    energy: null,
    bodyweight: null,
  });
}

/** Beim ersten Öffnen einer Übung: Zielanzahl Sätze anlegen, Satzarten vom letzten Mal übernehmen. */
const ensuring = new Map<string, Promise<void>>();

export function ensureSets(session: Session, exerciseId: string): Promise<void> {
  // Doppelte Aufrufe (StrictMode, schnelles Tippen) dürfen nicht doppelt anlegen.
  const key = `${session.id}:${exerciseId}`;
  const running = ensuring.get(key);
  if (running) return running;
  const p = createInitialSets(session, exerciseId).finally(() => ensuring.delete(key));
  ensuring.set(key, p);
  return p;
}

async function createInitialSets(session: Session, exerciseId: string): Promise<void> {
  const existing = await db.session_sets.where('session_id').equals(session.id).filter((s) => s.exercise_id === exerciseId).count();
  if (existing > 0) return;
  let target = 3;
  if (session.plan_day_id) {
    const link = await db.plan_day_exercises
      .where('plan_day_id')
      .equals(session.plan_day_id)
      .filter((l) => l.exercise_id === exerciseId && !l.deleted_at)
      .first();
    if (link) target = link.target_sets;
  }
  const last = await lastSetsFor(exerciseId, session.id);
  const kinds: SetKind[] = last.length > 0 ? last.map((s) => s.kind) : Array(target).fill('working');
  while (kinds.length < target) kinds.push('working');
  await insertMany<SessionSet>(
    'session_sets',
    kinds.map((kind, i) => ({
      session_id: session.id,
      exercise_id: exerciseId,
      set_index: i,
      kind,
      weight: null,
      reps: null,
      rpe: null,
      drops: [],
      done_at: null,
    })),
  );
}

export async function addSet(sessionId: string, exerciseId: string, sets: SessionSet[], kind: SetKind = 'working') {
  const prev = sets[sets.length - 1];
  await insert<SessionSet>('session_sets', {
    session_id: sessionId,
    exercise_id: exerciseId,
    set_index: prev ? prev.set_index + 1 : 0,
    kind,
    weight: prev?.weight ?? null,
    reps: null,
    rpe: null,
    drops: [],
    done_at: null,
  });
}

export async function addExerciseToSession(session: Session, exerciseId: string) {
  if (session.exercise_ids.includes(exerciseId)) return;
  await patch<Session>('sessions', session.id, { exercise_ids: [...session.exercise_ids, exerciseId] });
}

export async function removeExerciseFromSession(session: Session, exerciseId: string) {
  const sets = await db.session_sets.where('session_id').equals(session.id).filter((s) => s.exercise_id === exerciseId).toArray();
  for (const s of sets) await remove('session_sets', s.id);
  await patch<Session>('sessions', session.id, { exercise_ids: session.exercise_ids.filter((id) => id !== exerciseId) });
}

export async function moveExercise(session: Session, exerciseId: string, dir: -1 | 1) {
  const ids = [...session.exercise_ids];
  const i = ids.indexOf(exerciseId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await patch<Session>('sessions', session.id, { exercise_ids: ids });
}

/** Bester bisheriger 1RM-Schätzwert einer Übung, ohne die angegebene Session. */
export async function previousBest(exerciseId: string, excludeSessionId: string): Promise<{ e1rm: number; weight: number }> {
  const sets = await db.session_sets
    .where('exercise_id')
    .equals(exerciseId)
    .filter((s) => !s.deleted_at && !!s.done_at && s.session_id !== excludeSessionId && s.kind !== 'warmup')
    .toArray();
  let e1rm = 0;
  let weight = 0;
  for (const s of sets) {
    e1rm = Math.max(e1rm, oneRepMax(s.weight ?? 0, s.reps ?? 0));
    weight = Math.max(weight, s.weight ?? 0);
  }
  return { e1rm, weight };
}

/**
 * Satz abhaken. Leere Felder übernehmen die Geisterwerte vom letzten Mal.
 * Rückgabe: true, wenn das ein neuer Rekord ist.
 */
export async function completeSet(set: SessionSet, ghost: { weight: number | null; reps: number | null } | undefined): Promise<boolean> {
  const weight = set.weight ?? ghost?.weight ?? null;
  const reps = set.reps ?? ghost?.reps ?? null;
  await patch<SessionSet>('session_sets', set.id, { weight, reps, done_at: nowIso() });
  if (set.kind === 'warmup' || !weight || !reps) return false;
  const best = await previousBest(set.exercise_id, set.session_id);
  if (best.e1rm <= 0) return false; // erstes Mal ist kein Rekord
  // Auch in dieser Session schon übertroffen? Dann nicht jedes Mal feiern.
  const sameSession = await db.session_sets
    .where('session_id')
    .equals(set.session_id)
    .filter((s) => s.id !== set.id && s.exercise_id === set.exercise_id && !!s.done_at && !s.deleted_at && s.kind !== 'warmup')
    .toArray();
  const sessionBest = Math.max(0, ...sameSession.map((s) => oneRepMax(s.weight ?? 0, s.reps ?? 0)));
  const mine = oneRepMax(weight, reps);
  return mine > best.e1rm + 0.01 && mine > sessionBest + 0.01;
}

export async function uncompleteSet(set: SessionSet) {
  await patch<SessionSet>('session_sets', set.id, { done_at: null });
}

export async function finishSession(session: Session) {
  // Nicht abgehakte Sätze zählen nicht — weg damit, damit der Verlauf sauber bleibt.
  const sets = await db.session_sets.where('session_id').equals(session.id).toArray();
  for (const s of sets) if (!s.done_at && !s.deleted_at) await remove('session_sets', s.id);
  const used = new Set(sets.filter((s) => s.done_at && !s.deleted_at).map((s) => s.exercise_id));
  await patch<Session>('sessions', session.id, {
    ended_at: nowIso(),
    exercise_ids: session.exercise_ids.filter((id) => used.has(id)),
  });
}

export async function discardSession(session: Session) {
  const sets = await db.session_sets.where('session_id').equals(session.id).toArray();
  for (const s of sets) if (!s.deleted_at) await remove('session_sets', s.id);
  await remove('sessions', session.id);
}

export async function deleteSession(sessionId: string): Promise<() => Promise<void>> {
  const sets = (await db.session_sets.where('session_id').equals(sessionId).toArray()).filter((s) => !s.deleted_at);
  const ts = nowIso();
  await patchMany('session_sets', sets.map((s) => ({ id: s.id, changes: { deleted_at: ts } })));
  await remove('sessions', sessionId);
  return async () => {
    await patchMany('session_sets', sets.map((s) => ({ id: s.id, changes: { deleted_at: null } })));
    await patch('sessions', sessionId, { deleted_at: null } as never);
  };
}

