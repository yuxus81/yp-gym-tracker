import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { BodyMap } from '@/components/BodyMap';
import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { Button, IconButton } from '@/components/ui';
import { useExerciseMap, usePlanDay, usePlanDayExercises, useSessionSets } from '@/db/queries';
import { patch } from '@/db/repo';
import { formatClock } from '@/domain/calc';
import { loadFromAreas, sessionAreas } from '@/domain/muscles';
import { DAY_COLORS, dayColor, type Session } from '@/domain/types';
import { useNow } from '@/lib/hooks';
import { useUi } from '@/store/ui';
import { ExercisePicker } from '../plan/ExercisePicker';
import { addExerciseToSession, discardSession, finishSession, moveExercise, removeExerciseFromSession } from './actions';
import { ExerciseLogger } from './ExerciseLogger';

export function SessionScreen({ session }: { session: Session }) {
  const { closeSession, setSummary } = useUi();
  const exMap = useExerciseMap();
  const links = usePlanDayExercises(session.plan_day_id ?? undefined);
  const planDay = usePlanDay(session.plan_day_id ?? undefined);
  const sets = useSessionSets(session.id);
  const now = useNow(1000);
  const [openEx, setOpenEx] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const tint = DAY_COLORS[session.color % DAY_COLORS.length].rgb;
  const linkByEx = useMemo(() => new Map((links ?? []).map((l) => [l.exercise_id, l])), [links]);

  const progress = useMemo(() => {
    const m = new Map<string, { done: number; total: number }>();
    for (const s of sets ?? []) {
      if (s.kind === 'warmup') continue;
      const p = m.get(s.exercise_id) ?? { done: 0, total: 0 };
      p.total++;
      if (s.done_at) p.done++;
      m.set(s.exercise_id, p);
    }
    return m;
  }, [sets]);

  const doneSets = (sets ?? []).filter((s) => s.done_at && s.kind !== 'warmup').length;
  // Noch nicht geöffnete Übungen zählen mit ihrem Plan-Ziel
  const totalSets = session.exercise_ids.reduce((a, id) => a + (progress.get(id)?.total ?? linkByEx.get(id)?.target_sets ?? 0), 0);
  // Die Bereiche füllen sich mit dem Fortschritt: blass am Anfang, voll bei allen Sätzen.
  const areas = sessionAreas(session, planDay);
  const load = loadFromAreas(areas, 0.1 + 0.9 * (totalSets ? Math.min(1, doneSets / totalSets) : 0));
  const exercise = openEx ? exMap?.get(openEx) : undefined;
  const link = openEx ? linkByEx.get(openEx) : undefined;
  const menuEx = menuFor ? exMap?.get(menuFor) : undefined;

  const finish = async () => {
    await finishSession(session);
    setFinishing(false);
    setOpenEx(null);
    setSummary(session.id);
  };

  const discard = async () => {
    await discardSession(session);
    setFinishing(false);
    closeSession();
  };

  return (
    <div className="flex h-full flex-col bg-bg">
      {/* Kopfzeile */}
      <div className="shrink-0 px-2" style={{ paddingTop: 'var(--safe-top)' }}>
        <div className="flex h-14 items-center gap-1">
          {openEx ? (
            <button type="button" onClick={() => setOpenEx(null)} className="press flex h-11 items-center gap-0.5 pr-2 text-acc">
              <Icon name="chevronLeft" size={26} />
              <span className="text-[17px]">Übungen</span>
            </button>
          ) : (
            <IconButton icon="chevronDown" label="Session minimieren" onClick={closeSession} size={26} />
          )}
          <div className="min-w-0 flex-1 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: dayColor(session.color) }} />
              <span className="truncate text-[13px] font-semibold text-mute">{session.name}</span>
            </div>
            <div className="num text-[20px] font-bold leading-tight">{formatClock(now - Date.parse(session.started_at))}</div>
          </div>
          <button type="button" onClick={() => setFinishing(true)} className="press h-10 rounded-xl bg-acc px-4 text-[15px] font-bold text-onacc">
            Beenden
          </button>
        </div>
      </div>

      <div className="scroller relative min-h-0 flex-1" style={{ paddingBottom: 'var(--safe-bottom)' }}>
        <AnimatePresence mode="popLayout" initial={false}>
          {exercise ? (
            <motion.div
              key={`ex-${exercise.id}`}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 420, damping: 42 }}
              className="pt-2"
            >
              <ExerciseLogger
                session={session}
                exercise={exercise}
                targetSets={link?.target_sets}
              />
              <NextUp session={session} current={exercise.id} names={exMap} onOpen={setOpenEx} />
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ x: '-25%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-25%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 42 }}
              className="px-4 pb-6"
            >
              <div className="flex items-center gap-4 rounded-3xl bg-s1 p-4 hairline">
                <BodyMap load={load} tint={tint} className="h-36 w-36 shrink-0" />
                <div className="min-w-0">
                  <div className="num text-[40px] font-bold leading-none">
                    {doneSets}
                    <span className="text-[20px] text-dim">/{totalSets || '–'}</span>
                  </div>
                  <div className="mt-1 text-[13px] text-mute">Arbeitssätze erledigt</div>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-s3">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: dayColor(session.color) }}
                      initial={false}
                      animate={{ width: `${totalSets ? (doneSets / totalSets) * 100 : 0}%` }}
                      transition={{ type: 'spring', stiffness: 200, damping: 30 }}
                    />
                  </div>
                </div>
              </div>

              {session.exercise_ids.length === 0 && (
                <p className="px-4 py-8 text-center text-[15px] text-mute">Noch keine Übungen. Füge welche hinzu und leg los.</p>
              )}

              <ul className="mt-4 space-y-2">
                {session.exercise_ids.map((id, i) => {
                  const ex = exMap?.get(id);
                  if (!ex) return null;
                  const p = progress.get(id);
                  const l = linkByEx.get(id);
                  const total = p?.total || l?.target_sets || 0;
                  const done = p?.done ?? 0;
                  const complete = total > 0 && done >= total;
                  return (
                    <motion.li
                      key={id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.035, type: 'spring', stiffness: 420, damping: 34 }}
                      className={`flex items-center rounded-2xl hairline ${complete ? 'bg-ok/[0.08]' : 'bg-s1'}`}
                    >
                      <button type="button" onClick={() => setOpenEx(id)} className="press flex min-h-[72px] min-w-0 flex-1 items-center gap-3 py-3 pl-4 text-left">
                        <span
                          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${complete ? 'bg-ok text-black' : 'bg-s2 text-mute'}`}
                        >
                          {complete ? <Icon name="check" size={20} strokeWidth={3} /> : <span className="num text-[15px] font-bold">{i + 1}</span>}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[16px] font-semibold">{ex.name}</span>
                          <span className="mt-1 flex items-center gap-2">
                            <span className="flex gap-1">
                              {Array.from({ length: Math.min(total, 10) }).map((_, j) => (
                                <span
                                  key={j}
                                  className="h-1.5 w-4 rounded-full transition-colors duration-300"
                                  style={{ backgroundColor: j < done ? dayColor(session.color) : 'rgb(var(--s3))' }}
                                />
                              ))}
                            </span>
                            <span className="num truncate text-[12px] text-mute">{total ? `${done}/${total} Sätze` : 'Noch keine Sätze'}</span>
                          </span>
                        </span>
                      </button>
                      <IconButton icon="more" label={`Optionen für ${ex.name}`} className="mr-1 text-dim" onClick={() => setMenuFor(id)} />
                    </motion.li>
                  );
                })}
              </ul>

              <Button icon="plus" className="mt-3 w-full" onClick={() => setPicking(true)}>
                Übung hinzufügen
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>


      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        exclude={session.exercise_ids}
        onPick={async (ids) => {
          let s = session;
          for (const id of ids) {
            await addExerciseToSession(s, id);
            s = { ...s, exercise_ids: [...s.exercise_ids, id] };
          }
          if (ids.length === 1) setOpenEx(ids[0]);
        }}
      />

      <Sheet open={!!menuFor} onClose={() => setMenuFor(null)} title={menuEx?.name}>
        <div className="space-y-1 pb-2">
          {[
            { label: 'Nach oben', icon: 'chevronLeft' as const, run: () => menuFor && moveExercise(session, menuFor, -1), cls: 'rotate-90' },
            { label: 'Nach unten', icon: 'chevronRight' as const, run: () => menuFor && moveExercise(session, menuFor, 1), cls: 'rotate-90' },
          ].map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={async () => {
                await a.run();
                setMenuFor(null);
              }}
              className="press flex h-14 w-full items-center gap-3 rounded-2xl px-3 text-left active:bg-s2"
            >
              <Icon name={a.icon} className={`text-mute ${a.cls}`} />
              <span className="font-medium">{a.label}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={async () => {
              if (menuFor) await removeExerciseFromSession(session, menuFor);
              setMenuFor(null);
            }}
            className="press flex h-14 w-full items-center gap-3 rounded-2xl px-3 text-left text-bad active:bg-s2"
          >
            <Icon name="trash" />
            <span className="font-medium">Aus dieser Session entfernen</span>
          </button>
        </div>
      </Sheet>

      <FinishSheet
        open={finishing}
        session={session}
        doneSets={doneSets}
        totalSets={totalSets}
        onClose={() => setFinishing(false)}
        onFinish={finish}
        onDiscard={discard}
      />
    </div>
  );
}

function NextUp({
  session,
  current,
  names,
  onOpen,
}: {
  session: Session;
  current: string;
  names?: Map<string, { name: string }>;
  onOpen: (id: string) => void;
}) {
  const i = session.exercise_ids.indexOf(current);
  const next = session.exercise_ids[i + 1];
  if (!next) return null;
  return (
    <div className="px-3 pb-6">
      <button type="button" onClick={() => onOpen(next)} className="press flex h-16 w-full items-center gap-3 rounded-2xl bg-s1 px-4 text-left hairline">
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] font-semibold uppercase tracking-wider text-dim">Als Nächstes</span>
          <span className="block truncate font-semibold">{names?.get(next)?.name}</span>
        </span>
        <Icon name="chevronRight" className="text-acc" />
      </button>
    </div>
  );
}

function FinishSheet({
  open,
  session,
  doneSets,
  totalSets,
  onClose,
  onFinish,
  onDiscard,
}: {
  open: boolean;
  session: Session;
  doneSets: number;
  totalSets: number;
  onClose: () => void;
  onFinish: () => void;
  onDiscard: () => void;
}) {
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const open_ = totalSets - doneSets;
  return (
    <Sheet open={open} onClose={() => { setConfirmDiscard(false); onClose(); }} title="Training beenden?">
      <div className="space-y-4 pb-2 pt-1">
        {open_ > 0 && (
          <p className="rounded-xl bg-warm/10 px-4 py-3 text-[14px] text-warm">
            {open_} {open_ === 1 ? 'geplanter Satz ist' : 'geplante Sätze sind'} noch offen. Gespeichert wird nur, was abgehakt ist.
          </p>
        )}
        <div>
          <div className="mb-2 text-[13px] font-medium text-mute">Wie war’s?</div>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={session.energy === v}
                onClick={() => void patch<Session>('sessions', session.id, { energy: session.energy === v ? null : v })}
                className={`press num h-12 rounded-xl text-[17px] font-bold ${session.energy === v ? 'bg-acc text-onacc' : 'bg-s2 text-mute'}`}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-dim">
            <span>zäh</span>
            <span>stark</span>
          </div>
        </div>
        <textarea
          defaultValue={session.notes}
          onChange={(e) => void patch<Session>('sessions', session.id, { notes: e.target.value })}
          placeholder="Notiz (optional)"
          rows={2}
          className="w-full resize-none rounded-xl bg-s2 px-4 py-3 text-[16px] outline-none placeholder:text-dim"
        />
        <Button variant="primary" size="lg" icon="flag" className="w-full" onClick={onFinish}>
          Speichern & beenden
        </Button>
        {confirmDiscard ? (
          <Button variant="danger" className="w-full" onClick={onDiscard}>
            Wirklich verwerfen — alles löschen
          </Button>
        ) : (
          <Button variant="ghost" className="w-full" onClick={() => setConfirmDiscard(true)}>
            Session verwerfen
          </Button>
        )}
      </div>
    </Sheet>
  );
}
