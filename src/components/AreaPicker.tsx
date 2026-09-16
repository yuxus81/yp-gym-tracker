import { AREAS, areaOfMuscle, loadFromAreas, sortAreas } from '@/domain/muscles';
import { haptic } from '@/lib/sound';
import { BodyMap } from './BodyMap';

/** Grobe Körperbereiche antippen — über die Knöpfe oder direkt auf der Figur. */
export function AreaPicker({ value, onChange, tint }: { value: string[]; onChange: (next: string[]) => void; tint: string }) {
  const toggle = (id: string) => {
    haptic(8);
    onChange(sortAreas(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]));
  };

  return (
    <div className="rounded-3xl bg-s1 p-4 hairline">
      <BodyMap
        load={loadFromAreas(value)}
        tint={tint}
        className="mx-auto h-44 w-full max-w-[260px]"
        label={value.length ? `Ausgewählt: ${value.length} Bereiche` : 'Körperfigur, noch nichts ausgewählt'}
        onPart={(m) => {
          const a = areaOfMuscle(m);
          if (a) toggle(a);
        }}
      />
      <p className="mb-3 mt-2 text-center text-[13px] text-mute">
        {value.length ? 'Tippe erneut, um einen Bereich abzuwählen.' : 'Tippe an, was dieser Tag trainiert.'}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {AREAS.map((a) => {
          const on = value.includes(a.id);
          return (
            <button
              key={a.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(a.id)}
              className={`press h-10 rounded-full px-4 text-[14px] font-semibold transition-colors ${on ? '' : 'bg-s2 text-mute'}`}
              style={on ? { backgroundColor: `rgb(${tint} / 0.22)`, color: `rgb(${tint})`, boxShadow: `inset 0 0 0 1.5px rgb(${tint} / 0.6)` } : undefined}
            >
              {a.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
