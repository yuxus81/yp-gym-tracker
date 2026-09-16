import { formatDistanceToNowStrict } from 'date-fns';
import { de } from 'date-fns/locale';
import { usePendingCount } from '@/db/queries';
import { useNow, useOnline } from '@/lib/hooks';
import { syncNow, useSync } from '@/sync/sync';
import { Icon } from './Icon';

/** Zeigt jederzeit, ob die Daten sicher sind — auf dem Gerät und/oder in der Cloud. */
export function SyncPill() {
  const { phase, lastSyncedAt } = useSync();
  const pending = usePendingCount();
  const online = useOnline();
  useNow(30_000);

  let text: string;
  let tone = 'text-mute';
  let icon: 'cloud' | 'cloudOff' | 'refresh' = 'cloud';

  if (phase === 'device') {
    text = 'Nur auf diesem Gerät';
    icon = 'cloudOff';
  } else if (!online || phase === 'offline') {
    icon = 'cloudOff';
    text = pending > 0 ? `Offline · ${pending} Änderung${pending === 1 ? '' : 'en'} sicher auf dem Gerät` : 'Offline · alles gespeichert';
    tone = pending > 0 ? 'text-warm' : 'text-mute';
  } else if (phase === 'syncing') {
    icon = 'refresh';
    text = 'Gleiche ab …';
  } else if (phase === 'error') {
    icon = 'cloudOff';
    text = `Abgleich hakt · ${pending} auf dem Gerät`;
    tone = 'text-bad';
  } else if (pending > 0) {
    icon = 'refresh';
    text = `${pending} Änderung${pending === 1 ? '' : 'en'} warten`;
  } else {
    text = lastSyncedAt
      ? `Gesichert · ${formatDistanceToNowStrict(lastSyncedAt, { locale: de, addSuffix: true }).replace('vor 0 Sekunden', 'gerade eben')}`
      : 'Gesichert';
    tone = 'text-ok';
  }

  return (
    <button
      type="button"
      onClick={() => void syncNow()}
      className={`press relative inline-flex h-7 max-w-full items-center gap-1.5 rounded-full bg-s1 px-2.5 text-[12px] font-medium hairline after:absolute after:-inset-y-2 after:inset-x-0 after:content-[''] ${tone}`}
      aria-label={`Sync-Status: ${text}. Antippen zum Abgleichen.`}
    >
      <Icon name={icon} size={14} className={phase === 'syncing' ? 'animate-spin' : ''} />
      <span className="truncate">{text}</span>
    </button>
  );
}
