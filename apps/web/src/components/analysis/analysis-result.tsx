import { ReactNode } from 'react';
import { Analysis, ItemMatch, Level } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ScoreRing } from '@/components/resume/charts';

const LEVEL_STYLE: Record<string, string> = {
  Strong: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Good: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Partial: 'bg-amber-50 text-amber-700 border-amber-200',
  Fair: 'bg-amber-50 text-amber-700 border-amber-200',
  Weak: 'bg-red-50 text-red-700 border-red-200',
  'Needs work': 'bg-red-50 text-red-700 border-red-200',
  Unknown: 'bg-slate-100 text-slate-600 border-slate-200',
  'Not specified': 'bg-slate-100 text-slate-600 border-slate-200',
};

function Badge({ level }: { level: string }) {
  return (
    <span className={cn('rounded-full border px-3 py-0.5 text-xs font-semibold', LEVEL_STYLE[level])}>{level}</span>
  );
}

function Panel({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn('animate-rise rounded-2xl border bg-white/80 p-6 shadow-sm backdrop-blur', className)}>
      <h3 className="mb-4 text-base font-semibold">{title}</h3>
      <div className="space-y-3 text-sm">{children}</div>
    </section>
  );
}

function Chips({ items, tone, empty }: { items: string[]; tone: 'good' | 'bad'; empty: string }) {
  if (items.length === 0) return <p className="text-muted-foreground">{empty}</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((s, i) => (
        <li
          key={`${s}-${i}`}
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-medium',
            tone === 'good' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700',
          )}
        >
          {tone === 'good' ? '✓ ' : '✕ '}
          {s}
        </li>
      ))}
    </ul>
  );
}

function Compare({ title, m }: { title: string; m: ItemMatch }) {
  const n = m.matched.length + m.missing.length;
  const pct = n ? Math.round((m.matched.length / n) * 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-medium">{title}</p>
        {n > 0 && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {m.matched.length}/{n} matched
          </span>
        )}
      </div>
      {n > 0 && (
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all duration-1000" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

function LevelRow({ title, level, note }: { title: string; level: Level | string; note: string }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="font-medium">{title}</p>
        <Badge level={level} />
      </div>
      <p className="mt-1 text-muted-foreground">{note}</p>
    </div>
  );
}

export function AnalysisResult({ analysis }: { analysis: Analysis }) {
  const r = analysis.result;
  const allKeywordsMatched = [...r.keywords.matched, ...r.technologies.matched];
  const allKeywordsMissing = [...r.keywords.missing, ...r.technologies.missing];
  const hasPreferred = r.preferredSkills.matched.length + r.preferredSkills.missing.length > 0;

  return (
    <div className="space-y-5">
      <section className="animate-rise overflow-hidden rounded-2xl border bg-white/80 shadow-sm backdrop-blur">
        <div className="h-3 bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500" />
        <div className="flex flex-col items-center gap-6 p-6 sm:flex-row">
          <ScoreRing percent={r.score} display={`${r.score}/100`} label="match score" size={160} />
          <div className="space-y-2 text-center sm:text-left">
            <p className="text-2xl font-bold">Resume-JD Match Score: {r.score}/100</p>
            <p className="text-sm text-muted-foreground">
              {analysis.resumeFileName ?? 'Your resume'}
              {analysis.jobTitle && <> vs. <span className="font-medium text-foreground">{analysis.jobTitle}</span></>}
              {analysis.company && <> at {analysis.company}</>}
            </p>
            <p className="max-w-xl text-xs text-muted-foreground">
              This score measures how closely the content of your resume lines up with this job description. It is not a
              prediction of whether you will be selected or hired.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { t: 'ATS Compatibility', v: r.ats.level },
          { t: 'Experience Match', v: r.experience.level },
          { t: 'Role Match', v: r.role.level },
          { t: 'Education Match', v: r.education.level },
        ].map((x) => (
          <div key={x.t} className="rounded-xl border bg-white/80 p-4 shadow-sm">
            <p className="mb-2 text-xs text-muted-foreground">{x.t}</p>
            <Badge level={x.v} />
          </div>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Panel title="Matching Skills">
          <Compare title="Required skills" m={r.requiredSkills} />
          <Chips items={r.requiredSkills.matched} tone="good" empty="No required skills from the job were found in your resume." />
          {hasPreferred && (
            <>
              <Compare title="Preferred skills" m={r.preferredSkills} />
              <Chips items={r.preferredSkills.matched} tone="good" empty="None of the preferred skills were found." />
            </>
          )}
        </Panel>
        <Panel title="Missing Skills">
          <Chips items={r.requiredSkills.missing} tone="bad" empty="You cover every required skill listed." />
          {hasPreferred && (
            <>
              <p className="pt-1 font-medium">Preferred</p>
              <Chips items={r.preferredSkills.missing} tone="bad" empty="You cover every preferred skill listed." />
            </>
          )}
        </Panel>
        <Panel title="Matching Keywords">
          <Chips items={allKeywordsMatched} tone="good" empty="No additional keywords or tools matched." />
        </Panel>
        <Panel title="Missing Keywords">
          <Chips items={allKeywordsMissing} tone="bad" empty="No additional keywords or tools are missing." />
        </Panel>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Panel title="How the score is made up">
          <ul className="space-y-3">
            {r.scoreBreakdown.map((b) => (
              <li key={b.label} className="grid grid-cols-[8.5rem_1fr_2.5rem] items-center gap-3">
                <span className="text-muted-foreground">{b.label}</span>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all duration-1000" style={{ width: `${b.score}%` }} />
                </div>
                <span className="text-right font-semibold tabular-nums">{b.score}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Fit details">
          <LevelRow title="Experience" level={r.experience.level} note={r.experience.note} />
          <LevelRow title="Role" level={r.role.level} note={r.role.note} />
          <LevelRow title="Education" level={r.education.level} note={r.education.note} />
        </Panel>
      </div>

      <Panel title="Important gaps">
        {r.gaps.length ? (
          <ul className="list-disc space-y-1 pl-5 marker:text-red-300">
            {r.gaps.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No major gaps found against this job description.</p>
        )}
      </Panel>

      <div className="grid gap-5 md:grid-cols-2">
        <Panel title="ATS Compatibility">
          <div className="flex items-center justify-between">
            <Badge level={r.ats.level} />
            <span className="font-semibold tabular-nums">{r.ats.score}/100</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500" style={{ width: `${r.ats.score}%` }} />
          </div>
          <ul className="space-y-1.5 pt-1">
            {r.ats.checks.map((c) => (
              <li key={c.label} className="flex items-start gap-2">
                <span className={c.ok ? 'text-emerald-600' : 'text-red-500'}>{c.ok ? '✓' : '✕'}</span>
                <span className={c.ok ? undefined : 'text-foreground'}>{c.label}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Resume improvement suggestions">
          {r.suggestions.length ? (
            <ul className="list-disc space-y-2 pl-5 marker:text-indigo-300">
              {r.suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Your resume lines up well with this job. No changes suggested.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
