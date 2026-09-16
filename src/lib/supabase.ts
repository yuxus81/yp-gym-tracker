import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const AUTH_STORAGE_KEY = 'kraftbuch-auth';

/**
 * Ohne Supabase-Zugangsdaten läuft die App im reinen Gerätemodus (Entwicklung/Vorschau).
 * Das ist kein Fehlerzustand: alle Daten liegen ohnehin zuerst lokal.
 */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          storageKey: AUTH_STORAGE_KEY,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    : null;

if (!supabase && import.meta.env.PROD) {
  console.error('[yp-gym] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY fehlen — nur Gerätemodus.');
}

/**
 * Liest die zuletzt gespeicherte Anmeldung direkt aus dem Speicher — ohne Netz.
 * Wichtig für den Start im Funkloch: Ein abgelaufenes Token ist kein Grund, die App zu sperren.
 */
export function cachedUser(): { id: string; email: string } | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { user?: { id?: string; email?: string } };
    if (!parsed.user?.id) return null;
    return { id: parsed.user.id, email: parsed.user.email ?? '' };
  } catch {
    return null;
  }
}
