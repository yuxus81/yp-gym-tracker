import { memo } from 'react';
import type { MuscleId, MuscleLoad } from '@/domain/muscles';

/**
 * Stilisierte Muskelfigur, vorne und hinten. Jede Region wird nur für die linke
 * Körperhälfte gezeichnet und gespiegelt. Inaktive Muskeln bilden die neutrale Figur,
 * aktive werden je nach Belastung eingefärbt (Übergang gestaffelt).
 */

type Part = { m: MuscleId; d: string };

const FRONT: Part[] = [
  { m: 'traps', d: 'M44.5 29 L36 36 L45 35.5 Z' },
  { m: 'side_delts', d: 'M34 36 C27 36 23 41 23 49 L27 51 C27 45 29 40 34 36 Z' },
  { m: 'front_delts', d: 'M34.6 36.4 C30 40 28 45 28 51 L33 52 C33 46.5 36 41.5 40.5 38.4 Z' },
  { m: 'chest', d: 'M49.2 38 L41.8 38 C36.5 41 34 46 34.5 52.5 C38.5 57.5 45 57.5 49.2 55.2 Z' },
  { m: 'biceps', d: 'M26.4 53.2 L33 54.2 C34 60 33.2 66.6 31.2 72 L25.4 71 C23.6 65 23.8 58.4 26.4 53.2 Z' },
  { m: 'forearms', d: 'M24.6 74 L31 75 C31 82 29.4 90 27.4 97 L22.4 96.2 C21.2 88 21.6 80 24.6 74 Z' },
  { m: 'abs', d: 'M49.2 58.5 L41.6 58.5 C40.6 68 40.8 80 42.6 91 L49.2 95 Z' },
  { m: 'obliques', d: 'M39.6 58.4 L35.4 57.4 C34.2 66 34.8 76 36.2 86 L41 92 C39.2 80 39 68 39.6 58.4 Z' },
  { m: 'adductors', d: 'M49.2 101 L44 99.5 C44.6 108 46.4 117 48.4 124 L49.2 124 Z' },
  { m: 'quads', d: 'M42.2 98 L36.4 94.4 C32.4 104 31.2 120 33.2 138 L41.2 140 C43.8 133 45.8 126 46.6 123 C44.8 115 43 106 42.2 98 Z' },
  { m: 'calves', d: 'M34.2 150 L40.8 150 C41.8 161 41 174 39.2 187 L35.4 187 C33.4 174 32.6 161 34.2 150 Z' },
];

const BACK: Part[] = [
  { m: 'traps', d: 'M50 27.5 L44 29 L35.6 36 L44 40 L50 52.5 Z' },
  { m: 'side_delts', d: 'M34 36 C27 36 23 41 23 49 L27 51 C27 45 29 40 34 36 Z' },
  { m: 'rear_delts', d: 'M34.6 36.8 C30 40.4 28 45.2 28 51 L33.2 51.4 C34 46.4 36.2 42.4 39.6 39.6 Z' },
  { m: 'upper_back', d: 'M43.4 41 L38.6 40.6 C36.6 44 36.4 48.4 37.4 52.4 L47.6 56.4 L49.2 53 Z' },
  { m: 'lats', d: 'M36.4 54 L47.6 58.2 C47 66.4 45.2 74 43.2 80.4 C39.2 74.4 36.6 66.4 35.6 58.4 Z' },
  { m: 'triceps', d: 'M26.4 53.2 L33 54.2 C34 60 33.2 66.6 31.2 72 L25.4 71 C23.6 65 23.8 58.4 26.4 53.2 Z' },
  { m: 'forearms', d: 'M24.6 74 L31 75 C31 82 29.4 90 27.4 97 L22.4 96.2 C21.2 88 21.6 80 24.6 74 Z' },
  { m: 'lower_back', d: 'M49.2 60.4 L45.4 62.4 C43.6 70 43.6 78 44.6 86 L49.2 88 Z' },
  { m: 'glutes', d: 'M49.2 92 L42.4 90.4 C36.4 94 34.4 102 36.2 110 C40.2 114.4 46 113.6 49.2 110.4 Z' },
  { m: 'hamstrings', d: 'M47.4 114.6 C43.4 116.6 39.4 115 35.4 112.6 C33.2 122 33.2 132 35.2 140 L42.2 140 C45.2 132 47 124 47.4 114.6 Z' },
  { m: 'calves', d: 'M34.4 149 C32.2 157 33 168 36 179 L40.2 179 C43.2 168 43.2 157 41.2 149 Z' },
];

/** Neutrale Teile (Kopf, Hände, Knie, Füße) — geben der Figur Halt. */
const NEUTRAL_HALF = [
  'M44.6 27 L55.4 27 L55.4 33 L44.6 33 Z',
  'M22.2 98.6 C20.4 100 20.6 104.4 22.6 106 C25 107 26.8 104 26.6 100 Z',
  'M34 141.6 C33.4 144 33.8 146.6 35 148 L40.6 148 C41.6 146.6 41.8 144 41.4 141.6 Z',
  'M35.4 189.4 L39.2 189.4 C40.6 192 41 195 40.4 197 L33.4 197 C33.4 194.4 34.2 191.6 35.4 189.4 Z',
];

function Figure({ parts, load, tint, delayBase, onPart }: { parts: Part[]; load: MuscleLoad; tint: string; delayBase: number; onPart?: (m: MuscleId) => void }) {
  const render = (flip: boolean) =>
    parts.map((p, i) => {
      const v = load[p.m] ?? 0;
      const fill = v > 0 ? `rgb(${tint} / ${(0.32 + 0.68 * v).toFixed(2)})` : 'rgb(var(--s3))';
      return (
        <path
          key={`${flip ? 'r' : 'l'}-${i}`}
          d={p.d}
          onClick={onPart ? () => onPart(p.m) : undefined}
          style={{
            cursor: onPart ? 'pointer' : undefined,
            fill,
            transition: 'fill 420ms cubic-bezier(.2,.8,.2,1)',
            transitionDelay: `${delayBase + i * 28}ms`,
          }}
        />
      );
    });
  return (
    <g>
      <ellipse cx="50" cy="15.5" rx="8.6" ry="10.6" fill="rgb(var(--s2))" />
      <g fill="rgb(var(--s2))">
        {NEUTRAL_HALF.map((d, i) => (
          <path key={`nl${i}`} d={d} />
        ))}
        <g transform="translate(100 0) scale(-1 1)">
          {NEUTRAL_HALF.map((d, i) => (
            <path key={`nr${i}`} d={d} />
          ))}
        </g>
      </g>
      <g stroke="rgb(var(--bg))" strokeWidth="0.7" strokeLinejoin="round">
        {render(false)}
        <g transform="translate(100 0) scale(-1 1)">{render(true)}</g>
      </g>
    </g>
  );
}

export const BodyMap = memo(function BodyMap({
  load,
  tint = 'var(--acc)',
  className = '',
  label,
  onPart,
}: {
  load: MuscleLoad;
  /** RGB-Tripel, z. B. "232 120 92" oder "var(--acc)" */
  tint?: string;
  className?: string;
  label?: string;
  /** Macht die Figur antippbar (Bereiche auswählen). */
  onPart?: (m: MuscleId) => void;
}) {
  const names = Object.keys(load).length;
  return (
    <svg
      viewBox="0 0 210 202"
      className={className}
      role="img"
      aria-label={label ?? (names ? `Körperfigur, ${names} Regionen markiert` : 'Körperfigur')}
    >
      <Figure parts={FRONT} load={load} tint={tint} delayBase={0} onPart={onPart} />
      <g transform="translate(110 0)">
        <Figure parts={BACK} load={load} tint={tint} delayBase={120} onPart={onPart} />
      </g>
    </svg>
  );
});
