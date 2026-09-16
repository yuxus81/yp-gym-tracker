import { create } from 'zustand';

export interface Toast {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
  tone?: 'default' | 'record';
}

export interface RestTimer {
  endsAt: number;
  total: number;
  label: string;
}

interface UiState {
  sessionOpen: boolean;
  startOpen: boolean;
  summaryId: string | null;
  setStartOpen: (v: boolean) => void;
  setSummary: (id: string | null) => void;
  toasts: Toast[];
  rest: RestTimer | null;
  openSession: () => void;
  closeSession: () => void;
  toast: (t: Omit<Toast, 'id'>, ms?: number) => void;
  dismissToast: (id: number) => void;
  startRest: (seconds: number, label: string) => void;
  adjustRest: (deltaSec: number) => void;
  stopRest: () => void;
}

let toastId = 0;
const REST_KEY = 'kb.rest';

function loadRest(): RestTimer | null {
  try {
    const raw = localStorage.getItem(REST_KEY);
    if (!raw) return null;
    const r = JSON.parse(raw) as RestTimer;
    return r.endsAt > Date.now() - 60_000 ? r : null;
  } catch {
    return null;
  }
}

function saveRest(r: RestTimer | null) {
  try {
    if (r) localStorage.setItem(REST_KEY, JSON.stringify(r));
    else localStorage.removeItem(REST_KEY);
  } catch {
    /* egal */
  }
}

export const useUi = create<UiState>((set, get) => ({
  sessionOpen: false,
  startOpen: false,
  summaryId: null,
  setStartOpen: (v) => set({ startOpen: v }),
  setSummary: (id) => set({ summaryId: id }),
  toasts: [],
  // Pausentimer überlebt einen App-Neustart (Zeitstempel, kein Zähler).
  rest: loadRest(),
  openSession: () => set({ sessionOpen: true }),
  closeSession: () => set({ sessionOpen: false }),
  toast: (t, ms = 3800) => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { ...t, id }] }));
    setTimeout(() => get().dismissToast(id), ms);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
  startRest: (seconds, label) => {
    const rest = { endsAt: Date.now() + seconds * 1000, total: seconds, label };
    saveRest(rest);
    set({ rest });
  },
  adjustRest: (delta) => {
    const r = get().rest;
    if (!r) return;
    const rest = { ...r, endsAt: Math.max(Date.now(), r.endsAt + delta * 1000), total: Math.max(1, r.total + delta) };
    saveRest(rest);
    set({ rest });
  },
  stopRest: () => {
    saveRest(null);
    set({ rest: null });
  },
}));
