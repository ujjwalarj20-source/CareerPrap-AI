import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Marks a widget (or value) as placeholder content that is not backed by the API yet. */
export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      title="Placeholder data: this feature's backend is not built yet"
      className={cn(
        'rounded-full border border-amber-300/60 bg-amber-100/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300',
        className,
      )}
    >
      Demo data
    </span>
  );
}

export function Widget({
  title,
  subtitle,
  demo,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  demo?: boolean;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('animate-rise rounded-2xl border bg-card/80 p-5 shadow-sm backdrop-blur', className)}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold leading-tight">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {demo && <DemoBadge />}
          {action}
        </div>
      </header>
      {children}
    </section>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-2 overflow-hidden rounded-full bg-muted', className)}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all duration-700"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
