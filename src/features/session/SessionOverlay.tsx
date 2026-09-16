import { AnimatePresence, motion } from 'motion/react';
import { Icon } from '@/components/Icon';
import { useActiveSession } from '@/db/queries';
import { formatClock } from '@/domain/calc';
import { dayColor } from '@/domain/types';
import { useNow, useWakeLock } from '@/lib/hooks';
import { useUi } from '@/store/ui';
import { SessionScreen } from './SessionScreen';
import { SessionSummary } from './SessionSummary';
import { StartSheet } from './StartSheet';

/** Hält laufende Session, Mini-Leiste, Start-Auswahl und Abschlussbildschirm zusammen. */
export function SessionOverlay() {
  const active = useActiveSession();
  const { sessionOpen, closeSession, summaryId, setSummary } = useUi();
  useWakeLock(!!active);

  const showFull = (sessionOpen && !!active) || !!summaryId;

  return (
    <>
      <AnimatePresence>
        {showFull && (
          <motion.div
            key="session"
            className="fixed inset-0 z-40 mx-auto max-w-[480px]"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%', transition: { duration: 0.24, ease: [0.4, 0, 1, 1] } }}
            transition={{ type: 'spring', stiffness: 360, damping: 40 }}
          >
            {summaryId ? (
              <SessionSummary
                id={summaryId}
                onDone={() => {
                  setSummary(null);
                  closeSession();
                }}
              />
            ) : (
              active && <SessionScreen session={active} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <StartSheet />
    </>
  );
}

/** Leiste über der Tab-Bar, solange eine Session im Hintergrund läuft. */
export function MiniSessionBar() {
  const active = useActiveSession();
  const { sessionOpen, openSession } = useUi();
  const now = useNow(1000, !!active);
  const visible = !!active && !sessionOpen;

  return (
    <AnimatePresence>
      {visible && active && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 460, damping: 36 }}
          className="px-3 pb-2"
        >
          <button
            type="button"
            onClick={openSession}
            className="press flex h-14 w-full items-center gap-3 rounded-2xl bg-s2 px-4 text-left shadow-[0_8px_30px_rgb(0_0_0/0.45)] hairline"
          >
            <span className="relative grid h-3 w-3 place-items-center">
              <span className="absolute h-3 w-3 animate-ping rounded-full opacity-60" style={{ backgroundColor: dayColor(active.color) }} />
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dayColor(active.color) }} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold">{active.name}</span>
              <span className="block text-[12px] text-mute">Training läuft · antippen zum Öffnen</span>
            </span>
            <span className="num text-[18px] font-bold">{formatClock(now - Date.parse(active.started_at))}</span>
            <Icon name="chevronRight" size={18} className="-rotate-90 text-dim" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
