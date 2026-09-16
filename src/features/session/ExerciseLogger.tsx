import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { DropLadder } from '@/components/DropLadder';
import { Icon } from '@/components/Icon';
import { NumberPad } from '@/components/NumberPad';
import { Sheet } from '@/components/Sheet';
import { Button } from '@/components/ui';
import { useLastSets, useSessionSets } from '@/db/queries';
import { patch, remove } from '@/db/repo';
import { formatKg, suggestDrop } from '@/domain/calc';
import { SET_KINDS, type Exercise, type Session, type SessionSet, type SetKind } from '@/domain/types';
import { haptic, playRecord, unlockAudio } from '@/lib/sound';
import { useUi } from '@/store/ui';
import { addSet, completeSet, ensureSets, uncompleteSet } from './actions';

type PadTarget = { setId: string; drop: number | null; field: 'weight' | 'reps' } | null;

const KIND_STYLE: Record<SetKind, string> = {
  working: 'bg-s2 text-fg',
  warmup: 'bg-warm/15 text-warm',
  drop: 'bg-acc/15 text-acc',
  failure: 'bg-bad/15 text-bad',
};

export function ExerciseLogger({
  session,
  exercise,
  targetSets,
}: {
  session: Session;
  exercise: Exercise;
  targetSets?: number;
}) {
  const allSets = useSessionSets(session.id);
  const last = useLastSets(exercise.id, session.id);
  const { toast } = useUi();
  const [pad, setPad] = useState<PadTarget>(null);
  const [kindFor, setKindFor] = useState<SessionSet | null>(null);
  const [recordIds, setRecordIds] = useState<string[]>([]);

  useEffect(() => {
    void ensureSets(session, exercise.id);
  }, [session, exercise.id]);

  const sets = (allSets ?? []).filter((s) => s.exercise_id === exercise.id);
  // Geisterwerte: gleicher Satz-Platz vom letzten Mal, sonst letzter Satz davor.
  const ghostFor = (i: number) => {
    const l = last ?? [];
    const g = l[i] ?? l[l.length - 1];
    return g ? { weight: g.weight, reps: g.reps } : undefined;
  };
  const numbered = (() => {
    let n = 0;
    return sets.map((s) => (s.kind === 'warmup' ? 'W' : String(++n)));
  })();

  const padSet = pad ? sets.find((s) => s.id === pad.setId) : undefined;
  const padIndex = padSet ? sets.indexOf(padSet) : -1;

  const onCheck = async (s: SessionSet, i: number) => {
    unlockAudio();
    haptic(15);
    if (s.done_at) {
      await uncompleteSet(s);
      return;
    }
    const isRecord = await completeSet(s, ghostFor(i));
    if (isRecord) {
      setRecordIds((r) => [...r, s.id]);
      playRecord();
      toast({ text: `Neuer Rekord bei ${exercise.name}`, tone: 'record' }, 4500);
    }
  };

  const savePad = async (v: { weight: number | null; reps: number | null }) => {
    if (!padSet || !pad) return;
    if (pad.drop == null) {
      await patch<SessionSet>('session_sets', padSet.id, { weight: v.weight, reps: v.reps });
    } else {
      const drops = [...padSet.drops];
      drops[pad.drop] = { weight: v.weight ?? 0, reps: v.reps ?? 0 };
      await patch<SessionSet>('session_sets', padSet.id, { drops });
    }
  };

  const addDrop = async (s: SessionSet, i: number) => {
    const prev = s.drops[s.drops.length - 1] ?? { weight: s.weight ?? ghostFor(i)?.weight ?? 0, reps: s.reps ?? ghostFor(i)?.reps ?? 8 };
    const next = suggestDrop(prev.weight, prev.reps);
    await patch<SessionSet>('session_sets', s.id, { drops: [...s.drops, next] });
    setPad({ setId: s.id, drop: s.drops.length, field: next.weight > 0 ? 'reps' : 'weight' });
  };

  const setKind = async (s: SessionSet, kind: SetKind) => {
    await patch<SessionSet>('session_sets', s.id, { kind, drops: kind === 'drop' ? s.drops : [] });
    setKindFor(null);
    if (kind === 'drop' && s.drops.length === 0) {
      const i = sets.indexOf(s);
      const hasStart = (s.weight ?? ghostFor(i)?.weight ?? 0) > 0;
      // Ohne Startgewicht zuerst den Hauptsatz erfassen, die Stufen kommen danach.
      if (hasStart) void addDrop({ ...s, kind }, i);
      else setPad({ setId: s.id, drop: null, field: 'weight' });
    }
  };

  const doneCount = sets.filter((s) => s.done_at && s.kind !== 'warmup').length;
  const workCount = sets.filter((s) => s.kind !== 'warmup').length;

  const lastSummary = (last ?? []).filter((s) => s.kind !== 'warmup');

  return (
    <div className="pb-6">
      <div className="px-5">
        <h2 className="text-[26px] font-bold leading-tight tracking-tight">{exercise.name}</h2>
        {targetSets != null && (
          <p className="num mt-1 text-[14px] text-mute">
            Ziel {targetSets} {targetSets === 1 ? 'Satz' : 'Sätze'}
          </p>
        )}

        {lastSummary.length > 0 && (
          <div className="scroller -mx-5 mt-3 flex items-center gap-2 overflow-x-auto px-5 text-[13px]">
            <span className="shrink-0 font-medium text-dim">Letztes Mal</span>
            {lastSummary.map((s) => (
              <span key={s.id} className="num shrink-0 rounded-lg bg-s2 px-2 py-1 text-mute">
                {formatKg(s.weight)} × {s.reps}
                {s.drops.length > 0 && <span className="text-acc"> +{s.drops.length}D</span>}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 px-3">
        <div className="grid grid-cols-[52px_1fr_56px] items-center px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-dim">
          <span>Satz</span>
          <span className="pl-2">kg × Wdh.</span>
          <span className="text-center">
            {doneCount}/{workCount}
          </span>
        </div>

        <ul className="space-y-1.5">
          <AnimatePresence initial={false}>
            {sets.map((s, i) => {
              const ghost = ghostFor(i);
              const done = !!s.done_at;
              const record = recordIds.includes(s.id);
              return (
                <motion.li
                  key={s.id}
                  layout
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  className={`relative overflow-hidden rounded-2xl transition-colors duration-300 ${done ? 'bg-ok/[0.09]' : 'bg-s1'} hairline`}
                >
                  <div className="grid grid-cols-[52px_1fr_56px] items-center">
                    <button
                      type="button"
                      onClick={() => setKindFor(s)}
                      aria-label={`Satz ${numbered[i]}, ${SET_KINDS.find((k) => k.id === s.kind)?.label}. Satzart ändern`}
                      className="press flex h-[60px] items-center justify-center"
                    >
                      <span className={`num grid h-9 w-9 place-items-center rounded-xl text-[15px] font-bold ${KIND_STYLE[s.kind]}`}>
                        {s.kind === 'working' ? numbered[i] : SET_KINDS.find((k) => k.id === s.kind)?.short}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPad({ setId: s.id, drop: null, field: s.weight == null ? 'weight' : 'reps' })}
                      className="press flex h-[60px] items-center gap-2 pl-2 text-left"
                    >
                      <span className={`num text-[24px] font-bold ${s.weight == null ? 'text-dim' : ''}`}>
                        {formatKg(s.weight ?? ghost?.weight ?? null)}
                      </span>
                      <span className="text-[15px] text-dim">×</span>
                      <span className={`num text-[24px] font-bold ${s.reps == null ? 'text-dim' : ''}`}>{s.reps ?? ghost?.reps ?? '–'}</span>
                      {record && (
                        <motion.span
                          initial={{ scale: 0, rotate: -20 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                          className="ml-1 flex items-center gap-1 rounded-full bg-acc px-2 py-0.5 text-[11px] font-bold text-onacc"
                        >
                          <Icon name="trophy" size={12} strokeWidth={2.5} /> PR
                        </motion.span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onCheck(s, i)}
                      aria-label={done ? 'Satz wieder öffnen' : 'Satz abhaken'}
                      aria-pressed={done}
                      className="press flex h-[60px] items-center justify-center"
                    >
                      <motion.span
                        animate={done ? { scale: [1, 1.25, 1] } : { scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className={`grid h-10 w-10 place-items-center rounded-xl transition-colors ${done ? 'bg-ok text-black' : 'bg-s2 text-dim'}`}
                      >
                        <Icon name="check" size={22} strokeWidth={3} />
                      </motion.span>
                    </button>
                  </div>

                  {s.kind === 'drop' && (
                    <div className="border-t border-line/5 px-3">
                      <DropLadder
                        main={{ weight: s.weight ?? ghost?.weight ?? null, reps: s.reps ?? ghost?.reps ?? null }}
                        drops={s.drops}
                        done={done}
                        onEdit={(d) => setPad({ setId: s.id, drop: d, field: 'weight' })}
                        onAdd={() => addDrop(s, i)}
                        onRemove={(d) => void patch<SessionSet>('session_sets', s.id, { drops: s.drops.filter((_, j) => j !== d) })}
                      />
                    </div>
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <Button onClick={() => addSet(session.id, exercise.id, sets)} className="whitespace-nowrap px-2">
            + Satz
          </Button>
          <Button onClick={() => addSet(session.id, exercise.id, sets, 'warmup')} className="whitespace-nowrap px-2 text-warm">
            + Aufwärm.
          </Button>
          <Button onClick={() => addSet(session.id, exercise.id, sets, 'drop')} className="whitespace-nowrap px-2 text-acc">
            + Drop-Satz
          </Button>
        </div>
      </div>

      <NumberPad
        open={!!pad && !!padSet}
        onClose={() => setPad(null)}
        title={
          pad?.drop != null
            ? `Drop ${pad.drop + 1}`
            : padIndex >= 0
              ? numbered[padIndex] === 'W'
                ? 'Aufwärmsatz'
                : `Satz ${numbered[padIndex]}`
              : ''
        }
        subtitle={exercise.name}
        startField={pad?.field ?? 'weight'}
        weight={pad?.drop != null ? (padSet?.drops[pad.drop]?.weight ?? null) : (padSet?.weight ?? null)}
        reps={pad?.drop != null ? (padSet?.drops[pad.drop]?.reps ?? null) : (padSet?.reps ?? null)}
        ghost={pad?.drop == null && padIndex >= 0 ? ghostFor(padIndex) : undefined}
        onSave={savePad}
      />

      <Sheet open={!!kindFor} onClose={() => setKindFor(null)} title="Satzart" z={75}>
        <div className="space-y-2 pb-2">
          {SET_KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => kindFor && setKind(kindFor, k.id)}
              className={`press flex h-14 w-full items-center gap-3 rounded-2xl px-3 text-left ${kindFor?.kind === k.id ? 'bg-s2' : ''}`}
            >
              <span className={`num grid h-9 w-9 place-items-center rounded-xl text-[15px] font-bold ${KIND_STYLE[k.id]}`}>{k.short}</span>
              <span className="flex-1 font-medium">{k.label}</span>
              {kindFor?.kind === k.id && <Icon name="check" className="text-acc" />}
            </button>
          ))}
          <button
            type="button"
            onClick={async () => {
              if (kindFor) await remove('session_sets', kindFor.id);
              setKindFor(null);
            }}
            className="press mt-2 flex h-14 w-full items-center gap-3 rounded-2xl px-3 text-left text-bad"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-bad/15">
              <Icon name="trash" size={18} />
            </span>
            <span className="font-medium">Satz löschen</span>
          </button>
        </div>
      </Sheet>
    </div>
  );
}
