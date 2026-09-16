import { useLiveQuery } from 'dexie-react-hooks';
import { db, SYNC_TABLES } from './dexie';
import type { Exercise, PlanDay, PlanDayExercise, Session, SessionSet } from '@/domain/types';

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'de');

export function usePlanDays(includeArchived = false): PlanDay[] | undefined {
  return useLiveQuery(async () => {
    const rows = await db.plan_days.orderBy('sort').toArray();
    return rows.filter((d) => !d.deleted_at && (includeArchived || !d.archived));
  }, [includeArchived]);
}

export function usePlanDay(id: string | undefined): PlanDay | undefined | null {
  return useLiveQuery(async () => (id ? ((await db.plan_days.get(id)) ?? null) : null), [id]);
}

export function useExercises(): Exercise[] | undefined {
  return useLiveQuery(async () => (await db.exercises.toArray()).filter((e) => !e.deleted_at).sort(byName));
}

/** Enthält auch gelöschte Übungen — der Verlauf muss alte Namen weiter auflösen können. */
export function useExerciseMap(): Map<string, Exercise> | undefined {
  return useLiveQuery(async () => new Map((await db.exercises.toArray()).map((e) => [e.id, e])));
}

export function usePlanDayExercises(dayId: string | undefined): PlanDayExercise[] | undefined {
  return useLiveQuery(async () => {
    if (!dayId) return [];
    const rows = await db.plan_day_exercises.where('plan_day_id').equals(dayId).toArray();
    return rows.filter((r) => !r.deleted_at).sort((a, b) => a.sort - b.sort);
  }, [dayId]);
}

export function useAllPlanLinks(): PlanDayExercise[] | undefined {
  return useLiveQuery(async () => (await db.plan_day_exercises.toArray()).filter((r) => !r.deleted_at));
}

export async function getActiveSession(): Promise<Session | undefined> {
  const rows = await db.sessions.orderBy('started_at').reverse().toArray();
  return rows.find((s) => !s.deleted_at && !s.ended_at);
}

export function useActiveSession(): Session | null | undefined {
  return useLiveQuery(async () => (await getActiveSession()) ?? null);
}

export function useSession(id: string | undefined): Session | null | undefined {
  return useLiveQuery(async () => (id ? ((await db.sessions.get(id)) ?? null) : null), [id]);
}

export function useFinishedSessions(): Session[] | undefined {
  return useLiveQuery(async () => {
    const rows = await db.sessions.orderBy('started_at').reverse().toArray();
    return rows.filter((s) => !s.deleted_at && s.ended_at);
  });
}

export function useSessionSets(sessionId: string | undefined): SessionSet[] | undefined {
  return useLiveQuery(async () => {
    if (!sessionId) return [];
    const rows = await db.session_sets.where('session_id').equals(sessionId).toArray();
    return rows.filter((r) => !r.deleted_at).sort((a, b) => a.set_index - b.set_index);
  }, [sessionId]);
}

/** Alle abgeschlossenen Sätze (für Verlauf, Rekorde, Wochen-Muskeln). */
export function useAllDoneSets(): SessionSet[] | undefined {
  return useLiveQuery(async () => (await db.session_sets.toArray()).filter((s) => !s.deleted_at && s.done_at));
}

/** Sätze einer Übung aus der letzten *anderen* Session — für die Geisterzahlen. */
export async function lastSetsFor(exerciseId: string, excludeSessionId: string): Promise<SessionSet[]> {
  const all = (await db.session_sets.where('exercise_id').equals(exerciseId).toArray()).filter(
    (s) => !s.deleted_at && s.done_at && s.session_id !== excludeSessionId,
  );
  if (all.length === 0) return [];
  const sessionIds = [...new Set(all.map((s) => s.session_id))];
  const sessions = (await db.sessions.bulkGet(sessionIds)).filter((s): s is Session => !!s && !s.deleted_at);
  if (sessions.length === 0) return [];
  sessions.sort((a, b) => b.started_at.localeCompare(a.started_at));
  const latest = sessions[0].id;
  return all.filter((s) => s.session_id === latest).sort((a, b) => a.set_index - b.set_index);
}

export function useLastSets(exerciseId: string | undefined, excludeSessionId: string | undefined) {
  return useLiveQuery(
    async () => (exerciseId && excludeSessionId ? lastSetsFor(exerciseId, excludeSessionId) : []),
    [exerciseId, excludeSessionId],
  );
}

export function usePendingCount(): number {
  return (
    useLiveQuery(async () => {
      let n = 0;
      for (const t of SYNC_TABLES) n += await db.table(t).where('dirty').equals(1).count();
      return n;
    }) ?? 0
  );
}
