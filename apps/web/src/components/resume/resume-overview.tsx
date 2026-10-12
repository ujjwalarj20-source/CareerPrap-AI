import { ReactNode } from 'react';
import { StructuredResume } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ExperienceTimeline, ScoreRing, SectionBars, StatTile, completeness } from './charts';

function Panel({ title, icon, children, className }: { title: string; icon: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn('animate-rise rounded-2xl border bg-white/80 p-6 shadow-sm backdrop-blur', className)}>
      <h3 className="mb-4 flex items-center gap-2 text-base font-semibold">
        <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-sm">
          {icon}
        </span>
        {title}
      </h3>
      <div className="space-y-4 text-sm">{children}</div>
    </section>
  );
}

const Empty = () => <p className="text-muted-foreground">Not found in your resume.</p>;
const dates = (a: string | null, b: string | null) => [a, b].filter(Boolean).join(' – ');
const initials = (n: string | null) =>
  (n ?? '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

const CHIP_COLORS = [
  'bg-indigo-50 text-indigo-700 border-indigo-100',
  'bg-cyan-50 text-cyan-700 border-cyan-100',
  'bg-violet-50 text-violet-700 border-violet-100',
  'bg-emerald-50 text-emerald-700 border-emerald-100',
];

export function ResumeOverview({ data }: { data: StructuredResume }) {
  const score = completeness(data);
  const missing = score.checks.filter((c) => !c.ok);

  return (
    <div className="space-y-5">
      <div
        role="status"
        className="animate-rise flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">✓</span>
        Resume successfully analyzed
      </div>

      {/* Hero */}
      <section className="animate-rise overflow-hidden rounded-2xl border bg-white/80 shadow-sm backdrop-blur">
        <div className="h-20 bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500" />
        <div className="flex flex-col gap-6 p-6 pt-0 sm:flex-row sm:items-end sm:justify-between">
          <div className="-mt-10 flex items-end gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-indigo-500 to-cyan-500 text-2xl font-bold text-white shadow">
              {initials(data.name)}
            </div>
            <div className="pb-1">
              <h2 className="text-2xl font-bold leading-tight">{data.name ?? 'Name not found'}</h2>
              <p className="text-sm text-muted-foreground">
                {[data.email, data.phone].filter(Boolean).join(' · ') || 'No contact details found'}
              </p>
              {data.jobTitles.length > 0 && (
                <p className="mt-1 text-sm font-medium text-indigo-600">{data.jobTitles.slice(0, 3).join(' · ')}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 sm:pr-2">
            <ScoreRing percent={score.percent} />
            <div className="text-sm">
              <p className="font-semibold">Profile completeness</p>
              <p className="text-muted-foreground">
                {score.done} of {score.checks.length} sections found
              </p>
              {missing.length > 0 && (
                <p className="mt-1 max-w-[12rem] text-xs text-amber-700">Missing: {missing.map((m) => m.label).join(', ')}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Years of experience" value={data.yearsOfExperience ?? '—'} accent="bg-indigo-500" />
        <StatTile label="Skills" value={data.skills.length} accent="bg-cyan-500" />
        <StatTile label="Roles" value={data.experience.length} accent="bg-violet-500" />
        <StatTile label="Projects" value={data.projects.length} accent="bg-emerald-500" />
      </div>

      {/* Charts */}
      <div className="grid gap-5 md:grid-cols-2">
        <Panel title="Resume content breakdown" icon="📊">
          <SectionBars data={data} />
        </Panel>
        <Panel title="Career timeline" icon="🗓️">
          {data.experience.some((e) => e.startDate) ? (
            <ExperienceTimeline experience={data.experience} />
          ) : (
            <p className="text-muted-foreground">No dated work experience found to chart.</p>
          )}
        </Panel>
      </div>

      <Panel title="Professional Summary" icon="📝">
        {data.summary ? <p className="leading-relaxed">{data.summary}</p> : <Empty />}
      </Panel>

      <Panel title="Skills" icon="⚡">
        {data.skills.length ? (
          <ul className="flex flex-wrap gap-2">
            {data.skills.map((s, i) => (
              <li key={`${s}-${i}`} className={cn('rounded-full border px-3 py-1 text-xs font-medium', CHIP_COLORS[i % CHIP_COLORS.length])}>
                {s}
              </li>
            ))}
          </ul>
        ) : (
          <Empty />
        )}
      </Panel>

      <Panel title="Experience" icon="💼">
        {data.experience.length ? (
          <ol className="relative space-y-6 border-l-2 border-indigo-100 pl-6">
            {data.experience.map((e, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-white bg-indigo-500 ring-2 ring-indigo-100" />
                <p className="font-semibold">{[e.title, e.company].filter(Boolean).join(' at ') || 'Role'}</p>
                <p className="text-xs text-muted-foreground">
                  {[dates(e.startDate, e.endDate), e.location].filter(Boolean).join(' · ')}
                </p>
                {e.highlights.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 marker:text-indigo-300">
                    {e.highlights.map((h, j) => (
                      <li key={j}>{h}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <Empty />
        )}
      </Panel>

      <div className="grid gap-5 md:grid-cols-2">
        <Panel title="Education" icon="🎓">
          {data.education.length ? (
            data.education.map((e, i) => (
              <div key={i}>
                <p className="font-semibold">{[e.degree, e.field].filter(Boolean).join(', ') || 'Education'}</p>
                <p className="text-xs text-muted-foreground">
                  {[e.institution, dates(e.startDate, e.endDate), e.grade].filter(Boolean).join(' · ')}
                </p>
              </div>
            ))
          ) : (
            <Empty />
          )}
        </Panel>

        <Panel title="Certifications" icon="🏅">
          {data.certifications.length ? (
            data.certifications.map((c, i) => (
              <div key={i}>
                <p className="font-semibold">{c.name ?? 'Certification'}</p>
                <p className="text-xs text-muted-foreground">{[c.issuer, c.date].filter(Boolean).join(' · ')}</p>
              </div>
            ))
          ) : (
            <Empty />
          )}
        </Panel>
      </div>

      <Panel title="Projects" icon="🚀">
        {data.projects.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {data.projects.map((p, i) => (
              <div key={i} className="rounded-xl border bg-white p-4">
                <p className="font-semibold">{p.name ?? 'Project'}</p>
                {p.description && <p className="mt-1 text-muted-foreground">{p.description}</p>}
                {p.technologies.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.technologies.map((t, j) => (
                      <span key={j} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <Empty />
        )}
      </Panel>

      {(data.achievements.length > 0 || data.languages.length > 0) && (
        <Panel title="Achievements & Languages" icon="🌟">
          {data.achievements.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 marker:text-indigo-300">
              {data.achievements.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          )}
          {data.languages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.languages.map((l, i) => (
                <span key={i} className="rounded-full border bg-white px-3 py-1 text-xs font-medium">
                  {l}
                </span>
              ))}
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
