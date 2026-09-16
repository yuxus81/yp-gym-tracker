import { create } from 'zustand';
import { cachedUser, supabase } from '@/lib/supabase';
import { clearAll, getMeta, setMeta } from '@/db/dexie';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn' | 'device';

interface AuthState {
  status: AuthStatus;
  userId: string | null;
  email: string;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

/** Gehören die lokalen Daten einem anderen Konto, werden sie verworfen. */
async function claimLocalData(userId: string) {
  const owner = await getMeta<string>('owner');
  if (owner && owner !== userId) await clearAll();
  await setMeta('owner', userId);
}

export const useAuth = create<AuthState>((set) => ({
  status: 'loading',
  userId: null,
  email: '',

  async signIn(email, password) {
    if (!supabase) return 'Supabase ist nicht eingerichtet.';
    if (!navigator.onLine) return 'Für die erste Anmeldung brauchst du Internet.';
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.user) {
      if (error?.message.toLowerCase().includes('invalid')) return 'E-Mail oder Passwort stimmt nicht.';
      return error?.message ?? 'Anmeldung fehlgeschlagen.';
    }
    await claimLocalData(data.user.id);
    set({ status: 'signedIn', userId: data.user.id, email: data.user.email ?? '' });
    return null;
  },

  async signOut() {
    if (supabase) await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
    await clearAll();
    set({ status: 'signedOut', userId: null, email: '' });
  },
}));

export function initAuth() {
  if (!supabase) {
    useAuth.setState({ status: 'device', userId: 'device', email: '' });
    return;
  }
  // Sofort aus dem Speicher entscheiden — kein Netz-Warten beim Start.
  const cached = cachedUser();
  if (cached) {
    useAuth.setState({ status: 'signedIn', userId: cached.id, email: cached.email });
    void claimLocalData(cached.id);
  } else {
    useAuth.setState({ status: 'signedOut' });
  }

  supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      useAuth.setState({ status: 'signedIn', userId: session.user.id, email: session.user.email ?? '' });
    } else if (event === 'SIGNED_OUT') {
      // Server hat die Anmeldung wirklich beendet (z. B. Passwort geändert).
      // Lokale Daten bleiben erhalten und werden nach erneuter Anmeldung hochgeladen.
      useAuth.setState({ status: 'signedOut', userId: null });
    }
  });
}
