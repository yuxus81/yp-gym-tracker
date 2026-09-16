import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { Icon } from '@/components/Icon';
import { formatClock } from '@/domain/calc';
import { useNow } from '@/lib/hooks';
import { playRestDone } from '@/lib/sound';
import { useUi } from '@/store/ui';

/** Pausentimer als schwebende Leiste. Läuft über Zeitstempel — übersteht Sperrbildschirm und Neustart. */
export function RestBar({ compact = false }: { compact?: boolean }) {
  const { rest, adjustRest, stopRest } = useUi();
  const now = useNow(250, !!rest);
  const rang = useRef<number | null>(null);

  const left = rest ? rest.endsAt - now : 0;
  const over = rest ? left <= 0 : false;

  useEffect(() => {
    if (!rest || !over) return;
    if (rang.current !== rest.endsAt) {
      rang.current = rest.endsAt;
      // Nur klingeln, wenn das Ende gerade erst erreicht wurde (nicht beim Öffnen Minuten später).
      if (Date.now() - rest.endsAt < 3000) playRestDone();
    }
    const t = setTimeout(stopRest, Math.max(0, rest.endsAt + 45_000 - Date.now()));
    return () => clearTimeout(t);
  }, [rest, over, stopRest]);

  const progress = rest ? Math.min(1, Math.max(0, 1 - left / (rest.total * 1000))) : 0;

  return (
    <AnimatePresence>
      {rest && (
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0, transition: { duration: 0.15 } }}
          transition={{ type: 'spring', stiffness: 460, damping: 36 }}
          className={`relative overflow-hidden rounded-2xl ${over ? 'bg-acc text-onacc' : 'bg-s2 text-fg'} shadow-[0_8px_30px_rgb(0_0_0/0.45)]`}
          role="timer"
          aria-live="polite"
        >
          {!over && (
            <div
              className="absolute inset-y-0 left-0 bg-acc/20"
              style={{ width: `${progress * 100}%`, transition: 'width 250ms linear' }}
            />
          )}
          <div className={`relative flex items-center gap-2 px-3 ${compact ? 'h-12' : 'h-14'}`}>
            <Icon name="timer" size={20} className={over ? '' : 'text-acc'} />
            <div className="min-w-0 flex-1">
              <div className="num text-[22px] font-bold leading-none">{over ? 'Los geht’s' : formatClock(left + 999)}</div>
              {!compact && <div className={`truncate text-[12px] ${over ? 'text-onacc/70' : 'text-mute'}`}>Pause · {rest.label}</div>}
            </div>
            {!over && (
              <>
                <button type="button" onClick={() => adjustRest(-15)} className="press num h-10 rounded-xl bg-bg/40 px-3 text-[14px] font-semibold">
                  −15
                </button>
                <button type="button" onClick={() => adjustRest(15)} className="press num h-10 rounded-xl bg-bg/40 px-3 text-[14px] font-semibold">
                  +15
                </button>
              </>
            )}
            <button type="button" aria-label="Pause beenden" onClick={stopRest} className="press grid h-10 w-10 place-items-center rounded-xl bg-bg/30">
              <Icon name="x" size={18} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
