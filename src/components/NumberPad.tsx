import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Sheet } from './Sheet';
import { Icon } from './Icon';
import { formatKg } from '@/domain/calc';

type FieldKey = 'weight' | 'reps';

function toStr(v: number | null): string {
  return v == null ? '' : String(v).replace('.', ',');
}

function toNum(s: string): number | null {
  if (s === '' || s === ',') return null;
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/**
 * Eigene Zahlentastatur statt iOS-Tastatur: große Tasten, kein Hineinzoomen,
 * nichts wird verdeckt. Gewicht und Wiederholungen in einem Durchgang.
 */
export function NumberPad({
  open,
  onClose,
  title,
  subtitle,
  weight,
  reps,
  ghost,
  startField = 'weight',
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  weight: number | null;
  reps: number | null;
  ghost?: { weight: number | null; reps: number | null };
  startField?: FieldKey;
  onSave: (v: { weight: number | null; reps: number | null }) => void;
}) {
  const [field, setField] = useState<FieldKey>(startField);
  const [vals, setVals] = useState({ weight: toStr(weight), reps: toStr(reps) });
  // Erste Taste ersetzt den alten Wert (wie ein markiertes Feld).
  const [fresh, setFresh] = useState(true);

  useEffect(() => {
    if (open) {
      setField(startField);
      setVals({ weight: toStr(weight), reps: toStr(reps) });
      setFresh(true);
    }
  }, [open, startField, weight, reps]);

  const cur = vals[field];

  const press = (k: string) => {
    setVals((v) => {
      let s = fresh ? '' : v[field];
      if (k === ',') {
        if (field === 'reps' || s.includes(',')) return v;
        s = (s || '0') + ',';
      } else {
        if (s.includes(',') && s.split(',')[1].length >= 2) return v;
        if (s.replace(',', '').length >= 5) return v;
        s = s === '0' ? k : s + k;
      }
      return { ...v, [field]: s };
    });
    setFresh(false);
  };

  const back = () => {
    setVals((v) => ({ ...v, [field]: fresh ? '' : v[field].slice(0, -1) }));
    setFresh(false);
  };

  const bump = (delta: number) => {
    setVals((v) => {
      const base = toNum(v[field]) ?? (field === 'weight' ? ghost?.weight : ghost?.reps) ?? 0;
      const next = Math.max(0, Math.round((base + delta) * 100) / 100);
      return { ...v, [field]: toStr(next) };
    });
    setFresh(false);
  };

  const commit = () => {
    onSave({ weight: toNum(vals.weight), reps: toNum(vals.reps) });
    onClose();
  };

  const next = () => {
    if (field === 'weight') {
      setField('reps');
      setFresh(true);
    } else commit();
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0'];
  const steps = field === 'weight' ? [-2.5, -1.25, 1.25, 2.5] : [-1, 1, 2, 5];

  return (
    <Sheet open={open} onClose={onClose} z={80} title={<span>{title}</span>}>
      {subtitle && <p className="-mt-1 mb-3 text-center text-[13px] text-mute">{subtitle}</p>}
      <div className="grid grid-cols-2 gap-2">
        {(['weight', 'reps'] as FieldKey[]).map((f) => {
          const active = f === field;
          const g = f === 'weight' ? ghost?.weight : ghost?.reps;
          const shown = vals[f];
          return (
            <button
              key={f}
              type="button"
              onClick={() => {
                setField(f);
                setFresh(true);
              }}
              className={`press relative flex h-[84px] flex-col items-start justify-center rounded-2xl px-4 text-left ${
                active ? 'bg-s2 shadow-[inset_0_0_0_2px_rgb(var(--acc))]' : 'bg-s2/60'
              }`}
            >
              <span className="text-[12px] font-semibold uppercase tracking-wider text-mute">{f === 'weight' ? 'Gewicht · kg' : 'Wiederholungen'}</span>
              <span className={`num text-[34px] font-bold leading-none ${shown ? 'text-fg' : 'text-dim'}`}>
                {shown || (g != null ? (f === 'weight' ? formatKg(g) : g) : '0')}
                {active && (
                  <motion.span
                    className="ml-0.5 inline-block h-7 w-[3px] translate-y-0.5 rounded bg-acc align-baseline"
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {steps.map((d) => (
          <button key={d} type="button" onClick={() => bump(d)} className="press num h-10 rounded-xl bg-s2 text-[15px] font-semibold text-mute active:bg-s3">
            {d > 0 ? '+' : '−'}
            {formatKg(Math.abs(d))}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => press(k)}
            disabled={k === ',' && field === 'reps'}
            className="press num h-[58px] rounded-2xl bg-s2 text-[26px] font-semibold active:bg-s3 disabled:opacity-25"
          >
            {k}
          </button>
        ))}
        <button type="button" aria-label="Löschen" onClick={back} className="press grid h-[58px] place-items-center rounded-2xl bg-s2 text-mute active:bg-s3">
          <Icon name="backspace" size={26} />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_2fr] gap-2 pb-1">
        <button type="button" onClick={commit} className="press h-14 rounded-2xl bg-s2 text-[16px] font-semibold">
          Speichern
        </button>
        <button type="button" onClick={next} className="press h-14 rounded-2xl bg-acc text-[17px] font-bold text-onacc">
          {field === 'weight' ? 'Weiter zu Wdh.' : 'Fertig'}
        </button>
      </div>
      {cur === '' && ghost && (ghost.weight != null || ghost.reps != null) && (
        <p className="mt-2 text-center text-[12px] text-dim">Leer gelassen = Wert vom letzten Mal</p>
      )}
    </Sheet>
  );
}
