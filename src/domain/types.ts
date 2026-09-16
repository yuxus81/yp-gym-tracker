import type { MuscleId } from './muscles';

/** Felder, die jede synchronisierte Zeile trägt. */
export interface SyncRow {
  id: string;
  updated_at: string;
  deleted_at: string | null;
  /** Nur lokal: 1 = noch nicht vom Server bestätigt. */
  dirty: 0 | 1;
}

export interface Exercise extends SyncRow {
  name: string;
  primary_muscles: MuscleId[];
  secondary_muscles: MuscleId[];
  equipment: string;
  rest_sec: number;
  notes: string;
}

export interface PlanDay extends SyncRow {
  name: string;
  color: number;
  /** 0 = Montag … 6 = Sonntag */
  weekdays: number[];
  sort: number;
  archived: boolean;
  notes: string;
}

export interface PlanDayExercise extends SyncRow {
  plan_day_id: string;
  exercise_id: string;
  sort: number;
  target_sets: number;
  reps_min: number;
  reps_max: number;
  rest_sec: number | null;
}

export interface Session extends SyncRow {
  plan_day_id: string | null;
  /** Momentaufnahme — bleibt lesbar, auch wenn der Plantag später gelöscht wird. */
  name: string;
  color: number;
  started_at: string;
  ended_at: string | null;
  exercise_ids: string[];
  notes: string;
  energy: number | null;
  bodyweight: number | null;
}

export type SetKind = 'warmup' | 'working' | 'drop' | 'failure';

export interface Drop {
  weight: number;
  reps: number;
}

export interface SessionSet extends SyncRow {
  session_id: string;
  exercise_id: string;
  set_index: number;
  kind: SetKind;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  drops: Drop[];
  done_at: string | null;
}

export const SET_KINDS: { id: SetKind; short: string; label: string }[] = [
  { id: 'working', short: 'A', label: 'Arbeitssatz' },
  { id: 'warmup', short: 'W', label: 'Aufwärmen' },
  { id: 'drop', short: 'D', label: 'Drop-Satz' },
  { id: 'failure', short: 'V', label: 'Bis Versagen' },
];

/** Gedämpfte Erkennungsfarben für Plantage (RGB-Tripel für rgb(... / a)). */
export const DAY_COLORS: { name: string; rgb: string }[] = [
  { name: 'Ziegel', rgb: '232 120 92' },
  { name: 'Salbei', rgb: '134 190 150' },
  { name: 'Stahl', rgb: '124 164 222' },
  { name: 'Senf', rgb: '222 188 96' },
  { name: 'Flieder', rgb: '178 146 220' },
  { name: 'Petrol', rgb: '88 186 196' },
];

export function dayColor(i: number, alpha = 1): string {
  const c = DAY_COLORS[((i % DAY_COLORS.length) + DAY_COLORS.length) % DAY_COLORS.length];
  return `rgb(${c.rgb} / ${alpha})`;
}

export const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
