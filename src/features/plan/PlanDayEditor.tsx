import { Reorder, useDragControls } from 'motion/react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AreaPicker } from '@/components/AreaPicker';
import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { Button, Field, IconButton, SectionTitle, Stepper } from '@/components/ui';
import { useLiveQuery } from 'dexie-react-hooks';
import { useExerciseMap, usePlanDay, usePlanDayExercises } from '@/db/queries';
import { insertMany, patch, patchMany, remove } from '@/db/repo';
import { db } from '@/db/dexie';
import { DAY_COLORS, dayColor, WEEKDAYS, type Exercise, type PlanDay, type PlanDayExercise } from '@/domain/types';
import { useUi } from '@/store/ui';
import { ExercisePicker } from './ExercisePicker';

export const NEW_DAY_NAME = 'Neuer Trainingstag';

export function PlanDayEditor() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const day = usePlanDay(id);
  const links = usePlanDayExercises(id);
  const exMap = useExerciseMap();
  const toast = useUi((s) => s.toast);
  const [name, setName] = useState('');
  const [picking, setPicking] = useState(false);
  const [editLink, setEditLink] = useState<PlanDayExercise | null>(null);
  const [order, setOrder] = useState<string[]>([]);

  useEffect(() => {
    // Neuer Tag: leeres Feld mit Platzhalter statt Standardnamen zum Wegtippen.
    if (day) setName(params.get('neu') === '1' && day.name === NEW_DAY_NAME ? '' : day.name);
    // nur beim Laden des Tages übernehmen, nicht bei jedem Tippen
  }, [day?.id]);

  useEffect(() => {
    if (links) setOrder(links.map((l) => l.id));
  }, [links]);


  if (day === null || (day && day.deleted_at)) {
    return (
      <div className="p-6 text-center text-mute">
        Trainingstag nicht gefunden.
        <div className="mt-4">
          <Button onClick={() => nav('/')}>Zurück zu Home</Button>
        </div>
      </div>
    );
  }
  if (!day || !links) return null;

  const tint = DAY_COLORS[day.color % DAY_COLORS.length].rgb;
  const set = (changes: Partial<PlanDay>) => void patch<PlanDay>('plan_days', day.id, changes);

  const addExercises = async (ids: string[]) => {
    const base = links.length;
    await insertMany<PlanDayExercise>(
      'plan_day_exercises',
      ids.map((exId, i) => ({ plan_day_id: day.id, exercise_id: exId, sort: base + i, target_sets: 3 })),
    );
  };

  const commitOrder = () => {
    const changes = order
      .map((lid, i) => ({ id: lid, changes: { sort: i } }))
      .filter((c) => links.find((l) => l.id === c.id)?.sort !== c.changes.sort);
    if (changes.length) void patchMany('plan_day_exercises', changes);
  };

  const deleteDay = async () => {
    await remove('plan_days', day.id);
    toast({ text: `„${day.name}“ gelöscht`, action: { label: 'Rückgängig', run: () => void patch('plan_days', day.id, { deleted_at: null } as never) } });
    nav('/', { replace: true });
  };

  const byId = new Map(links.map((l) => [l.id, l]));

  return (
    <div className="pb-10">
      <div className="sticky top-0 z-10 flex items-center justify-between bg-bg/95 px-2 py-1 backdrop-blur">
        <button type="button" onClick={() => nav('/')} className="press flex h-11 items-center gap-0.5 pr-3 text-acc">
          <Icon name="chevronLeft" size={26} />
          <span className="text-[17px]">Home</span>
        </button>
        <IconButton icon="trash" label="Trainingstag löschen" className="text-bad" onClick={deleteDay} />
      </div>

      <div className="px-5">
        <input
          aria-label="Name des Trainingstags"
          value={name}
          autoFocus={params.get('neu') === '1'}
          onChange={(e) => {
            setName(e.target.value);
            set({ name: e.target.value.trim() || NEW_DAY_NAME });
          }}
          className="w-full bg-transparent text-[30px] font-bold tracking-tight outline-none placeholder:text-dim"
          style={{ fontSize: 30 }}
          placeholder="Name, z. B. Rücken"
          enterKeyHint="done"
        />

        <SectionTitle>Bereiche</SectionTitle>
        <AreaPicker value={day.areas ?? []} tint={tint} onChange={(areas) => set({ areas })} />

        <SectionTitle>Farbe</SectionTitle>
        <div className="flex gap-3">
          {DAY_COLORS.map((c, i) => (
            <button
              key={c.name}
              type="button"
              aria-label={`Farbe ${c.name}`}
              aria-pressed={day.color === i}
              onClick={() => set({ color: i })}
              className="press grid h-11 w-11 place-items-center rounded-full"
              style={{ backgroundColor: dayColor(i), boxShadow: day.color === i ? `0 0 0 3px rgb(var(--bg)), 0 0 0 5px ${dayColor(i)}` : undefined }}
            >
              {day.color === i && <Icon name="check" size={18} strokeWidth={3} className="text-black/70" />}
            </button>
          ))}
        </div>

        <SectionTitle>Wochentage</SectionTitle>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((w, i) => {
            const on = day.weekdays.includes(i);
            return (
              <button
                key={w}
                type="button"
                aria-pressed={on}
                onClick={() => set({ weekdays: on ? day.weekdays.filter((x) => x !== i) : [...day.weekdays, i].sort() })}
                className={`press h-11 rounded-xl text-[14px] font-semibold ${on ? '' : 'bg-s2 text-mute'}`}
                style={on ? { backgroundColor: dayColor(day.color, 0.22), color: dayColor(day.color), boxShadow: `inset 0 0 0 1.5px ${dayColor(day.color, 0.6)}` } : undefined}
              >
                {w}
              </button>
            );
          })}
        </div>

        <SectionTitle right={<span className="num text-[13px] text-dim">{links.reduce((a, l) => a + l.target_sets, 0)} Sätze</span>}>
          Übungen
        </SectionTitle>

        <Reorder.Group axis="y" values={order} onReorder={setOrder} className="space-y-2">
          {order.map((lid, idx) => {
            const l = byId.get(lid);
            const ex = l && exMap?.get(l.exercise_id);
            if (!l || !ex) return null;
            return <LinkRow key={lid} link={l} exercise={ex} index={idx} onOpen={() => setEditLink(l)} onDragEnd={commitOrder} />;
          })}
        </Reorder.Group>

        <Button icon="plus" className="mt-3 w-full" onClick={() => setPicking(true)}>
          Übung hinzufügen
        </Button>
      </div>

      <ExercisePicker open={picking} onClose={() => setPicking(false)} onPick={addExercises} exclude={links.map((l) => l.exercise_id)} />
      <LinkSheet linkId={editLink?.id ?? null} exercise={editLink ? exMap?.get(editLink.exercise_id) : undefined} onClose={() => setEditLink(null)} />
    </div>
  );
}

function LinkRow({
  link,
  exercise,
  index,
  onOpen,
  onDragEnd,
}: {
  link: PlanDayExercise;
  exercise: Exercise;
  index: number;
  onOpen: () => void;
  onDragEnd: () => void;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={link.id}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDragEnd}
      className="relative flex items-center rounded-2xl bg-s1 hairline"
      whileDrag={{ scale: 1.02, boxShadow: '0 12px 30px rgb(0 0 0 / 0.5)', zIndex: 5 }}
    >
      <button type="button" onClick={onOpen} className="press flex min-h-[64px] min-w-0 flex-1 items-center gap-3 py-3 pl-4 text-left">
        <span className="num w-5 shrink-0 text-[15px] font-semibold text-dim">{index + 1}</span>
        <span className="min-w-0">
          <span className="block truncate text-[16px] font-semibold">{exercise.name}</span>
          <span className="num block text-[13px] text-mute">
            {link.target_sets} {link.target_sets === 1 ? 'Satz' : 'Sätze'}
          </span>
        </span>
      </button>
      <span
        role="button"
        aria-label="Zum Sortieren ziehen"
        tabIndex={-1}
        onPointerDown={(e) => controls.start(e)}
        className="grid h-[64px] w-12 shrink-0 cursor-grab touch-none place-items-center text-dim"
      >
        <Icon name="grip" size={22} strokeWidth={3} />
      </span>
    </Reorder.Item>
  );
}

function LinkSheet({ linkId, exercise, onClose }: { linkId: string | null; exercise?: Exercise; onClose: () => void }) {
  const live = useLiveQuery(async () => (linkId ? await db.plan_day_exercises.get(linkId) : undefined), [linkId]);
  // Letzten Stand behalten, damit das Sheet beim Schließen nicht leer herausfährt.
  const [last, setLast] = useState<PlanDayExercise | null>(null);
  useEffect(() => {
    if (live) setLast(live);
  }, [live]);
  const l = live ?? last;

  const upd = (changes: Partial<PlanDayExercise>) => {
    if (l) void patch<PlanDayExercise>('plan_day_exercises', l.id, changes);
  };

  return (
    <Sheet
      open={!!linkId}
      onClose={onClose}
      title={exercise?.name ?? 'Übung'}
      footer={
        <div className="flex gap-2">
          <Button
            variant="danger"
            icon="trash"
            onClick={async () => {
              if (l) await remove('plan_day_exercises', l.id);
              onClose();
            }}
          >
            Entfernen
          </Button>
          <Button variant="primary" className="flex-1" onClick={onClose}>
            Fertig
          </Button>
        </div>
      }
    >
      {l && (
        <div className="space-y-4 pt-2">
          <Field label="Sätze" hint="Wie viele Wiederholungen es werden, trägst du im Training ein.">
            <Stepper label="Sätze" value={l.target_sets} min={1} max={12} onChange={(v) => upd({ target_sets: v })} />
          </Field>
        </div>
      )}
    </Sheet>
  );
}
