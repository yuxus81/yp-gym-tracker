import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BodyMap } from '@/components/BodyMap';
import { DropLadder } from '@/components/DropLadder';
import { Icon } from '@/components/Icon';
import { NumberPad } from '@/components/NumberPad';
import { Sheet } from '@/components/Sheet';
import { Button, Field, IconButton, Stepper } from '@/components/ui';
import { useExerciseMap, usePlanDay, useSession, useSessionSets } from '@/db/queries';
import { patch } from '@/db/repo';
import { formatDuration, formatKg, formatVolume, setVolume } from '@/domain/calc';
import { loadFromAreas, sessionAreas } from '@/domain/muscles';
import { DAY_COLORS, dayColor, SET_KINDS, type Session, type SessionSet } from '@/domain/types';
import { useUi } from '@/store/ui';
import { deleteSession } from '../session/actions';

export function SessionDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const session = useSession(id);
  const sets = useSessionSets(id);
  const exMap = useExerciseMap();
  const planDay = usePlanDay(session?.plan_day_id ?? undefined);
  const toast = useUi((s) => s.toast);
  const [edit, setEdit] = useState<SessionSet | null>(null);
  const [durOpen, setDurOpen] = useState(false);

  const grouped = useMemo(() => {
    const order = session?.exercise_ids ?? [];
    const m = new Map<string, SessionSet[]>();
    for (const s of sets ?? []) {
      if (!s.done_at) continue;
      const a = m.get(s.exercise_id) ?? [];
      a.push(s);
      m.set(s.exercise_id, a);
    }
    const ids = [...order.filter((x) => m.has(x)), ...[...m.keys()].filter((x) => !order.includes(x))];
    return ids.map((exId) => ({ exId, sets: m.get(exId)! }));
  }, [sets, session]);

  if (session === null || session?.deleted_at) {
    return (
      <div className="p-8 text-center text-mute">
        Session nicht gefunden.
        <div className="mt-4">
          <Button onClick={() => nav('/verlauf')}>Zum Verlauf</Button>
        </div>
      </div>
    );
  }
  if (!session || !sets) return null;

  const done = sets.filter((s) => s.done_at);
  const duration = session.ended_at ? Date.parse(session.ended_at) - Date.parse(session.started_at) : 0;
  const vol = done.reduce((a, s) => a + setVolume(s), 0);
  const load = done.length ? loadFromAreas(sessionAreas(session, planDay)) : {};

  const del = async () => {
    const undo = await deleteSession(session.id);
    toast({ text: 'Session gelöscht', action: { label: 'Rückgängig', run: () => void undo() } }, 6000);
    nav('/verlauf', { replace: true });
  };

  return (
    <div className="pb-10">
      <div className="sticky top-0 z-10 flex items-center justify-between bg-bg/95 px-2 py-1 backdrop-blur">
        <button type="button" onClick={() => nav(-1)} className="press flex h-11 items-center gap-0.5 pr-3 text-acc">
          <Icon name="chevronLeft" size={26} />
          <span className="text-[17px]">Verlauf</span>
        </button>
        <IconButton icon="trash" label="Session löschen" className="text-bad" onClick={del} />
      </div>

      <div className="px-5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dayColor(session.color) }} />
          <span className="text-[13px] font-medium first-letter:uppercase text-mute">
            {format(new Date(session.started_at), "EEEE, d. MMMM yyyy · HH:mm 'Uhr'", { locale: de })}
          </span>
        </div>
        <h1 className="mt-1 text-[30px] font-bold leading-tight tracking-tight">{session.name}</h1>

        <div className="mt-4 flex items-center gap-4 rounded-3xl bg-s1 p-4 hairline">
          <BodyMap load={load} tint={DAY_COLORS[session.color % DAY_COLORS.length].rgb} className="h-32 w-32 shrink-0" />
          <div className="grid flex-1 gap-2">
            <button type="button" onClick={() => setDurOpen(true)} className="press -mx-2 flex items-baseline justify-between rounded-lg px-2 py-0.5 text-left active:bg-s2">
              <span className="flex items-center gap-1 text-[13px] text-mute">
                Dauer <Icon name="edit" size={12} />
              </span>
              <span className="num text-[17px] font-bold">{formatDuration(duration)}</span>
            </button>
            <Row label="Volumen" value={formatVolume(vol)} />
            <Row label="Sätze" value={String(done.filter((s) => s.kind !== 'warmup').length)} />
            {session.energy != null && <Row label="Gefühl" value={`${session.energy}/5`} />}
          </div>
        </div>

        {session.notes && <p className="mt-3 rounded-2xl bg-s1 p-4 text-[15px] text-mute hairline">{session.notes}</p>}

        <div className="mt-5 space-y-3">
          {grouped.map(({ exId, sets: exSets }) => {
            let n = 0;
            return (
              <section key={exId} className="rounded-2xl bg-s1 p-4 hairline">
                <h2 className="font-semibold">{exMap?.get(exId)?.name ?? 'Gelöschte Übung'}</h2>
                <ul className="mt-2 space-y-1">
                  {exSets.map((s) => {
                    const label = s.kind === 'warmup' ? 'W' : String(++n);
                    const kind = SET_KINDS.find((k) => k.id === s.kind)!;
                    return (
                      <li key={s.id}>
                        <button type="button" onClick={() => setEdit(s)} className="press flex h-10 w-full items-center gap-3 rounded-lg text-left active:bg-s2">
                          <span
                            className={`num grid h-7 w-7 place-items-center rounded-lg text-[12px] font-bold ${
                              s.kind === 'warmup' ? 'bg-warm/15 text-warm' : s.kind === 'drop' ? 'bg-acc/15 text-acc' : s.kind === 'failure' ? 'bg-bad/15 text-bad' : 'bg-s2'
                            }`}
                          >
                            {s.kind === 'working' ? label : kind.short}
                          </span>
                          <span className="num flex-1 text-[16px] font-semibold">
                            {formatKg(s.weight)} kg × {s.reps ?? '–'}
                          </span>
                          {s.kind !== 'working' && <span className="text-[12px] text-dim">{kind.label}</span>}
                        </button>
                        {s.kind === 'drop' && s.drops.length > 0 && (
                          <div className="pl-10">
                            <DropLadder main={{ weight: s.weight, reps: s.reps }} drops={s.drops} readOnly done />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </div>

      <NumberPad
        open={!!edit}
        onClose={() => setEdit(null)}
        title="Satz korrigieren"
        subtitle={edit ? exMap?.get(edit.exercise_id)?.name : undefined}
        weight={edit?.weight ?? null}
        reps={edit?.reps ?? null}
        onSave={(v) => edit && void patch<SessionSet>('session_sets', edit.id, v)}
      />
      <DurationSheet open={durOpen} session={session} onClose={() => setDurOpen(false)} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-[13px] text-mute">{label}</span>
      <span className="num text-[17px] font-bold">{value}</span>
    </div>
  );
}

/** Falls „Beenden" vergessen wurde: Dauer nachträglich korrigieren. */
function DurationSheet({ open, session, onClose }: { open: boolean; session: Session; onClose: () => void }) {
  const current = session.ended_at ? Math.round((Date.parse(session.ended_at) - Date.parse(session.started_at)) / 60000) : 0;
  const [min, setMin] = useState(current);
  useEffect(() => {
    if (open) setMin(current);
  }, [open, current]);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Dauer korrigieren"
      footer={
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => {
            void patch<Session>('sessions', session.id, { ended_at: new Date(Date.parse(session.started_at) + min * 60000).toISOString() });
            onClose();
          }}
        >
          Speichern
        </Button>
      }
    >
      <div className="pt-2">
        <Field label="Minuten" hint="Start bleibt gleich, das Ende wird angepasst.">
          <Stepper label="Minuten" value={min} onChange={setMin} min={1} max={600} step={5} />
        </Field>
      </div>
    </Sheet>
  );
}
