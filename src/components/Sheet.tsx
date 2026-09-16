import { AnimatePresence, motion, useDragControls, type PanInfo } from 'motion/react';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Bottom-Sheet wie unter iOS: fährt von unten ein, lässt sich am Griff nach unten
 * wegwischen, Hintergrund abgedunkelt. Inhalt scrollt selbst.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  tall = false,
  z = 60,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  tall?: boolean;
  z?: number;
}) {
  const drag = useDragControls();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 600) onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 flex justify-center" style={{ zIndex: z }}>
          <motion.div
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.16 } }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={`absolute bottom-0 flex w-full max-w-[480px] flex-col rounded-t-3xl bg-s1 hairline ${tall ? 'h-[92dvh]' : 'max-h-[88dvh]'}`}
            initial={{ y: '100%' }}
            animate={{ y: 0, transition: { type: 'spring', stiffness: 420, damping: 40 } }}
            exit={{ y: '100%', transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }}
            drag="y"
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.9 }}
            onDragEnd={onDragEnd}
          >
            <div
              className="flex shrink-0 cursor-grab touch-none flex-col items-center px-5 pb-2 pt-2.5"
              onPointerDown={(e) => drag.start(e)}
            >
              <div className="mb-2 h-1.5 w-10 rounded-full bg-s3" />
              {title && <div className="w-full text-center text-[17px] font-semibold">{title}</div>}
            </div>
            <div className="scroller min-h-0 flex-1 px-5 pb-4">{children}</div>
            {footer && (
              <div className="shrink-0 border-t border-line/5 px-5 pt-3" style={{ paddingBottom: 'calc(12px + var(--safe-bottom))' }}>
                {footer}
              </div>
            )}
            {!footer && <div className="shrink-0" style={{ height: 'var(--safe-bottom)' }} />}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
