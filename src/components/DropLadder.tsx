import { AnimatePresence, motion } from 'motion/react';
import { dropPercent, formatKg } from '@/domain/calc';
import type { Drop } from '@/domain/types';
import { Icon } from './Icon';

/**
 * Drop-Satz als absteigende Treppe: jede Stufe ein Balken, Höhe = Gewicht.
 * Zwischen den Stufen steht, wie viel leichter es wurde.
 */
export function DropLadder({
  main,
  drops,
  onEdit,
  onAdd,
  onRemove,
  readOnly = false,
  done = false,
}: {
  main: { weight: number | null; reps: number | null };
  drops: Drop[];
  onEdit?: (index: number) => void;
  onAdd?: () => void;
  onRemove?: (index: number) => void;
  readOnly?: boolean;
  done?: boolean;
}) {
  const steps = [{ weight: main.weight ?? 0, reps: main.reps ?? 0 }, ...drops];
  const max = Math.max(1, ...steps.map((s) => s.weight));
  const BAR_H = 64;

  return (
    <div className="pb-1 pt-2">
      <div className="flex items-end gap-1.5 overflow-x-auto pb-1 scroller" role="list" aria-label="Drop-Stufen">
        <AnimatePresence initial={false}>
          {steps.map((s, i) => {
            const h = Math.max(14, (s.weight / max) * BAR_H);
            const pct = i > 0 ? dropPercent(steps[i - 1].weight, s.weight) : 0;
            // Jede Stufe etwas blasser — die Treppe liest sich auch ohne Zahlen als „wird leichter“.
            const alpha = 1 - (i / Math.max(steps.length - 1, 3)) * 0.5;
            return (
              <motion.div
                key={i}
                role="listitem"
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                className="flex shrink-0 items-end gap-1.5"
              >
                {i > 0 && (
                  <div className="mb-1 flex w-7 flex-col items-center text-bad">
                    <Icon name="arrowDown" size={14} className="-rotate-45" />
                    <span className="num text-[11px] font-semibold">{pct}%</span>
                  </div>
                )}
                <button
                  type="button"
                  disabled={readOnly || i === 0}
                  onClick={() => i > 0 && onEdit?.(i - 1)}
                  className="press group relative flex w-[64px] flex-col items-center disabled:cursor-default"
                  aria-label={i === 0 ? `Startgewicht ${formatKg(s.weight)} kg` : `Stufe ${i}: ${formatKg(s.weight)} kg, ${s.reps} Wiederholungen`}
                >
                  <span className="num mb-1 text-[15px] font-bold leading-none">
                    {formatKg(s.weight)}
                    <span className="ml-0.5 text-[10px] font-medium text-mute">kg</span>
                  </span>
                  <motion.span
                    className="relative flex w-full items-start justify-center overflow-hidden rounded-lg pt-1"
                    initial={false}
                    animate={{ height: h }}
                    transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                    style={{ backgroundColor: `rgb(var(--acc) / ${alpha.toFixed(2)})`, opacity: done ? 1 : 0.85 }}
                  >
                    <span className="num text-[13px] font-bold text-onacc">×{s.reps || '–'}</span>
                  </motion.span>
                  {i > 0 && !readOnly && onRemove && (
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`Stufe ${i} entfernen`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(i - 1);
                      }}
                      className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-br-lg rounded-tl-lg bg-black/35 text-white"
                    >
                      <Icon name="x" size={12} strokeWidth={3} />
                    </span>
                  )}
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {!readOnly && onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="press ml-1.5 flex h-[64px] w-[56px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-line/20 text-mute"
          >
            <Icon name="plus" size={18} />
            <span className="text-[11px] font-medium">Drop</span>
          </button>
        )}
      </div>
    </div>
  );
}
