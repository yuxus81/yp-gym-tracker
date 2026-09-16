import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-acc text-onacc font-semibold active:bg-acc/85',
  secondary: 'bg-s2 text-fg font-medium active:bg-s3',
  ghost: 'bg-transparent text-mute font-medium active:bg-s2',
  danger: 'bg-bad/10 text-bad font-semibold active:bg-bad/20',
};

export function Button({
  variant = 'secondary',
  icon,
  size = 'md',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; icon?: IconName; size?: 'md' | 'lg' | 'sm' }) {
  const sz = size === 'lg' ? 'h-14 px-6 text-[17px] rounded-2xl' : size === 'sm' ? 'h-9 px-3 text-sm rounded-xl' : 'h-12 px-4 text-[15px] rounded-xl';
  return (
    <button
      type="button"
      className={`press inline-flex items-center justify-center gap-2 disabled:opacity-40 ${sz} ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 18 : 20} />}
      {children}
    </button>
  );
}

export function IconButton({
  icon,
  label,
  className = '',
  size = 22,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string; size?: number }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`press grid h-11 w-11 place-items-center rounded-full text-fg active:bg-s2 ${className}`}
      {...rest}
    >
      <Icon name={icon} size={size} />
    </button>
  );
}

export function Chip({
  active,
  children,
  onClick,
  tint,
  className = '',
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  /** RGB-Tripel für aktive Farbe, sonst Akzent */
  tint?: string;
  className?: string;
}) {
  const style = active && tint ? { backgroundColor: `rgb(${tint} / 0.18)`, color: `rgb(${tint})`, boxShadow: `inset 0 0 0 1px rgb(${tint} / 0.5)` } : undefined;
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={style}
      className={`press inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-sm font-medium ${
        active ? (tint ? '' : 'bg-acc/15 text-acc shadow-[inset_0_0_0_1px_rgb(var(--acc)/0.5)]') : 'bg-s2 text-mute'
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function PageHeader({ title, sub, right }: { title: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-3 px-5 pb-3 pt-4">
      <div className="min-w-0">
        {sub && <div className="mb-0.5 text-[13px] font-medium text-mute">{sub}</div>}
        <h1 className="truncate text-[30px] font-bold leading-tight tracking-tight">{title}</h1>
      </div>
      {right && <div className="flex shrink-0 items-center gap-1">{right}</div>}
    </header>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-center justify-between px-1">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-dim">{children}</h2>
      {right}
    </div>
  );
}

export function Empty({ icon, title, text, action }: { icon: IconName; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-8 py-12 text-center">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-s2 text-mute">
        <Icon name={icon} size={30} />
      </div>
      <div className="text-[17px] font-semibold">{title}</div>
      <p className="mt-1 max-w-[30ch] text-[15px] text-mute">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-mute">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-dim">{hint}</span>}
    </label>
  );
}

export const inputCls =
  'h-12 w-full rounded-xl bg-s2 px-4 text-[16px] text-fg placeholder:text-dim outline-none focus:shadow-[inset_0_0_0_1.5px_rgb(var(--acc))]';

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
}) {
  return (
    <div className="flex h-11 items-center rounded-xl bg-s2" role="group" aria-label={label}>
      <button type="button" aria-label={`${label} verringern`} className="press grid h-11 w-10 place-items-center text-mute disabled:opacity-30" disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))}>
        <Icon name="minus" size={18} />
      </button>
      <span className="num min-w-[2ch] flex-1 text-center text-[17px] font-semibold">{value}</span>
      <button type="button" aria-label={`${label} erhöhen`} className="press grid h-11 w-10 place-items-center text-mute disabled:opacity-30" disabled={value >= max} onClick={() => onChange(Math.min(max, value + step))}>
        <Icon name="plus" size={18} />
      </button>
    </div>
  );
}
