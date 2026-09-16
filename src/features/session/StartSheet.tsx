import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { BodyMap } from '@/components/BodyMap';
import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { Button } from '@/components/ui';
import { useAllPlanLinks, useExerciseMap, usePlanDays } from '@/db/queries';
import { weekdayIndex } from '@/domain/calc';
import { loadFromExercises } from '@/domain/muscles';
import { DAY_COLORS, dayColor, type PlanDay } from '@/domain/types';
import { unlockAudio } from '@/lib/sound';
import { useUi } from '@/store/ui';
import { startSession } from './actions';

/** Plantag wählen → Figur zeigt die Muskeln → los. */
export function StartSheet() {
  const { startOpen, setStartOpen, openSession } = useUi();
  const days = usePlanDays();
  const links = useAllPlanLinks();
  const exMap = useExerciseMap();
  const [sel, setSel] = useState<string | 'free' | null>(null);
  const today = weekdayIndex(new Date());

  useEffect(() => {
    if (!startOpen || !days) return;
    setSel(days.find((d) => d.weekdays.includes(today))?.id ?? days[0]?.id ?? 'free');
  }, [startOpen, days, today]);

  const info = useMemo(() => {
    const m = new Map<string, { names: string[]; load: ReturnType<typeof loadFromExercises> }>();
    for (const d of days ?? []) {
      const exs = (links ?? [])
        .filter((l) => l.plan_day_id === d.id)
        .sort((a, b) => a.sort - b.sort)
        .map((l) => exMap?.get(l.exercise_id))
        .filter((e): e is NonNullable<typeof e> => !!e && !e.deleted_at);
      m.set(d.id, { names: exs.map((e) => e.name), load: loadFromExercises(exs) });
    }
    return m;
  }, [days, links, exMap]);

  const chosen: PlanDay | undefined = days?.find((d) => d.id === sel);
  const tint = chosen ? DAY_COLORS[chosen.color % DAY_COLORS.length].rgb : 'var(--acc)';

  const go = async () => {
    unlockAudio();
    await startSession(sel === 'free' ? null : (chosen ?? null));
    setStartOpen(false);
    openSession();
  };

  return (
    <Sheet
      open={startOpen}
      onClose={() => setStartOpen(false)}
      tall
      title="Training starten"
      footer={
        <Button variant="primary" size="lg" icon="play" className="w-full" onClick={go} disabled={!sel}>
          {chosen ? `${chosen.name} starten` : 'Freies Training starten'}
        </Button>
      }
    >
      <div className="relative mx-auto mb-2 mt-1 h-48 w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={sel ?? 'none'}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 flex justify-center"
          >
            <BodyMap load={chosen ? (info.get(chosen.id)?.load ?? {}) : {}} tint={tint} className="h-full" />
          </motion.div>
        </AnimatePresence>
      </div>

      <ul className="space-y-2" role="radiogroup" aria-label="Trainingstag">
        {days?.map((d) => {
          const on = sel === d.id;
          const names = info.get(d.id)?.names ?? [];
          return (
            <li key={d.id}>
              <button
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setSel(d.id)}
                className="press flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors"
                style={{
                  backgroundColor: on ? dayColor(d.color, 0.14) : 'rgb(var(--s2) / 0.6)',
                  boxShadow: on ? `inset 0 0 0 1.5px ${dayColor(d.color, 0.7)}` : undefined,
                }}
              >
                <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: dayColor(d.color) }} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[17px] font-bold">{d.name}</span>
                    {d.weekdays.includes(today) && <span className="text-[11px] font-bold uppercase tracking-wide text-acc">Heute</span>}
                  </span>
                  <span className="block truncate text-[13px] text-mute">{names.length ? names.join(' · ') : 'Keine Übungen'}</span>
                </span>
                {on && <Icon name="check" style={{ color: dayColor(d.color) }} />}
              </button>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            role="radio"
            aria-checked={sel === 'free'}
            onClick={() => setSel('free')}
            className={`press flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left ${sel === 'free' ? 'bg-acc/10 shadow-[inset_0_0_0_1.5px_rgb(var(--acc)/0.6)]' : 'bg-s2/60'}`}
          >
            <span className="h-9 w-1.5 shrink-0 rounded-full bg-s3" />
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-bold">Freies Training</span>
              <span className="block text-[13px] text-mute">Übungen selbst zusammenstellen</span>
            </span>
            {sel === 'free' && <Icon name="check" className="text-acc" />}
          </button>
        </li>
      </ul>
    </Sheet>
  );
}
