import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { inputCls } from '@/components/ui';
import { useExercises } from '@/db/queries';
import { MUSCLES } from '@/domain/muscles';
import type { Exercise } from '@/domain/types';
import { ExerciseEditor } from './ExerciseEditor';

export function LibraryPage() {
  const nav = useNavigate();
  const exercises = useExercises();
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [creating, setCreating] = useState(false);

  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (exercises ?? []).filter((e) => !n || e.name.toLowerCase().includes(n));
  }, [exercises, q]);

  return (
    <div className="pb-8">
      <div className="sticky top-0 z-10 bg-bg/95 px-2 pb-2 backdrop-blur">
        <div className="flex items-center justify-between py-1">
          <button type="button" onClick={() => nav('/')} className="press flex h-11 items-center gap-0.5 pr-3 text-acc">
            <Icon name="chevronLeft" size={26} />
            <span className="text-[17px]">Home</span>
          </button>
          <button type="button" onClick={() => setCreating(true)} className="press flex h-11 items-center gap-1 px-3 font-semibold text-acc">
            <Icon name="plus" size={20} /> Neu
          </button>
        </div>
        <h1 className="px-3 text-[30px] font-bold tracking-tight">Übungen</h1>
        <div className="relative mt-2 px-3">
          <Icon name="search" size={18} className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 text-dim" />
          <input className={`${inputCls} pl-10`} type="search" placeholder="Suchen" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <ul className="mx-4 divide-y divide-line/5 overflow-hidden rounded-2xl bg-s1 hairline">
        {list.map((e) => (
          <li key={e.id}>
            <button type="button" onClick={() => setEditing(e)} className="press flex min-h-[60px] w-full items-center gap-3 px-4 py-2 text-left active:bg-s2">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{e.name}</span>
                <span className="block truncate text-[13px] text-mute">
                  {e.primary_muscles.map((m) => MUSCLES[m]).join(', ')} · {e.equipment}
                </span>
              </span>
              <Icon name="chevronRight" size={18} className="text-dim" />
            </button>
          </li>
        ))}
      </ul>
      <ExerciseEditor open={!!editing} exercise={editing} onClose={() => setEditing(null)} />
      <ExerciseEditor open={creating} initialName={q.trim()} onClose={() => setCreating(false)} />
    </div>
  );
}
