import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { HashRouter, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { LoginScreen } from '@/auth/LoginScreen';
import { Icon, type IconName } from '@/components/Icon';
import { useActiveSession } from '@/db/queries';
import { HistoryPage } from '@/features/history/HistoryPage';
import { SessionDetail } from '@/features/history/SessionDetail';
import { LibraryPage } from '@/features/plan/LibraryPage';
import { PlanDayEditor } from '@/features/plan/PlanDayEditor';
import { MiniSessionBar, SessionOverlay } from '@/features/session/SessionOverlay';
import { TodayPage } from '@/features/today/TodayPage';
import { isIos, isStandalone } from '@/lib/hooks';
import { useAuth } from '@/store/auth';
import { useUi } from '@/store/ui';

const TABS: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/training', label: 'Training', icon: 'dumbbell' },
  { to: '/verlauf', label: 'Verlauf', icon: 'history' },
];

/** Plantage und Bibliothek sind Unterseiten von Home. */
const HOME_PATHS = /^\/($|plan|bibliothek)/;

function TabBar() {
  const { setStartOpen, openSession } = useUi();
  const { pathname } = useLocation();
  // Die Tippflächen reichen bis zum unteren Rand; der Inhalt sitzt über dem Home-Balken.
  const item = 'press relative flex items-center justify-center gap-1.5 pb-[var(--tabbar-pad)]';
  return (
    <nav className="shrink-0 border-t border-line/[0.06] bg-bg/95 backdrop-blur" aria-label="Hauptnavigation">
      <div className="grid grid-cols-3" style={{ height: 'calc(var(--tabbar-h) + var(--tabbar-pad))' }}>
        {TABS.map((t) =>
          t.to === '/training' ? (
            <TrainingTab key={t.to} className={item} onStart={() => setStartOpen(true)} onOpen={openSession} />
          ) : (
            <NavLink key={t.to} to={t.to} end={t.to === '/'} className={item}>
              {({ isActive: exact }) => {
                const isActive = t.to === '/' ? HOME_PATHS.test(pathname) : exact;
                return (
                  <>
                    {isActive && (
                      <motion.span layoutId="tab-dot" className="absolute top-0 h-[2px] w-8 rounded-b-full bg-acc" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />
                    )}
                    <Icon name={t.icon} size={18} strokeWidth={isActive ? 2.3 : 1.9} className={isActive ? 'text-fg' : 'text-dim'} />
                    <span className={`text-[12px] font-semibold ${isActive ? 'text-fg' : 'text-dim'}`}>{t.label}</span>
                  </>
                );
              }}
            </NavLink>
          ),
        )}
      </div>
    </nav>
  );
}

/** Mittlerer Tab öffnet direkt die Trainingsauswahl bzw. die laufende Session. */
function TrainingTab({ onStart, onOpen, className }: { onStart: () => void; onOpen: () => void; className: string }) {
  const hasActive = useActiveFlag();
  return (
    <button type="button" onClick={hasActive ? onOpen : onStart} className={className} aria-label={hasActive ? 'Laufendes Training öffnen' : 'Training starten'}>
      <span className="flex h-[26px] items-center gap-1 rounded-full bg-acc pl-2 pr-2.5 text-onacc">
        <Icon name={hasActive ? 'timer' : 'plus'} size={16} strokeWidth={2.8} />
        <span className="text-[12px] font-bold">{hasActive ? 'Läuft' : 'Training'}</span>
      </span>
    </button>
  );
}

function useActiveFlag() {
  return !!useActiveSession();
}

function Toasts() {
  const { toasts, dismissToast } = useUi();
  return (
    <div className="pointer-events-none fixed inset-x-0 z-[90] mx-auto flex max-w-[480px] flex-col items-center gap-2 px-4" style={{ top: 'calc(10px + var(--safe-top))' }} aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 500, damping: 34 }}
            className={`pointer-events-auto flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 py-2 shadow-[0_10px_30px_rgb(0_0_0/0.5)] ${
              t.tone === 'record' ? 'bg-acc text-onacc' : 'bg-s3 text-fg'
            }`}
          >
            {t.tone === 'record' && <Icon name="trophy" size={20} />}
            <span className="flex-1 text-[15px] font-semibold">{t.text}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action!.run();
                  dismissToast(t.id);
                }}
                className="press h-9 rounded-lg px-2 text-[14px] font-bold text-acc"
              >
                {t.action.label}
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

const HINT_KEY = 'kb.installHint';

/** iOS löscht Website-Daten nach 7 Tagen Nichtnutzung — installierte Apps sind davon ausgenommen. */
function InstallHint() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      if (isIos() && !isStandalone() && !localStorage.getItem(HINT_KEY)) setShow(true);
    } catch {
      /* egal */
    }
  }, []);
  if (!show) return null;
  const close = () => {
    try {
      localStorage.setItem(HINT_KEY, '1');
    } catch {
      /* egal */
    }
    setShow(false);
  };
  return (
    <div className="mx-4 mb-2 rounded-2xl bg-warm/10 p-4 text-[14px] text-warm">
      <div className="font-semibold">Zum Home-Bildschirm hinzufügen</div>
      <p className="mt-1 text-warm/80">
        Tippe in Safari auf „Teilen“ und dann „Zum Home-Bildschirm“. Nur so bleiben deine Daten offline dauerhaft sicher und die App startet ohne Browser-Leiste.
      </p>
      <button type="button" onClick={close} className="press mt-2 h-9 rounded-lg bg-warm/15 px-3 font-semibold">
        Verstanden
      </button>
    </div>
  );
}

function Pages() {
  const loc = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const top = loc.pathname.split('/')[1] ?? '';
  const scrollPos = useRef(new Map<string, number>());

  // Scroll-Position je Bereich merken (zurück = gleiche Stelle)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = scrollPos.current.get(loc.pathname) ?? 0;
    const onScroll = () => scrollPos.current.set(loc.pathname, el.scrollTop);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [loc.pathname]);

  const depth = loc.pathname.split('/').filter(Boolean).length;

  return (
    <div ref={scrollRef} className="scroller relative min-h-0 flex-1" style={{ paddingTop: 'var(--safe-top)' }}>
      <InstallHint />
      {/* Kein Ausblenden der alten Seite: zwei Seiten gleichzeitig wirken unruhig. */}
      <motion.div
          key={depth > 1 ? loc.pathname : top}
          initial={{ opacity: 0, x: depth > 1 ? 40 : 0, y: depth > 1 ? 0 : 6 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 40 }}
        >
          <Routes location={loc}>
            <Route path="/" element={<TodayPage />} />
            <Route path="/plan" element={<Navigate to="/" replace />} />
            <Route path="/plan/:id" element={<PlanDayEditor />} />
            <Route path="/bibliothek" element={<LibraryPage />} />
            <Route path="/verlauf" element={<HistoryPage />} />
            <Route path="/verlauf/:id" element={<SessionDetail />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.div>
    </div>
  );
}

export function App() {
  const status = useAuth((s) => s.status);

  return (
    <HashRouter>
      <div className="mx-auto flex h-full max-w-[480px] flex-col bg-bg md:border-x md:border-line/[0.06]">
        {status === 'loading' ? null : status === 'signedOut' ? (
          <LoginScreen />
        ) : (
          <>
            <Pages />
            <MiniSessionBar />
            <TabBar />
            <SessionOverlay />
          </>
        )}
      </div>
      <Toasts />
    </HashRouter>
  );
}
