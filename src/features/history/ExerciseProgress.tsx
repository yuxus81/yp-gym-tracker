import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { Chip, Empty } from '@/components/ui';
import { useAllDoneSets, useExerciseMap, useFinishedSessions } from '@/db/queries';
import { formatKg, oneRepMax, setVolume } from '@/domain/calc';
import type { Exercise } from '@/domain/types';

interface Point {
  sessionId: string;
  date: number;
  e1rm: number;
  top: number;
  topReps: number;
  volume: number;
  sets: number;
}

type Metric = 'e1rm' | 'top' | 'volume';
const METRICS: { id: Metric; label: string; unit: string }[] = [
  { id: 'e1rm', label: 'Geschätztes Max', unit: 'kg' },
  { id: 'top', label: 'Schwerster Satz', unit: 'kg' },
  { id: 'volume', label: 'Volumen', unit: 'kg' },
];

function usePointsByExercise() {
  const sets = useAllDoneSets();
  const sessions = useFinishedSessions();
  return useMemo(() => {
    const sMap = new Map((sessions ?? []).map((s) => [s.id, s]));
    const out = new Map<string, Map<string, Point>>();
    for (const s of sets ?? []) {
      const sess = sMap.get(s.session_id);
      if (!sess) continue;
      let byS = out.get(s.exercise_id);
      if (!byS) out.set(s.exercise_id, (byS = new Map()));
      let p = byS.get(sess.id);
      if (!p) byS.set(sess.id, (p = { sessionId: sess.id, date: Date.parse(sess.started_at), e1rm: 0, top: 0, topReps: 0, volume: 0, sets: 0 }));
      p.volume += setVolume(s);
      if (s.kind === 'warmup') continue;
      p.sets++;
      p.e1rm = Math.max(p.e1rm, oneRepMax(s.weight ?? 0, s.reps ?? 0));
      if ((s.weight ?? 0) > p.top || ((s.weight ?? 0) === p.top && (s.reps ?? 0) > p.topReps)) {
        p.top = s.weight ?? 0;
        p.topReps = s.reps ?? 0;
      }
    }
    const sorted = new Map<string, Point[]>();
    for (const [k, v] of out) sorted.set(k, [...v.values()].sort((a, b) => a.date - b.date));
    return sorted;
  }, [sets, sessions]);
}

export function ExerciseProgress() {
  const exMap = useExerciseMap();
  const points = usePointsByExercise();
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      [...points]
        .map(([id, pts]) => ({ id, ex: exMap?.get(id), pts, last: pts[pts.length - 1]?.date ?? 0 }))
        .filter((r): r is { id: string; ex: Exercise; pts: Point[]; last: number } => !!r.ex)
        .sort((a, b) => b.last - a.last),
    [points, exMap],
  );

  if (rows.length === 0) {
    return <Empty icon="chart" title="Noch keine Daten" text="Nach deinen ersten Sessions siehst du hier pro Übung, wie du stärker wirst." />;
  }

  const current = open ? rows.find((r) => r.id === open) : undefined;

  return (
    <div className="px-4 pt-4">
      <ul className="space-y-2">
        {rows.map((r) => {
          const best = Math.max(...r.pts.map((p) => p.e1rm));
          const first = r.pts[0].e1rm;
          const diff = first > 0 ? Math.round(((best - first) / first) * 100) : 0;
          return (
            <li key={r.id}>
              <button type="button" onClick={() => setOpen(r.id)} className="press flex w-full items-center gap-3 rounded-2xl bg-s1 p-3 pl-4 text-left hairline">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{r.ex.name}</span>
                  <span className="block text-[12px] text-mute">
                    {r.pts.length}× · zuletzt {format(r.last, 'd. MMM', { locale: de })}
                  </span>
                </span>
                <Spark values={r.pts.map((p) => p.e1rm)} />
                <span className="w-[68px] shrink-0 text-right">
                  <span className="num block text-[17px] font-bold">{formatKg(Math.round(best * 10) / 10)}</span>
                  <span className={`num block text-[11px] font-semibold ${diff > 0 ? 'text-ok' : 'text-dim'}`}>{diff > 0 ? `+${diff} %` : 'Max'}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <Sheet open={!!current} onClose={() => setOpen(null)} tall title={current?.ex.name}>
        {current && <ExerciseDetail pts={current.pts} />}
      </Sheet>
    </div>
  );
}

function Spark({ values }: { values: number[] }) {
  const w = 64;
  const h = 26;
  if (values.length < 2) return <span className="w-16" />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 2 - ((v - min) / (max - min || 1)) * (h - 4)}`);
  return (
    <svg width={w} height={h} className="shrink-0" aria-hidden>
      <polyline points={pts.join(' ')} fill="none" stroke="rgb(var(--acc))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ExerciseDetail({ pts }: { pts: Point[] }) {
  const [metric, setMetric] = useState<Metric>('e1rm');
  const [sel, setSel] = useState<number | null>(null);
  const vals = pts.map((p) => p[metric]);
  const best = pts.reduce((a, p) => (p.e1rm > a.e1rm ? p : a), pts[0]);
  const heaviest = pts.reduce((a, p) => (p.top > a.top ? p : a), pts[0]);
  const m = METRICS.find((x) => x.id === metric)!;
  const shown = sel != null ? pts[sel] : pts[pts.length - 1];

  return (
    <div className="pb-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-s2 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-dim">Bestes Max (geschätzt)</div>
          <div className="num text-[24px] font-bold">{formatKg(Math.round(best.e1rm * 10) / 10)} kg</div>
          <div className="text-[12px] text-mute">{format(best.date, 'd. MMM yyyy', { locale: de })}</div>
        </div>
        <div className="rounded-2xl bg-s2 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-dim">Schwerster Satz</div>
          <div className="num text-[24px] font-bold">
            {formatKg(heaviest.top)} <span className="text-[15px] text-mute">× {heaviest.topReps}</span>
          </div>
          <div className="text-[12px] text-mute">{format(heaviest.date, 'd. MMM yyyy', { locale: de })}</div>
        </div>
      </div>

      <div className="scroller -mx-5 mt-4 flex gap-2 overflow-x-auto px-5">
        {METRICS.map((x) => (
          <Chip key={x.id} active={metric === x.id} onClick={() => setMetric(x.id)}>
            {x.label}
          </Chip>
        ))}
      </div>

      <div className="mt-3 rounded-2xl bg-s2/60 p-3">
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] text-mute">{format(shown.date, 'EEEE, d. MMM', { locale: de })}</span>
          <span className="num text-[20px] font-bold">
            {formatKg(Math.round(shown[metric] * 10) / 10)} {m.unit}
          </span>
        </div>
        <LineChart values={vals} dates={pts.map((p) => p.date)} selected={sel} onSelect={setSel} />
      </div>

      <h3 className="mb-2 mt-5 text-[13px] font-semibold uppercase tracking-[0.08em] text-dim">Alle Einheiten</h3>
      <ul className="divide-y divide-line/5">
        {[...pts].reverse().map((p) => (
          <li key={p.sessionId} className="num grid grid-cols-[1fr_72px_96px_20px] items-center gap-2 py-2.5 text-[14px]">
            <span className="text-mute">{format(p.date, 'd. MMM yy', { locale: de })}</span>
            <span className="text-right text-mute">{p.sets} Sätze</span>
            <span className="text-right font-semibold">
              {formatKg(p.top)} × {p.topReps}
            </span>
            {p.e1rm >= best.e1rm - 0.01 ? <Icon name="trophy" size={16} className="text-acc" /> : <span className="w-4" />}
          </li>
        ))}
      </ul>
    </div>
  );
}

function LineChart({
  values,
  dates,
  selected,
  onSelect,
}: {
  values: number[];
  dates: number[];
  selected: number | null;
  onSelect: (i: number | null) => void;
}) {
  const W = 320;
  const H = 150;
  const P = { l: 6, r: 6, t: 12, b: 20 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.15 || max * 0.1 || 1;
  const lo = Math.max(0, min - pad);
  const hi = max + pad;
  const x = (i: number) => P.l + (values.length === 1 ? (W - P.l - P.r) / 2 : (i / (values.length - 1)) * (W - P.l - P.r));
  const y = (v: number) => P.t + (1 - (v - lo) / (hi - lo)) * (H - P.t - P.b);
  const path = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');

  const pick = (clientX: number, rect: DOMRect) => {
    const rel = ((clientX - rect.left) / rect.width) * W;
    let bestI = 0;
    for (let i = 1; i < values.length; i++) if (Math.abs(x(i) - rel) < Math.abs(x(bestI) - rel)) bestI = i;
    onSelect(bestI);
  };

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mt-2 w-full touch-none"
      role="img"
      aria-label={`Verlauf über ${values.length} Einheiten, von ${formatKg(Math.round(values[0]))} auf ${formatKg(Math.round(values[values.length - 1]))} kg`}
      onPointerDown={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
      onPointerMove={(e) => e.buttons && pick(e.clientX, e.currentTarget.getBoundingClientRect())}
      onPointerLeave={() => onSelect(null)}
    >
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={P.l} x2={W - P.r} y1={P.t + f * (H - P.t - P.b)} y2={P.t + f * (H - P.t - P.b)} stroke="rgb(var(--line) / 0.06)" />
      ))}
      <path d={path} fill="none" stroke="rgb(var(--acc))" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {values.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={selected === i ? 5 : 3} fill={selected === i ? 'rgb(var(--fg))' : 'rgb(var(--acc))'} />
      ))}
      {selected != null && <line x1={x(selected)} x2={x(selected)} y1={P.t} y2={H - P.b} stroke="rgb(var(--line) / 0.2)" strokeDasharray="3 3" />}
      <text x={P.l} y={H - 4} fontSize="10" fill="rgb(var(--dim))">
        {format(dates[0], 'd. MMM', { locale: de })}
      </text>
      <text x={W - P.r} y={H - 4} fontSize="10" fill="rgb(var(--dim))" textAnchor="end">
        {format(dates[dates.length - 1], 'd. MMM', { locale: de })}
      </text>
    </svg>
  );
}
