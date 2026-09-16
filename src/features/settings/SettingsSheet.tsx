import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { Logo } from '@/components/Logo';
import { Sheet } from '@/components/Sheet';
import { Button } from '@/components/ui';
import { db, SYNC_TABLES } from '@/db/dexie';
import { usePendingCount } from '@/db/queries';
import { isStandalone } from '@/lib/hooks';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth';
import { syncNow, useSync } from '@/sync/sync';

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { status, email, signOut } = useAuth();
  const { phase, lastSyncedAt, error } = useSync();
  const pending = usePendingCount();
  const [confirm, setConfirm] = useState(false);

  const exportJson = async () => {
    const data: Record<string, unknown> = { exportiert: new Date().toISOString(), app: 'YP Gym Tracker' };
    for (const t of SYNC_TABLES) data[t] = await db.table(t).toArray();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yp-gym-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  return (
    <Sheet open={open} onClose={() => { setConfirm(false); onClose(); }} title="Einstellungen">
      <div className="space-y-5 pb-2 pt-1">
        <section className="rounded-2xl bg-s2/60 p-4">
          <div className="text-[12px] font-semibold uppercase tracking-wider text-dim">Konto</div>
          <div className="mt-1 truncate font-medium">{status === 'device' ? 'Gerätemodus (Supabase nicht eingerichtet)' : email || 'Angemeldet'}</div>
        </section>

        <section className="rounded-2xl bg-s2/60 p-4">
          <div className="text-[12px] font-semibold uppercase tracking-wider text-dim">Datensicherung</div>
          <dl className="mt-2 space-y-1.5 text-[14px]">
            <div className="flex justify-between gap-3">
              <dt className="text-mute">Ungesicherte Änderungen</dt>
              <dd className={`num font-semibold ${pending ? 'text-warm' : 'text-ok'}`}>{pending}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-mute">Letzter Abgleich</dt>
              <dd className="num">{lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '–'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-mute">Als App installiert</dt>
              <dd className={isStandalone() ? 'text-ok' : 'text-warm'}>{isStandalone() ? 'Ja' : 'Nein'}</dd>
            </div>
          </dl>
          {phase === 'error' && error && <p className="mt-2 text-[12px] text-bad">{error}</p>}
          <p className="mt-3 text-[12px] leading-relaxed text-dim">
            Alles wird zuerst auf dem Handy gespeichert und automatisch hochgeladen, sobald Netz da ist. Ohne Netz geht nichts verloren.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button size="sm" icon="refresh" onClick={() => void syncNow()} disabled={!supabase}>
              Jetzt abgleichen
            </Button>
            <Button size="sm" icon="download" onClick={exportJson}>
              Backup (JSON)
            </Button>
          </div>
        </section>

        {status === 'signedIn' &&
          (confirm ? (
            <div className="space-y-2 rounded-2xl bg-bad/10 p-4">
              <p className="text-[14px] text-bad">
                {pending > 0
                  ? `Achtung: ${pending} Änderung${pending === 1 ? ' ist' : 'en sind'} noch nicht hochgeladen und gehen beim Abmelden verloren.`
                  : 'Die Daten auf diesem Gerät werden entfernt. In der Cloud bleibt alles erhalten.'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => setConfirm(false)}>Abbrechen</Button>
                <Button variant="danger" onClick={() => void signOut()}>
                  Abmelden
                </Button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirm(true)} className="press flex h-12 w-full items-center justify-center gap-2 rounded-xl text-bad">
              <Icon name="logout" size={18} /> Abmelden
            </button>
          ))}

        <div className="flex flex-col items-center gap-1 pt-2">
          <Logo className="h-8 opacity-70" />
          <p className="text-[11px] text-dim">YP Gym Tracker · v{__APP_VERSION__}</p>
        </div>
      </div>
    </Sheet>
  );
}
