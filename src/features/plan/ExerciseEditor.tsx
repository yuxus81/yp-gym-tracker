import { useEffect, useState } from 'react';
import { Sheet } from '@/components/Sheet';
import { BodyMap } from '@/components/BodyMap';
import { Button, Chip, Field, inputCls, Stepper } from '@/components/ui';
import { insert, patch, remove } from '@/db/repo';
import { loadFromExercises, MUSCLE_GROUPS, MUSCLES, type MuscleId } from '@/domain/muscles';
import type { Exercise } from '@/domain/types';
import { useUi } from '@/store/ui';

const EQUIPMENT = ['Langhantel', 'Kurzhantel', 'Maschine', 'Kabel', 'Körpergewicht', 'Gerät'];

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
  const [primary, setPrimary] = useState<MuscleId[]>([]);
  const [secondary, setSecondary] = useState<MuscleId[]>([]);
  const [equipment, setEquipment] = useState('Maschine');
  const [rest, setRest] = useState(90);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(exercise?.name ?? initialName);
    setPrimary(exercise?.primary_muscles ?? []);
    setSecondary(exercise?.secondary_muscles ?? []);
    setEquipment(exercise?.equipment ?? 'Maschine');
    setRest(exercise?.rest_sec ?? 90);
    setError('');
  }, [open, exercise, initialName]);

  // Tippen: aus → Hauptmuskel → mitbeansprucht → aus
  const cycle = (m: MuscleId) => {
    if (primary.includes(m)) {
      setPrimary(primary.filter((x) => x !== m));
      setSecondary([...secondary, m]);
    } else if (secondary.includes(m)) {
      setSecondary(secondary.filter((x) => x !== m));
    } else {
      setPrimary([...primary, m]);
    }
  };

  const save = async () => {
    const n = name.trim();
    if (!n) return setError('Gib der Übung einen Namen.');
    if (primary.length === 0) return setError('Wähle mindestens einen Hauptmuskel.');
    const data = { name: n, primary_muscles: primary, secondary_muscles: secondary, equipment, rest_sec: rest, notes: exercise?.notes ?? '' };
    if (exercise) {
      await patch<Exercise>('exercises', exercise.id, data);
    } else {
      const created = await insert<Exercise>('exercises', data);
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
      tall
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
      <div className="space-y-5 pt-2">
        <Field label="Name">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Seitheben am Kabel" enterKeyHint="done" />
        </Field>

        <div className="flex items-center gap-4 rounded-2xl bg-s2/50 p-3">
          <BodyMap load={loadFromExercises([{ primary_muscles: primary, secondary_muscles: secondary }])} className="h-28 w-28 shrink-0" />
          <p className="text-[13px] leading-snug text-mute">
            Tippe einmal für <span className="font-semibold text-acc">Hauptmuskel</span>, zweimal für{' '}
            <span className="font-semibold text-acc/60">mitbeansprucht</span>, dreimal zum Entfernen.
          </p>
        </div>

        {MUSCLE_GROUPS.map((g) => (
          <div key={g.label}>
            <div className="mb-2 text-[13px] font-medium text-mute">{g.label}</div>
            <div className="flex flex-wrap gap-2">
              {g.ids.map((m) => {
                const isP = primary.includes(m);
                const isS = secondary.includes(m);
                return (
                  <Chip key={m} active={isP || isS} onClick={() => cycle(m)} className={isS ? 'opacity-70' : ''}>
                    {MUSCLES[m]}
                    {isS && <span className="text-[11px]">· mit</span>}
                  </Chip>
                );
              })}
            </div>
          </div>
        ))}

        <div>
          <div className="mb-2 text-[13px] font-medium text-mute">Gerät</div>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT.map((e) => (
              <Chip key={e} active={equipment === e} onClick={() => setEquipment(e)}>
                {e}
              </Chip>
            ))}
          </div>
        </div>

        <Field label="Standard-Pause (Sekunden)">
          <Stepper label="Pause" value={rest} onChange={setRest} min={15} max={600} step={15} />
        </Field>

        {error && (
          <p role="alert" className="rounded-xl bg-bad/10 px-4 py-3 text-[14px] font-medium text-bad">
            {error}
          </p>
        )}
      </div>
    </Sheet>
  );
}
