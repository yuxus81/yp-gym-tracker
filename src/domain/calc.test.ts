import { describe, expect, it } from 'vitest';
import { dropPercent, formatClock, formatDuration, oneRepMax, setVolume, suggestDrop, weekdayIndex } from './calc';

describe('calc', () => {
  it('oneRepMax nach Epley', () => {
    expect(oneRepMax(100, 1)).toBe(100);
    expect(oneRepMax(100, 10)).toBeCloseTo(133.33, 1);
    expect(oneRepMax(0, 5)).toBe(0);
  });

  it('Drop-Vorschlag 20 % leichter, auf 2,5 gerundet', () => {
    expect(suggestDrop(60, 8)).toEqual({ weight: 47.5, reps: 8 });
    expect(suggestDrop(10, null)).toEqual({ weight: 7.5, reps: 8 });
    expect(suggestDrop(2.5, 10).weight).toBe(0);
    expect(suggestDrop(0, 10).weight).toBe(0);
  });

  it('Drop-Prozent', () => {
    expect(dropPercent(60, 48)).toBe(-20);
    expect(dropPercent(0, 10)).toBe(0);
  });

  it('Volumen: Aufwärmen zählt nicht, Drops zählen mit', () => {
    expect(setVolume({ kind: 'warmup', weight: 40, reps: 10, drops: [] })).toBe(0);
    expect(setVolume({ kind: 'working', weight: 50, reps: 10, drops: [] })).toBe(500);
    expect(setVolume({ kind: 'drop', weight: 50, reps: 10, drops: [{ weight: 40, reps: 8 }] })).toBe(820);
  });

  it('Dauer und Uhr', () => {
    expect(formatDuration(65 * 60000)).toBe('1 h 05 min');
    expect(formatDuration(42 * 60000)).toBe('42 min');
    expect(formatClock(3725000)).toBe('1:02:05');
    expect(formatClock(65000)).toBe('01:05');
  });

  it('Wochentag Montag = 0', () => {
    expect(weekdayIndex(new Date(2026, 8, 14))).toBe(0); // Mo 14.09.2026
    expect(weekdayIndex(new Date(2026, 8, 20))).toBe(6); // So
  });
});
