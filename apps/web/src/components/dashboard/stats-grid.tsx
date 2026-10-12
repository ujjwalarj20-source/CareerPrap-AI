import { Analysis } from '@/lib/api';
import { DEMO_STATS } from '@/lib/demo-data';
import { cn } from '@/lib/utils';
import { DemoBadge, ProgressBar } from './widgets';

interface Stat {
  label: string;
  value: string;
  hint: string;
  icon: string;
  accent: string;
  progress?: number;
  demo?: boolean;
}

function StatCard({ s }: { s: Stat }) {
  return (
    <div className="animate-rise rounded-2xl border bg-card/80 p-4 shadow-sm backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <span aria-hidden className={cn('flex h-9 w-9 items-center justify-center rounded-xl text-base', s.accent)}>
          {s.icon}
        </span>
        {s.demo && <DemoBadge />}
      </div>
      <p className="text-2xl font-bold tabular-nums">{s.value}</p>
      <p className="text-sm font-medium">{s.label}</p>
      <p className="text-xs text-muted-foreground">{s.hint}</p>
      {s.progress !== undefined && <ProgressBar value={s.progress} className="mt-3" />}
    </div>
  );
}

/** Real numbers come from the latest saved analysis; the rest are demo values (see lib/demo-data.ts). */
export function StatsGrid({ latest }: { latest: Analysis | null }) {
  const r = latest?.result;
  const noAnalysis = 'Add a job description to see this';
  const stats: Stat[] = [
    {
      label: 'Resume-JD Match',
      value: r ? `${r.score}/100` : '—',
      hint: r ? (latest.jobTitle ? `vs. ${latest.jobTitle}` : 'Latest analysis') : noAnalysis,
      icon: '🎯',
      accent: 'bg-indigo-500/15',
      progress: r?.score,
    },
    {
      label: 'ATS Score',
      value: r ? `${r.ats.score}/100` : '—',
      hint: r ? `${r.ats.level} compatibility` : noAnalysis,
      icon: '🤖',
      accent: 'bg-cyan-500/15',
      progress: r?.ats.score,
    },
    {
      label: 'Interview Readiness',
      value: `${DEMO_STATS.interviewReadiness}%`,
      hint: 'Based on practice sessions',
      icon: '🚀',
      accent: 'bg-violet-500/15',
      progress: DEMO_STATS.interviewReadiness,
      demo: true,
    },
    {
      label: 'Preparation Streak',
      value: `${DEMO_STATS.streakDays} days`,
      hint: 'Keep it going!',
      icon: '🔥',
      accent: 'bg-orange-500/15',
      demo: true,
    },
    {
      label: 'Questions Completed',
      value: `${DEMO_STATS.questionsCompleted}/${DEMO_STATS.questionsTotal}`,
      hint: 'Across all topics',
      icon: '✅',
      accent: 'bg-emerald-500/15',
      progress: (DEMO_STATS.questionsCompleted / DEMO_STATS.questionsTotal) * 100,
      demo: true,
    },
    {
      label: 'Weak Topics',
      value: r ? String(r.requiredSkills.missing.length) : '—',
      hint: r ? 'Required skills missing from your resume' : noAnalysis,
      icon: '⚠️',
      accent: 'bg-amber-500/15',
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {stats.map((s) => (
        <StatCard key={s.label} s={s} />
      ))}
    </div>
  );
}
