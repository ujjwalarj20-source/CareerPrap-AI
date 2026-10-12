import { StructuredResume } from '@/lib/api';
import { cn } from '@/lib/utils';

/* ---------- Derived metrics (only from what the resume actually contains) ---------- */

export function completeness(d: StructuredResume) {
  const checks = [
    { label: 'Name', ok: !!d.name },
    { label: 'Contact', ok: !!(d.email || d.phone) },
    { label: 'Summary', ok: !!d.summary },
    { label: 'Skills', ok: d.skills.length > 0 },
    { label: 'Experience', ok: d.experience.length > 0 },
    { label: 'Education', ok: d.education.length > 0 },
    { label: 'Projects', ok: d.projects.length > 0 },
    { label: 'Certifications', ok: d.certifications.length > 0 },
  ];
  const done = checks.filter((c) => c.ok).length;
  return { checks, done, percent: Math.round((done / checks.length) * 100) };
}

const YEAR_NOW = new Date().getFullYear();
function toYear(v: string | null): number | null {
  if (!v) return null;
  if (/present|current|now|ongoing/i.test(v)) return YEAR_NOW;
  const m = v.match(/(?:19|20)\d{2}/);
  return m ? Number(m[0]) : null;
}

/* ---------- Completeness ring ---------- */

export function ScoreRing({
  percent,
  size = 132,
  display,
  label = 'complete',
}: {
  percent: number;
  size?: number;
  display?: string;
  label?: string;
}) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${label} ${display ?? `${percent}%`}`}>
        <defs>
          <linearGradient id={`ring-${label.replace(/\W/g, '')}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#ring-${label.replace(/\W/g, '')})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - percent / 100)}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold">{display ?? `${percent}%`}</span>
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

/* ---------- Horizontal bars: how much content each section has ---------- */

const BAR_COLORS = ['bg-indigo-500', 'bg-violet-500', 'bg-sky-500', 'bg-cyan-500', 'bg-teal-500', 'bg-emerald-500', 'bg-amber-500'];

export function SectionBars({ data }: { data: StructuredResume }) {
  const rows = [
    { label: 'Skills', n: data.skills.length },
    { label: 'Experience', n: data.experience.length },
    { label: 'Projects', n: data.projects.length },
    { label: 'Education', n: data.education.length },
    { label: 'Certifications', n: data.certifications.length },
    { label: 'Achievements', n: data.achievements.length },
    { label: 'Languages', n: data.languages.length },
  ];
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <ul className="space-y-3">
      {rows.map((r, i) => (
        <li key={r.label} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-3 text-sm">
          <span className="text-muted-foreground">{r.label}</span>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-200/70">
            <div
              className={cn('h-full rounded-full transition-all duration-1000 ease-out', BAR_COLORS[i % BAR_COLORS.length])}
              style={{ width: `${(r.n / max) * 100}%` }}
            />
          </div>
          <span className="text-right font-semibold tabular-nums">{r.n}</span>
        </li>
      ))}
    </ul>
  );
}

/* ---------- Experience timeline (Gantt-style, from dates in the resume) ---------- */

export function ExperienceTimeline({ experience }: { experience: StructuredResume['experience'] }) {
  const items = experience
    .map((e) => ({ e, start: toYear(e.startDate), end: toYear(e.endDate) ?? toYear(e.startDate) }))
    .filter((x): x is { e: typeof x.e; start: number; end: number } => x.start !== null && x.end !== null);
  if (items.length === 0) return null;

  const min = Math.min(...items.map((x) => x.start));
  const max = Math.max(YEAR_NOW, ...items.map((x) => x.end));
  const span = Math.max(1, max - min);
  const step = span > 12 ? 4 : span > 6 ? 2 : 1;
  const ticks: number[] = [];
  for (let y = min; y <= max; y += step) ticks.push(y);

  return (
    <div>
      <div className="relative mb-2 h-4 text-[11px] text-muted-foreground">
        {ticks.map((y) => (
          <span key={y} className="absolute -translate-x-1/2" style={{ left: `${((y - min) / span) * 100}%` }}>
            {y}
          </span>
        ))}
      </div>
      <ul className="space-y-2">
        {items.map(({ e, start, end }, i) => (
          <li key={i} className="relative h-8 rounded-md bg-slate-100">
            <div
              className="absolute inset-y-0 flex items-center overflow-hidden rounded-md bg-gradient-to-r from-indigo-500 to-cyan-500 px-2 text-xs font-medium text-white"
              style={{
                left: `${((start - min) / span) * 100}%`,
                width: `${Math.max(((end - start) / span) * 100, 8)}%`,
              }}
              title={`${e.title ?? ''} ${e.company ? `at ${e.company}` : ''} (${start}–${end})`}
            >
              <span className="truncate">{e.company ?? e.title ?? 'Role'}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Stat tile ---------- */

export function StatTile({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="rounded-xl border bg-white/70 p-4 shadow-sm backdrop-blur">
      <div className={cn('mb-2 h-1 w-8 rounded-full', accent)} />
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

/* ---------- Upload / analysis progress steps ---------- */

const STEPS = ['Upload', 'Read text', 'AI analysis', 'Done'] as const;

/** stage: 0 uploading, 1 uploaded/reading, 2 analysing, 3 complete */
export function ProgressSteps({ stage, failed, uploadPercent }: { stage: number; failed?: boolean; uploadPercent?: number | null }) {
  const pct = failed ? (stage / (STEPS.length - 1)) * 100 : Math.min(100, ((stage + (stage === 0 ? (uploadPercent ?? 0) / 100 : 0)) / (STEPS.length - 1)) * 100);
  const active = stage < 3 && !failed;
  return (
    <div>
      <div className="relative mx-3 mb-3 mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700',
            failed ? 'bg-destructive' : 'bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500',
            active && 'animate-shimmer',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <ol className="flex justify-between text-xs">
        {STEPS.map((s, i) => {
          const done = i < stage || (stage === 3 && !failed);
          const current = i === stage && !failed && stage < 3;
          return (
            <li key={s} className="flex flex-1 flex-col items-center gap-1">
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold',
                  done && 'border-transparent bg-emerald-500 text-white',
                  current && 'border-indigo-500 bg-indigo-50 text-indigo-600 ring-4 ring-indigo-100',
                  failed && i === stage && 'border-transparent bg-destructive text-white',
                  !done && !current && !(failed && i === stage) && 'bg-white text-muted-foreground',
                )}
              >
                {done ? '✓' : failed && i === stage ? '!' : i + 1}
              </span>
              <span className={cn('text-muted-foreground', (done || current) && 'font-medium text-foreground')}>{s}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
