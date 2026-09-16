/**
 * Kurze Töne ohne Audiodateien. iOS gibt Audio erst nach einer Berührung frei —
 * deshalb wird der Kontext beim ersten Tippen entsperrt.
 */
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

export function unlockAudio() {
  const c = getCtx();
  if (c && c.state === 'suspended') void c.resume();
}

function tone(freq: number, start: number, dur: number, gain = 0.18) {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  const t = c.currentTime + start;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export function playRestDone() {
  tone(880, 0, 0.16);
  tone(880, 0.22, 0.16);
  tone(1320, 0.44, 0.32);
}

export function playTick() {
  tone(1200, 0, 0.05, 0.06);
}

export function playRecord() {
  tone(660, 0, 0.12);
  tone(880, 0.1, 0.12);
  tone(1175, 0.2, 0.28);
}

export function haptic(ms = 10) {
  // Android kann vibrieren, iOS-Safari nicht — dort passiert einfach nichts.
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* egal */
  }
}
