import { motion } from 'motion/react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BodyMap } from '@/components/BodyMap';
import { Icon } from '@/components/Icon';
import { Button, Empty, SectionTitle } from '@/components/ui';
import { useAllPlanLinks, useExerciseMap, useExercises, usePlanDays } from '@/db/queries';
import { insert } from '@/db/repo';
import { loadFromAreas } from '@/domain/muscles';
import { dayColor, DAY_COLORS, WEEKDAYS, type PlanDay } from '@/domain/types';
import { weekdayIndex } from '@/domain/calc';
import { NEW_DAY_NAME } from './PlanDayEditor';

/** Trainingsplan als Abschnitt der Home-Seite (weiter unten beim Scrollen). */
export function PlanSection() {
  const days = usePlanDays();
  const links = useAllPlanLinks();
  const exMap = useExerciseMap();
  const exercises = useExercises();
  const nav = useNavigate();
  const today = weekdayIndex(new Date());

  const stats = useMemo(() => {
    const m = new Map<string, { count: number; sets: number }>();
    for (const d of days ?? []) {
      const ls = (links ?? []).filter((l) => l.plan_day_id === d.id && !!exMap?.get(l.exercise_id) && !exMap.get(l.exercise_id)!.deleted_at);
      m.set(d.id, { count: ls.length, sets: ls.reduce((a, l) => a + l.target_sets, 0) });
    }
    return m;
  }, [days, links, exMap]);

  const addDay = async () => {
    const d = await insert<PlanDay>('plan_days', {
      name: NEW_DAY_NAME,
      color: (days?.length ?? 0) % DAY_COLORS.length,
      weekdays: [],
      sort: days?.length ?? 0,
      archived: false,
      notes: '',
      areas: [],
    });
    nav(`/plan/${d.id}?neu=1`);
  };

  return (
    <section id="plan" className="scroll-mt-4 pb-6">
      <div className="px-4">
        <SectionTitle
          right={
            days && days.length > 0 ? (
              <button type="button" onClick={addDay} className="press -my-2 flex h-11 items-center gap-1 px-1 text-[14px] font-semibold text-acc">
                <Icon name="plus" size={18} strokeWidth={2.5} /> Tag
              </button>
            ) : undefined
          }
        >
          {days?.length ? `Mein Plan · ${days.length} ${days.length === 1 ? 'Tag' : 'Tage'}` : 'Mein Plan'}
        </SectionTitle>
        {days && days.length === 0 && (
          <Empty
            icon="plan"
            title="Noch kein Trainingsplan"
            text="Lege deine Trainingstage an — z. B. „Rücken“ — tippe die Bereiche an und schreib deine Übungen dazu."
            action={
              <Button variant="primary" icon="plus" onClick={addDay}>
                Ersten Tag anlegen
              </Button>
            }
          />
        )}

        <ul className="space-y-3">
          {days?.map((d, i) => {
            const s = stats.get(d.id);
            const isToday = d.weekdays.includes(today);
            return (
              <motion.li
                key={d.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, type: 'spring', stiffness: 400, damping: 34 }}
              >
                <button
                  type="button"
                  onClick={() => nav(`/plan/${d.id}`)}
                  className="press relative flex w-full items-stretch overflow-hidden rounded-2xl bg-s1 text-left hairline"
                >
                  <span className="w-1.5 shrink-0" style={{ backgroundColor: dayColor(d.color) }} />
                  <span className="flex min-w-0 flex-1 flex-col justify-between gap-3 py-4 pl-4">
                    <span>
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[19px] font-bold tracking-tight">{d.name}</span>
                        {isToday && <span className="shrink-0 rounded-full bg-acc/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-acc">Heute</span>}
                      </span>
                      <span className="mt-1 block text-[14px] text-mute">
                        {s?.count ?? 0} Übungen · {s?.sets ?? 0} Sätze
                      </span>
                    </span>
                    <span className="flex gap-1">
                      {WEEKDAYS.map((w, wi) => {
                        const on = d.weekdays.includes(wi);
                        return (
                          <span
                            key={w}
                            className={`grid h-7 w-7 place-items-center rounded-full text-[11px] font-semibold ${on ? '' : 'text-dim'}`}
                            style={on ? { backgroundColor: dayColor(d.color, 0.2), color: dayColor(d.color) } : undefined}
                          >
                            {w}
                          </span>
                        );
                      })}
                    </span>
                  </span>
                  <span className="flex w-[104px] shrink-0 items-center justify-center pr-2">
                    <BodyMap load={loadFromAreas(d.areas)} tint={DAY_COLORS[d.color % DAY_COLORS.length].rgb} className="h-[92px] w-[96px]" />
                  </span>
                </button>
              </motion.li>
            );
          })}
        </ul>

        {days && days.length > 0 && (
          <>
            <button type="button" onClick={() => nav('/bibliothek')} className="press mt-3 flex h-14 w-full items-center gap-3 rounded-2xl bg-s1 px-4 text-left hairline">
              <Icon name="dumbbell" className="text-mute" />
              <span className="flex-1 font-medium">Alle Übungen</span>
              <span className="num text-mute">{exercises?.length ?? ''}</span>
              <Icon name="chevronRight" size={18} className="text-dim" />
            </button>
          </>
        )}
      </div>
    </section>
  );
}
