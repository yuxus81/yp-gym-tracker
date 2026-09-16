import { useEffect, useMemo, useState } from 'react';
import { Sheet } from '@/components/Sheet';
import { Icon } from '@/components/Icon';
import { Button, inputCls } from '@/components/ui';
import { useExercises } from '@/db/queries';
import { insert } from '@/db/repo';
import type { Exercise } from '@/domain/types';
import { ExerciseEditor, findByName } from './ExerciseEditor';

/** Eigene Übungen auswählen oder direkt per Namen neu anlegen (Mehrfachauswahl). */
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
    return (exercises ?? []).filter((e) => !exclude.includes(e.id) && (!needle || e.name.toLowerCase().includes(needle)));
  }, [exercises, q, exclude]);

  const typed = q.trim();
  const exact = (exercises ?? []).find((e) => e.name.trim().toLowerCase() === typed.toLowerCase());

  // Mit Suchtext: sofort anlegen und auswählen. Ohne: Namensfeld öffnen.
  const create = async () => {
    if (!typed) return setCreating(true);
    // Feld sofort leeren: Weitertippen darf nicht an den gerade gespeicherten Namen angehängt werden.
    setQ('');
    // In der Datenbank nachsehen, nicht nur in der Liste – die hinkt bei schnellem Tippen hinterher.
    const ex = exact ?? (await findByName(typed)) ?? (await insert<Exercise>('exercises', { name: typed, notes: '' }));
    if (!exclude.includes(ex.id)) setPicked((p) => (p.includes(ex.id) ? p : [...p, ex.id]));
  };

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
              placeholder={exercises?.length ? 'Suchen oder neuen Namen tippen' : 'Name der Übung, z. B. Latzug'}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              enterKeyHint="done"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && typed) {
                  e.preventDefault();
                  void create();
                }
              }}
              autoComplete="off"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={create}
          className="press mb-2 mt-1 flex h-14 w-full items-center gap-3 rounded-2xl border border-dashed border-line/15 px-4 text-left text-acc"
        >
          <Icon name="plus" size={20} />
          <span className="min-w-0 truncate font-semibold">
            {!typed ? 'Neue Übung anlegen' : !exact ? `„${typed}“ anlegen` : exclude.includes(exact.id) ? `„${exact.name}“ ist schon drin` : `„${exact.name}“ auswählen`}
          </span>
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
                  </span>
                </button>
                <button type="button" aria-label={`${e.name} bearbeiten`} onClick={() => setEditing(e)} className="press grid h-11 w-11 place-items-center text-dim">
                  <Icon name="edit" size={18} />
                </button>
              </li>
            );
          })}
        </ul>
        {exercises && list.length === 0 && (
          <p className="py-8 text-center text-[15px] text-mute">
            {exercises.length === 0 ? 'Noch keine Übungen. Tippe oben einen Namen ein.' : typed ? 'Keine passende Übung.' : 'Alle Übungen sind schon drin.'}
          </p>
        )}
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
