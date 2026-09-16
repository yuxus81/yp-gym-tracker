import { useEffect, useState } from 'react';
import { Sheet } from '@/components/Sheet';
import { Button, Field, inputCls } from '@/components/ui';
import { db } from '@/db/dexie';
import { insert, patch, remove } from '@/db/repo';
import type { Exercise } from '@/domain/types';
import { useUi } from '@/store/ui';

/** Übungen sind nur noch ein Name — angelegt, umbenannt oder gelöscht wird hier. */
export function ExerciseEditor({
  open,
  onClose,
  exercise,
  initialName = '',
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  exercise?: Exercise | null;
  initialName?: string;
  onCreated?: (ex: Exercise) => void;
}) {
  const toast = useUi((s) => s.toast);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(exercise?.name ?? initialName);
    setError('');
  }, [open, exercise, initialName]);

  const save = async () => {
    const n = name.trim();
    if (!n) return setError('Gib der Übung einen Namen.');
    const clash = await findByName(n);
    if (clash && clash.id !== exercise?.id) return setError(`„${clash.name}“ gibt es schon.`);
    if (exercise) {
      await patch<Exercise>('exercises', exercise.id, { name: n });
    } else {
      const created = await insert<Exercise>('exercises', { name: n, notes: '' });
      onCreated?.(created);
    }
    onClose();
  };

  const del = async () => {
    if (!exercise) return;
    await remove('exercises', exercise.id);
    toast({ text: `„${exercise.name}“ gelöscht`, action: { label: 'Rückgängig', run: () => void patch('exercises', exercise.id, { deleted_at: null } as never) } });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      z={70}
      title={exercise ? 'Übung bearbeiten' : 'Neue Übung'}
      footer={
        <div className="flex gap-2">
          {exercise && <Button variant="danger" icon="trash" onClick={del} aria-label="Übung löschen" />}
          <Button variant="primary" size="lg" className="flex-1" onClick={save}>
            Speichern
          </Button>
        </div>
      }
    >
      <form
        className="space-y-4 pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Field label="Name">
          <input
            className={inputCls}
            value={name}
            autoFocus
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            placeholder="z. B. Latzug eng"
            enterKeyHint="done"
            autoComplete="off"
          />
        </Field>
        {error && (
          <p role="alert" className="rounded-xl bg-bad/10 px-4 py-3 text-[14px] font-medium text-bad">
            {error}
          </p>
        )}
      </form>
    </Sheet>
  );
}

/** Gleicher Name (ohne Groß-/Kleinschreibung) — verhindert doppelte Übungen. */
export async function findByName(name: string): Promise<Exercise | undefined> {
  const n = name.trim().toLowerCase();
  return (await db.exercises.toArray()).find((e) => !e.deleted_at && e.name.trim().toLowerCase() === n);
}
