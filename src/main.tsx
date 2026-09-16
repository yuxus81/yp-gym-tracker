import '@fontsource-variable/inter';
import '@fontsource-variable/archivo';
import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { initAuth } from './store/auth';
import { startSync } from './sync/sync';
import { unlockAudio } from './lib/sound';

// Pinch-Zoom blockieren (iOS ignoriert user-scalable=no seit iOS 10).
for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
}
// Kein Kontextmenü (Lange-Drücken) außerhalb von Eingabefeldern
document.addEventListener('contextmenu', (e) => {
  const t = e.target as HTMLElement;
  if (!t.closest('input, textarea')) e.preventDefault();
});
document.addEventListener('pointerdown', unlockAudio, { once: true });

// Service Worker: App läuft danach komplett ohne Netz. Updates kommen still beim nächsten Start.
if (import.meta.env.PROD) registerSW({ immediate: true });

initAuth();
startSync();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
