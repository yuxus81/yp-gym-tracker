import { create } from 'zustand';

export interface Toast {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
  tone?: 'default' | 'record';
}

interface UiState {
  sessionOpen: boolean;
  startOpen: boolean;
  summaryId: string | null;
  setStartOpen: (v: boolean) => void;
  setSummary: (id: string | null) => void;
  toasts: Toast[];
  openSession: () => void;
  closeSession: () => void;
  toast: (t: Omit<Toast, 'id'>, ms?: number) => void;
  dismissToast: (id: number) => void;
}

let toastId = 0;

export const useUi = create<UiState>((set, get) => ({
  sessionOpen: false,
  startOpen: false,
  summaryId: null,
  setStartOpen: (v) => set({ startOpen: v }),
  setSummary: (id) => set({ summaryId: id }),
  toasts: [],
  openSession: () => set({ sessionOpen: true }),
  closeSession: () => set({ sessionOpen: false }),
  toast: (t, ms = 3800) => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { ...t, id }] }));
    setTimeout(() => get().dismissToast(id), ms);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));
