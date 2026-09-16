import { useEffect, useMemo, useState } from 'react';
import { Sheet } from '@/components/Sheet';
import { Icon } from '@/components/Icon';
import { Button, Chip, inputCls } from '@/components/ui';
import { useExercises } from '@/db/queries';
import { MUSCLE_GROUPS, MUSCLES } from '@/domain/muscles';
import type { Exercise } from '@/domain/types';
import { ExerciseEditor } from './ExerciseEditor';

const GROUP_FILTERS = [
  { label: 'Alle', ids: [] as string[] },
  { label: 'Brust', ids: ['chest'] },
  { label: 'Rücken', ids: ['lats', 'upper_back', 'lower_back', 'traps'] },
  { label: 'Schultern', ids: ['front_delts', 'side_delts', 'rear_delts'] },
  { label: 'Arme', ids: ['biceps', 'triceps', 'forearms'] },
  { label: 'Beine', ids: MUSCLE_GROUPS[3].ids as string[] },
  { label: 'Rumpf', ids: ['abs', 'obliques'] },
];

/** Übungsauswahl mit Suche, Muskelfilter und Mehrfachauswahl. */
export function ExercisePicker({
  open,
  onClose,
  onPick,
  exclude = [],
  title = 'Übungen hinzufügen',
}: {
  open: boolean;
  onClose: () => void;
  onPick: (ids: string[]) => void;
  exclude?: string[];
  title?: string;
}) {
  const exercises = useExercises();
  const [q, setQ] = useState('');
  const [group, setGroup] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);

  useEffect(() => {
    if (open) {
      setPicked([]);
      setQ('');
    }
  }, [open]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const ids = GROUP_FILTERS[group].ids;
    return (exercises ?? []).filter(
      (e) =>
        !exclude.includes(e.id) &&
        (!needle || e.name.toLowerCase().includes(needle)) &&
        (ids.length === 0 || e.primary_muscles.some((m) => ids.includes(m))),
    );
  }, [exercises, q, group, exclude]);

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        tall
        title={title}
        footer={
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={picked.length === 0}
            onClick={() => {
              onPick(picked);
              onClose();
            }}
          >
            {picked.length === 0 ? 'Übungen auswählen' : `${picked.length} hinzufügen`}
          </Button>
        }
      >
        <div className="sticky top-0 z-10 -mx-5 bg-s1 px-5 pb-2">
          <div className="relative">
            <Icon name="search" size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-dim" />
            <input
              className={`${inputCls} pl-10`}
              type="search"
              placeholder="Übung suchen"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              enterKeyHint="search"
              autoComplete="off"
            />
          </div>
          <div className="scroller -mx-5 mt-2 flex gap-2 overflow-x-auto px-5">
            {GROUP_FILTERS.map((g, i) => (
              <Chip key={g.label} active={group === i} onClick={() => setGroup(i)}>
                {g.label}
              </Chip>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCreating(true)}
          className="press mb-2 mt-1 flex h-14 w-full items-center gap-3 rounded-2xl border border-dashed border-line/15 px-4 text-left text-acc"
        >
          <Icon name="plus" size={20} />
          <span className="font-semibold">{q.trim() ? `„${q.trim()}“ neu anlegen` : 'Neue Übung anlegen'}</span>
        </button>

        <ul className="divide-y divide-line/5">
          {list.map((e) => {
            const on = picked.includes(e.id);
            return (
              <li key={e.id} className="flex items-center">
                <button type="button" onClick={() => toggle(e.id)} className="press flex min-h-[60px] flex-1 items-center gap-3 py-2 text-left" aria-pressed={on}>
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full transition-colors ${on ? 'bg-acc text-onacc' : 'bg-s2 text-transparent'}`}
                  >
                    <Icon name="check" size={16} strokeWidth={3} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[16px] font-medium">{e.name}</span>
                    <span className="block truncate text-[13px] text-mute">
                      {e.primary_muscles.map((m) => MUSCLES[m]).join(', ')} · {e.equipment}
                    </span>
                  </span>
                </button>
                <button type="button" aria-label={`${e.name} bearbeiten`} onClick={() => setEditing(e)} className="press grid h-11 w-11 place-items-center text-dim">
                  <Icon name="edit" size={18} />
                </button>
              </li>
            );
          })}
        </ul>
        {exercises && list.length === 0 && <p className="py-8 text-center text-[15px] text-mute">Nichts gefunden.</p>}
      </Sheet>

      <ExerciseEditor
        open={creating}
        onClose={() => setCreating(false)}
        initialName={q.trim()}
        onCreated={(ex) => setPicked((p) => [...p, ex.id])}
      />
      <ExerciseEditor open={!!editing} onClose={() => setEditing(null)} exercise={editing} />
    </>
  );
}
