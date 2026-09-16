import type { Drop, SessionSet } from './types';

/** Geschätztes Ein-Wiederholungs-Maximum nach Epley. */
export function oneRepMax(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export function roundTo(value: number, step = 2.5): number {
  return Math.round(value / step) * step;
}

/** Nächste Drop-Stufe: 20 % leichter, auf 2,5 kg gerundet, nie unter 0. */
export function suggestDrop(prevWeight: number, prevReps: number | null): Drop {
  let w = Math.max(0, roundTo(prevWeight * 0.8));
  if (w === prevWeight && w > 0) w = Math.max(0, w - 2.5);
  return { weight: w, reps: prevReps ?? 8 };
}

/** Relativer Abstieg zur vorherigen Stufe in Prozent (negativ). */
export function dropPercent(from: number, to: number): number {
  if (from <= 0) return 0;
  return Math.round(((to - from) / from) * 100);
}

/** Volumen eines Satzes inkl. Drops; Aufwärmsätze zählen nicht. */
export function setVolume(s: Pick<SessionSet, 'kind' | 'weight' | 'reps' | 'drops'>): number {
  if (s.kind === 'warmup') return 0;
  let v = (s.weight ?? 0) * (s.reps ?? 0);
  if (s.kind === 'drop') for (const d of s.drops) v += d.weight * d.reps;
  return v;
}

export function bestOneRepMax(sets: Pick<SessionSet, 'kind' | 'weight' | 'reps'>[]): number {
  let best = 0;
  for (const s of sets) {
    if (s.kind === 'warmup') continue;
    best = Math.max(best, oneRepMax(s.weight ?? 0, s.reps ?? 0));
  }
  return best;
}

export function formatDuration(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h} h ${m.toString().padStart(2, '0')} min` : `${m} min`;
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = m.toString().padStart(2, '0');
  const ss = s.toString().padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

const nf = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 });
export function formatKg(v: number | null | undefined): string {
  return v == null ? '–' : nf.format(v);
}

const nfCompact = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });
export function formatVolume(kg: number): string {
  return kg >= 1000 ? `${nfCompact.format(kg / 1000)} t` : `${Math.round(kg)} kg`;
}

/** Montag = 0 … Sonntag = 6 */
export function weekdayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}
