import { useId } from 'react';

/** Pfade des YP-Logos (Y + P mit Hantel), Koordinaten im Raum 200..1080 × 400..870. */
export const LOGO_PATHS = {
  y: 'M282 420H378L538 580V848L465 800V603Z',
  p: 'M603 420H870A121.5 121.5 0 0 1 870 663H700L650 713V790L578 848V580L521 523ZM660 490V592H870A51 51 0 0 0 870 490Z',
  bars: [
    [362, 633, 85, 34],
    [683, 660, 262, 30],
    [220, 610, 30, 80],
    [265, 567, 33, 160],
    [312, 548, 36, 202],
    [958, 565, 36, 185],
    [1005, 590, 30, 137],
    [1045, 623, 16, 67],
  ] as const,
};

export const LOGO_VIEWBOX = '200 400 880 470';

export function Logo({ className = '', title = 'YP Gym Tracker' }: { className?: string; title?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox={LOGO_VIEWBOX} className={className} role="img" aria-label={title}>
      <defs>
        {/* Gebürstetes Silber wie im Original — hell oben, dunkler unten */}
        <linearGradient id={`${id}-silver`} x1="0" y1="400" x2="0" y2="870" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f4f4f4" />
          <stop offset="0.55" stopColor="#c9c9cb" />
          <stop offset="1" stopColor="#8d8d91" />
        </linearGradient>
      </defs>
      <g fill={`url(#${id}-silver)`}>
        <path d={LOGO_PATHS.y} />
        <path d={LOGO_PATHS.p} fillRule="evenodd" />
        {LOGO_PATHS.bars.map(([x, y, w, h]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} rx={h > 40 ? 7 : 4} />
        ))}
      </g>
    </svg>
  );
}
