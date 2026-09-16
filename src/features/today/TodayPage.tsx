import { addDays, format, isSameDay, startOfWeek } from 'date-fns';
import { de } from 'date-fns/locale';
import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BodyMap } from '@/components/BodyMap';
import { Icon } from '@/components/Icon';
import { Logo } from '@/components/Logo';
import { SyncPill } from '@/components/SyncPill';
import { Button, IconButton, SectionTitle } from '@/components/ui';
import { useActiveSession, useAllDoneSets, useAllPlanLinks, useExerciseMap, useFinishedSessions, usePlanDays } from '@/db/queries';
import { formatDuration, formatVolume, setVolume, weekdayIndex } from '@/domain/calc';
import { loadFromExercises, loadFromSetCounts } from '@/domain/muscles';
import { DAY_COLORS, dayColor } from '@/domain/types';
import { useUi } from '@/store/ui';
import { PlanSection } from '../plan/PlanPage';
import { SettingsSheet } from '../settings/SettingsSheet';

function greeting(d: Date) {
  const h = d.getHours();
  if (h < 11) return 'Guten Morgen';
  if (h < 17) return 'Guten Tag';
  return 'Guten Abend';
}

export function TodayPage() {
  const nav = useNavigate();
  const days = usePlanDays();
  const links = useAllPlanLinks();
  const exMap = useExerciseMap();
  const sessions = useFinishedSessions();
  const doneSets = useAllDoneSets();
  const active = useActiveSession();
  const { setStartOpen, openSession } = useUi();
  const [settings, setSettings] = useState(false);

  const now = new Date();
  const todayIdx = weekdayIndex(now);
  const todays = days?.filter((d) => d.weekdays.includes(todayIdx)) ?? [];
  const next = useMemo(() => {
    if (!days?.length) return null;
    for (let i = 1; i <= 7; i++) {
      const idx = (todayIdx + i) % 7;
      const d = days.find((x) => x.weekdays.includes(idx));
      if (d) return { day: d, inDays: i };
    }
    return null;
  }, [days, todayIdx]);

  const featured = todays[0];
  const featuredLoad = useMemo(() => {
    if (!featured) return {};
    const exs = (links ?? [])
      .filter((l) => l.plan_day_id === featured.id)
      .map((l) => exMap?.get(l.exercise_id))
      .filter((e): e is NonNullable<typeof e> => !!e && !e.deleted_at);
    return loadFromExercises(exs);
  }, [featured, links, exMap]);
  const featuredCount = (links ?? []).filter((l) => l.plan_day_id === featured?.id).length;

  // Woche: Montag bis Sonntag
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekSessions = (sessions ?? []).filter((s) => Date.parse(s.started_at) >= weekStart.getTime());

  const weekLoad = useMemo(() => {
    const ids = new Set(weekSessions.map((s) => s.id));
    const counts = new Map<string, number>();
    for (const s of doneSets ?? []) {
      if (!ids.has(s.session_id) || s.kind === 'warmup') continue;
      counts.set(s.exercise_id, (counts.get(s.exercise_id) ?? 0) + 1);
    }
    return loadFromSetCounts(
      [...counts].map(([id, n]) => ({
        primary_muscles: exMap?.get(id)?.primary_muscles ?? [],
        secondary_muscles: exMap?.get(id)?.secondary_muscles ?? [],
        sets: n,
      })),
    );
  }, [weekSessions, doneSets, exMap]);

  const weekVolume = useMemo(() => {
    const ids = new Set(weekSessions.map((s) => s.id));
    return (doneSets ?? []).filter((s) => ids.has(s.session_id)).reduce((a, s) => a + setVolume(s), 0);
  }, [weekSessions, doneSets]);

  const weekDuration = weekSessions.reduce((a, s) => a + (Date.parse(s.ended_at!) - Date.parse(s.started_at)), 0);

  // Serie: Wochen in Folge mit mindestens einem Training
  const streak = useMemo(() => {
    if (!sessions?.length) return 0;
    const weeks = new Set(sessions.map((s) => startOfWeek(new Date(s.started_at), { weekStartsOn: 1 }).getTime()));
    let n = 0;
    let w = weekStart.getTime();
    if (!weeks.has(w)) w = addDays(weekStart, -7).getTime();
    while (weeks.has(w)) {
      n++;
      w = addDays(new Date(w), -7).getTime();
    }
    return n;
  }, [sessions, weekStart]);

  const last = sessions?.[0];
  const tint = featured ? DAY_COLORS[featured.color % DAY_COLORS.length].rgb : 'var(--acc)';

  return (
    <div className="pb-6">
      <header className="flex items-start justify-between gap-3 px-5 pb-2 pt-4">
        <div className="min-w-0">
          <Logo className="mb-3 h-7 w-auto" />
          <div className="text-[13px] font-medium first-letter:uppercase text-mute">{format(now, 'EEEE, d. MMMM', { locale: de })}</div>
          <h1 className="text-[30px] font-bold leading-tight tracking-tight">{greeting(now)}</h1>
          <div className="mt-1.5">
            <SyncPill />
          </div>
        </div>
        <IconButton icon="settings" label="Einstellungen" className="-mr-2 text-mute" onClick={() => setSettings(true)} />
      </header>

      <div className="space-y-3 px-4 pt-2">
        {/* Heute */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="relative overflow-hidden rounded-3xl bg-s1 hairline"
        >
          {featured && <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: dayColor(featured.color) }} />}
          <div className="flex items-center gap-2 p-5 pb-0">
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-dim">{active ? 'Läuft gerade' : featured ? 'Heute dran' : 'Heute'}</div>
              <div className="mt-1 text-[26px] font-bold leading-tight tracking-tight">
                {active ? active.name : featured ? featured.name : days?.length ? 'Ruhetag' : 'Willkommen'}
              </div>
              <div className="mt-1 text-[14px] text-mute">
                {active
                  ? 'Dein Training ist offen.'
                  : featured
                    ? `${featuredCount} Übungen${todays.length > 1 ? ` · +${todays.length - 1} weiterer Tag` : ''}`
                    : days?.length
                      ? next
                        ? `Als Nächstes: ${next.day.name} ${next.inDays === 1 ? 'morgen' : `in ${next.inDays} Tagen`}`
                        : 'Erholung zählt auch.'
                      : 'Leg zuerst deinen Trainingsplan an.'}
              </div>
            </div>
            {featured && !active && <BodyMap load={featuredLoad} tint={tint} className="h-28 w-28 shrink-0" />}
          </div>
          <div className="p-5 pt-4">
            {active ? (
              <Button variant="primary" size="lg" icon="play" className="w-full" onClick={openSession}>
                Weiter trainieren
              </Button>
            ) : days?.length === 0 ? (
              <Button variant="primary" size="lg" icon="plan" className="w-full" onClick={() => document.getElementById('plan')?.scrollIntoView({ behavior: 'smooth' })}>
                Plan anlegen
              </Button>
            ) : (
              <Button variant="primary" size="lg" icon="play" className="w-full" onClick={() => setStartOpen(true)}>
                {featured ? 'Training starten' : 'Trotzdem trainieren'}
              </Button>
            )}
          </div>
        </motion.section>

        {/* Woche */}
        <SectionTitle
          right={
            streak > 0 ? (
              <span className="flex items-center gap-1 text-[13px] font-semibold text-acc">
                <Icon name="flame" size={15} /> {streak} {streak === 1 ? 'Woche' : 'Wochen'} in Folge
              </span>
            ) : undefined
          }
        >
          Diese Woche
        </SectionTitle>
        <section className="rounded-3xl bg-s1 p-4 hairline">
          <div className="grid grid-cols-7 gap-1">
            {week.map((d, i) => {
              const daySessions = weekSessions.filter((s) => isSameDay(new Date(s.started_at), d));
              const isToday = isSameDay(d, now);
              const planned = days?.find((p) => p.weekdays.includes(i));
              const trained = daySessions.length > 0;
              return (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <span className={`text-[11px] font-semibold ${isToday ? 'text-fg' : 'text-dim'}`}>{format(d, 'EEEEEE', { locale: de })}</span>
                  <motion.span
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.05 * i, type: 'spring', stiffness: 500, damping: 24 }}
                    className="num grid h-10 w-10 place-items-center rounded-full text-[14px] font-semibold"
                    style={{
                      backgroundColor: trained ? dayColor(daySessions[0].color) : 'transparent',
                      color: trained ? 'rgb(12 12 13)' : isToday ? 'rgb(var(--fg))' : 'rgb(var(--mute))',
                      boxShadow: !trained && planned ? `inset 0 0 0 1.5px ${dayColor(planned.color, 0.55)}` : isToday && !trained ? 'inset 0 0 0 1.5px rgb(var(--line) / 0.25)' : undefined,
                    }}
                  >
                    {trained ? <Icon name="check" size={18} strokeWidth={3} /> : format(d, 'd')}
                  </motion.span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center gap-4 border-t border-line/5 pt-4">
            <BodyMap load={weekLoad} className="h-28 w-28 shrink-0" label="Diese Woche trainierte Muskeln" />
            <div className="grid flex-1 grid-cols-1 gap-2">
              <Stat label="Trainings" value={String(weekSessions.length)} />
              <Stat label="Zeit" value={weekDuration ? formatDuration(weekDuration) : '–'} />
              <Stat label="Volumen" value={weekVolume ? formatVolume(weekVolume) : '–'} />
            </div>
          </div>
        </section>

        {last && (
          <>
            <SectionTitle>Zuletzt</SectionTitle>
            <button
              type="button"
              onClick={() => nav(`/verlauf/${last.id}`)}
              className="press flex w-full items-center gap-3 rounded-2xl bg-s1 p-4 text-left hairline"
            >
              <span className="h-10 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: dayColor(last.color) }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{last.name}</span>
                <span className="block text-[13px] first-letter:uppercase text-mute">
                  {format(new Date(last.started_at), 'EEEE, d. MMM', { locale: de })} ·{' '}
                  {formatDuration(Date.parse(last.ended_at!) - Date.parse(last.started_at))}
                </span>
              </span>
              <Icon name="chevronRight" size={18} className="text-dim" />
            </button>
          </>
        )}
      </div>

      <PlanSection />

      <SettingsSheet open={settings} onClose={() => setSettings(false)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[13px] text-mute">{label}</span>
      <span className="num text-[17px] font-bold">{value}</span>
    </div>
  );
}
