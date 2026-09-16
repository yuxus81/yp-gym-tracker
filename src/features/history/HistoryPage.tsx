import { addDays, format, startOfDay, startOfWeek, subDays, subMonths, subYears } from 'date-fns';
import { de } from 'date-fns/locale';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { Chip, Empty, PageHeader } from '@/components/ui';
import { useAllDoneSets, useExerciseMap, useFinishedSessions, usePlanDays } from '@/db/queries';
import { formatDuration, formatKg, formatVolume, oneRepMax, setVolume } from '@/domain/calc';
import { DAY_COLORS, dayColor, type Session, type SessionSet } from '@/domain/types';
import { useUi } from '@/store/ui';
import { ExerciseProgress } from './ExerciseProgress';

const RANGES = [
  { id: 'all', label: 'Alle' },
  { id: '7', label: '7 Tage' },
  { id: '30', label: '30 Tage' },
  { id: '90', label: '3 Monate' },
  { id: '365', label: 'Jahr' },
] as const;

type RangeId = (typeof RANGES)[number]['id'];

function rangeStart(r: RangeId): number {
  const now = new Date();
  switch (r) {
    case '7':
      return subDays(startOfDay(now), 6).getTime();
    case '30':
      return subDays(startOfDay(now), 29).getTime();
    case '90':
      return subMonths(now, 3).getTime();
    case '365':
      return subYears(now, 1).getTime();
    default:
      return 0;
  }
}

export function HistoryPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('ansicht') === 'uebungen' ? 'exercises' : 'sessions';
  const setTab = (t: 'sessions' | 'exercises') => setParams(t === 'exercises' ? { ansicht: 'uebungen' } : {}, { replace: true });

  return (
    <div className="pb-6">
      <PageHeader title="Verlauf" />
      <div className="px-4">
        <div className="relative grid grid-cols-2 rounded-xl bg-s1 p-1 hairline" role="tablist">
          {(['sessions', 'exercises'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`relative z-10 h-9 rounded-lg text-[14px] font-semibold transition-colors ${tab === t ? 'text-fg' : 'text-mute'}`}
            >
              {tab === t && (
                <motion.span layoutId="hist-tab" className="absolute inset-0 -z-10 rounded-lg bg-s3" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />
              )}
              {t === 'sessions' ? 'Sessions' : 'Übungen'}
            </button>
          ))}
        </div>
      </div>
      {tab === 'sessions' ? <SessionsView /> : <ExerciseProgress />}
    </div>
  );
}

function SessionsView() {
  const nav = useNavigate();
  const sessions = useFinishedSessions();
  const sets = useAllDoneSets();
  const days = usePlanDays(true);
  const exMap = useExerciseMap();
  const { setStartOpen } = useUi();
  const [picked, setPicked] = useState<string[]>([]);
  const [range, setRange] = useState<RangeId>('all');

  // Filter-Chips: aktuelle Plantage + Tage, die nur noch in alten Sessions vorkommen
  const dayOptions = useMemo(() => {
    const opts = new Map<string, { key: string; name: string; color: number }>();
    for (const d of days ?? []) if (!d.deleted_at) opts.set(d.id, { key: d.id, name: d.name, color: d.color });
    for (const s of sessions ?? []) {
      const key = s.plan_day_id ?? 'free';
      if (!opts.has(key)) opts.set(key, { key, name: s.plan_day_id ? s.name : 'Freies Training', color: s.plan_day_id ? s.color : -1 });
    }
    return [...opts.values()].filter((o) => (sessions ?? []).some((s) => (s.plan_day_id ?? 'free') === o.key));
  }, [days, sessions]);

  const setsBySession = useMemo(() => {
    const m = new Map<string, SessionSet[]>();
    for (const s of sets ?? []) {
      const a = m.get(s.session_id) ?? [];
      a.push(s);
      m.set(s.session_id, a);
    }
    return m;
  }, [sets]);

  const filtered = useMemo(() => {
    const from = rangeStart(range);
    return (sessions ?? []).filter(
      (s) => Date.parse(s.started_at) >= from && (picked.length === 0 || picked.includes(s.plan_day_id ?? 'free')),
    );
  }, [sessions, picked, range]);

  const totals = useMemo(() => {
    let dur = 0;
    let vol = 0;
    for (const s of filtered) {
      dur += Date.parse(s.ended_at!) - Date.parse(s.started_at);
      for (const x of setsBySession.get(s.id) ?? []) vol += setVolume(x);
    }
    return { dur, vol };
  }, [filtered, setsBySession]);

  const groups = useMemo(() => {
    const g: { key: string; label: string; items: Session[] }[] = [];
    for (const s of filtered) {
      const d = new Date(s.started_at);
      const key = format(d, 'yyyy-MM');
      let grp = g[g.length - 1];
      if (!grp || grp.key !== key) {
        grp = { key, label: format(d, 'MMMM yyyy', { locale: de }), items: [] };
        g.push(grp);
      }
      grp.items.push(s);
    }
    return g;
  }, [filtered]);

  const toggle = (k: string) => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  if (sessions && sessions.length === 0) {
    return (
      <Empty
        icon="history"
        title="Noch keine Sessions"
        text="Sobald du ein Training beendest, taucht es hier auf — mit Dauer, Volumen und allen Sätzen."
        action={
          <button type="button" onClick={() => setStartOpen(true)} className="press h-12 rounded-xl bg-acc px-5 font-semibold text-onacc">
            Training starten
          </button>
        }
      />
    );
  }

  return (
    <>
      <Heatmap sessions={sessions ?? []} />

      <div className="scroller mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip active={picked.length === 0} onClick={() => setPicked([])}>
          Alle
        </Chip>
        {dayOptions.map((o) => (
          <Chip key={o.key} active={picked.includes(o.key)} onClick={() => toggle(o.key)} tint={o.color >= 0 ? DAY_COLORS[o.color % DAY_COLORS.length].rgb : undefined}>
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: o.color >= 0 ? dayColor(o.color) : 'rgb(var(--mute))' }} />
            {o.name}
          </Chip>
        ))}
      </div>
      <div className="scroller mt-2 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            aria-pressed={range === r.id}
            onClick={() => setRange(r.id)}
            className={`press h-8 shrink-0 rounded-lg px-3 text-[13px] font-semibold ${range === r.id ? 'bg-fg text-bg' : 'text-mute'}`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="mx-4 mt-3 grid grid-cols-3 rounded-2xl bg-s1 py-3 hairline">
        <Total label="Sessions" value={String(filtered.length)} />
        <Total label="Zeit" value={totals.dur ? formatDuration(totals.dur) : '–'} />
        <Total label="Volumen" value={totals.vol ? formatVolume(totals.vol) : '–'} />
      </div>

      {filtered.length === 0 && <p className="px-8 py-10 text-center text-[15px] text-mute">Keine Sessions für diesen Filter.</p>}

      <AnimatePresence initial={false}>
        {groups.map((g) => (
          <motion.section key={g.key} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4">
            <h2 className="mb-2 mt-5 px-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-dim">{g.label}</h2>
            <ul className="space-y-2">
              {g.items.map((s) => (
                <SessionCard key={s.id} session={s} sets={setsBySession.get(s.id) ?? []} names={exMap} onOpen={() => nav(`/verlauf/${s.id}`)} />
              ))}
            </ul>
          </motion.section>
        ))}
      </AnimatePresence>
    </>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="num text-[19px] font-bold leading-tight">{value}</div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-dim">{label}</div>
    </div>
  );
}

function SessionCard({
  session,
  sets,
  names,
  onOpen,
}: {
  session: Session;
  sets: SessionSet[];
  names?: Map<string, { name: string }>;
  onOpen: () => void;
}) {
  const d = new Date(session.started_at);
  const dur = Date.parse(session.ended_at!) - Date.parse(session.started_at);
  const work = sets.filter((s) => s.kind !== 'warmup');
  const vol = sets.reduce((a, s) => a + setVolume(s), 0);
  const best = work.reduce<SessionSet | null>(
    (a, s) => (!a || oneRepMax(s.weight ?? 0, s.reps ?? 0) > oneRepMax(a.weight ?? 0, a.reps ?? 0) ? s : a),
    null,
  );
  const hasDrops = sets.some((s) => s.kind === 'drop');

  return (
    <motion.li layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <button type="button" onClick={onOpen} className="press flex w-full items-stretch gap-3 rounded-2xl bg-s1 p-3 text-left hairline">
        <span className="flex w-12 shrink-0 flex-col items-center justify-center rounded-xl" style={{ backgroundColor: dayColor(session.color, 0.14) }}>
          <span className="text-[11px] font-semibold uppercase" style={{ color: dayColor(session.color) }}>
            {format(d, 'EEE', { locale: de }).replace('.', '')}
          </span>
          <span className="num text-[20px] font-bold leading-none">{format(d, 'd')}</span>
        </span>
        <span className="min-w-0 flex-1 py-0.5">
          <span className="flex items-center gap-2">
            <span className="truncate text-[16px] font-semibold">{session.name}</span>
            {hasDrops && <span className="shrink-0 rounded bg-acc/15 px-1.5 text-[10px] font-bold text-acc">DROP</span>}
          </span>
          <span className="num mt-0.5 flex flex-wrap gap-x-3 text-[13px] text-mute">
            <span className="inline-flex items-center gap-1">
              <Icon name="timer" size={13} />
              {formatDuration(dur)}
            </span>
            <span>{work.length} Sätze</span>
            <span>{formatVolume(vol)}</span>
          </span>
          {best && (
            <span className="mt-1 block truncate text-[12px] text-dim">
              Top: {names?.get(best.exercise_id)?.name} · <span className="num">{formatKg(best.weight)} kg × {best.reps}</span>
            </span>
          )}
        </span>
        <Icon name="chevronRight" size={18} className="self-center text-dim" />
      </button>
    </motion.li>
  );
}

/** Die letzten 18 Wochen als Kalender-Raster, eingefärbt nach Plantag. */
function Heatmap({ sessions }: { sessions: Session[] }) {
  const WEEKS = 18;
  const end = startOfWeek(new Date(), { weekStartsOn: 1 });
  const start = addDays(end, -7 * (WEEKS - 1));
  const byDay = new Map<string, Session>();
  for (const s of sessions) byDay.set(format(new Date(s.started_at), 'yyyy-MM-dd'), s);
  const today = startOfDay(new Date()).getTime();

  return (
    <div className="mx-4 mt-4 rounded-2xl bg-s1 p-3 hairline">
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))` }} aria-label="Trainingskalender der letzten 18 Wochen" role="img">
        {Array.from({ length: WEEKS }).map((_, w) => (
          <div key={w} className="grid grid-rows-7 gap-[3px]">
            {Array.from({ length: 7 }).map((__, d) => {
              const day = addDays(start, w * 7 + d);
              const s = byDay.get(format(day, 'yyyy-MM-dd'));
              const future = day.getTime() > today;
              return (
                <motion.span
                  key={d}
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: future ? 0.25 : 1, scale: 1 }}
                  transition={{ delay: w * 0.012 + d * 0.004 }}
                  className="aspect-square rounded-[3px]"
                  style={{ backgroundColor: s ? dayColor(s.color) : 'rgb(var(--s2))' }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-dim">
        <span>{format(start, 'd. MMM', { locale: de })}</span>
        <span>heute</span>
      </div>
    </div>
  );
}
