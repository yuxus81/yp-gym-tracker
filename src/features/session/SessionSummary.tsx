import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'motion/react';
import { BodyMap } from '@/components/BodyMap';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui';
import { db } from '@/db/dexie';
import { useExerciseMap, usePlanDay, useSession, useSessionSets } from '@/db/queries';
import { bestOneRepMax, formatDuration, formatKg, formatVolume, oneRepMax, setVolume } from '@/domain/calc';
import { loadFromAreas, sessionAreas } from '@/domain/muscles';
import { DAY_COLORS } from '@/domain/types';

/** Abschlussbildschirm nach „Beenden". */
export function SessionSummary({ id, onDone }: { id: string; onDone: () => void }) {
  const session = useSession(id);
  const sets = useSessionSets(id);
  const exMap = useExerciseMap();
  const planDay = usePlanDay(session?.plan_day_id ?? undefined);

  // Rekorde: bester Satz je Übung schlägt alles davor
  const records = useLiveQuery(async () => {
    if (!session || !sets) return [];
    const out: { name: string; weight: number; reps: number }[] = [];
    const exIds = [...new Set(sets.map((s) => s.exercise_id))];
    for (const exId of exIds) {
      const mine = sets.filter((s) => s.exercise_id === exId && s.done_at);
      const best = bestOneRepMax(mine);
      if (best <= 0) continue;
      const before = await db.session_sets
        .where('exercise_id')
        .equals(exId)
        .filter((s) => !s.deleted_at && !!s.done_at && s.session_id !== id && s.kind !== 'warmup')
        .toArray();
      const olderSessions = new Map(
        (await db.sessions.bulkGet([...new Set(before.map((s) => s.session_id))]))
          .filter((x): x is NonNullable<typeof x> => !!x && !x.deleted_at && x.started_at < session.started_at)
          .map((x) => [x.id, x]),
      );
      const prev = bestOneRepMax(before.filter((s) => olderSessions.has(s.session_id)));
      if (prev > 0 && best > prev + 0.01) {
        const top = mine.reduce((a, s) => (oneRepMax(s.weight ?? 0, s.reps ?? 0) > oneRepMax(a.weight ?? 0, a.reps ?? 0) ? s : a));
        out.push({ name: exMap?.get(exId)?.name ?? '', weight: top.weight ?? 0, reps: top.reps ?? 0 });
      }
    }
    return out;
  }, [session, sets, exMap]);

  if (!session || !sets) return null;
  const done = sets.filter((s) => s.done_at);
  const volume = done.reduce((a, s) => a + setVolume(s), 0);
  const duration = session.ended_at ? Date.parse(session.ended_at) - Date.parse(session.started_at) : 0;
  const counts = new Map<string, number>();
  for (const s of done) if (s.kind !== 'warmup') counts.set(s.exercise_id, (counts.get(s.exercise_id) ?? 0) + 1);
  const load = counts.size ? loadFromAreas(sessionAreas(session, planDay)) : {};
  const tint = DAY_COLORS[session.color % DAY_COLORS.length].rgb;

  const stats = [
    { label: 'Dauer', value: formatDuration(duration) },
    { label: 'Volumen', value: formatVolume(volume) },
    { label: 'Sätze', value: String(done.filter((s) => s.kind !== 'warmup').length) },
    { label: 'Übungen', value: String(counts.size) },
  ];

  return (
    <div className="flex h-full flex-col bg-bg" style={{ paddingTop: 'var(--safe-top)' }}>
      <div className="scroller min-h-0 flex-1 px-5 pb-6 pt-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 26 }}>
          <div className="text-[13px] font-semibold uppercase tracking-[0.1em] text-acc">Training gespeichert</div>
          <h1 className="mt-1 text-[32px] font-bold leading-tight tracking-tight">{session.name}</h1>
        </motion.div>

        <motion.div
          className="mt-4 flex justify-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 22 }}
        >
          <BodyMap load={load} tint={tint} className="h-56" />
        </motion.div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              className="rounded-2xl bg-s1 p-4 hairline"
            >
              <div className="text-[12px] font-semibold uppercase tracking-wider text-dim">{s.label}</div>
              <div className="num mt-1 text-[26px] font-bold leading-none">{s.value}</div>
            </motion.div>
          ))}
        </div>

        {records && records.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="mt-4 rounded-2xl bg-acc/10 p-4">
            <div className="mb-2 flex items-center gap-2 font-bold text-acc">
              <Icon name="trophy" size={20} /> {records.length === 1 ? 'Neuer Rekord' : `${records.length} neue Rekorde`}
            </div>
            <ul className="space-y-1">
              {records.map((r) => (
                <li key={r.name} className="flex justify-between gap-3 text-[15px]">
                  <span className="truncate">{r.name}</span>
                  <span className="num shrink-0 font-semibold">
                    {formatKg(r.weight)} kg × {r.reps}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>
      <div className="shrink-0 px-5 pt-2" style={{ paddingBottom: 'calc(12px + var(--safe-bottom))' }}>
        <Button variant="primary" size="lg" className="w-full" onClick={onDone}>
          Fertig
        </Button>
      </div>
    </div>
  );
}
