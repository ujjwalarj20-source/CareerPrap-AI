import Link from 'next/link';
import { Analysis } from '@/lib/api';
import { Widget } from './widgets';

/** REAL data: skills the latest job description asks for that were not found in the resume. */
export function WeakAreas({ latest }: { latest: Analysis | null }) {
  const r = latest?.result;
  const required = r?.requiredSkills.missing ?? [];
  const preferred = r?.preferredSkills.missing ?? [];

  return (
    <Widget
      title="Weak Areas / Needs Attention"
      subtitle={latest ? `Skill gaps vs. ${latest.jobTitle ?? 'your latest job description'}` : 'Based on your latest job comparison'}
    >
      {!r ? (
        <p className="text-sm text-muted-foreground">
          Compare your resume with a job description and the skills you&apos;re missing will show up here.
        </p>
      ) : required.length + preferred.length === 0 ? (
        <p className="text-sm text-emerald-600">No skill gaps found for this job. Nice work!</p>
      ) : (
        <div className="space-y-4">
          {required.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-500">Required</p>
              <ul className="flex flex-wrap gap-2">
                {required.map((s) => (
                  <li key={s} className="rounded-full border border-red-300/60 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-600 dark:text-red-300">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {preferred.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-600">Preferred</p>
              <ul className="flex flex-wrap gap-2">
                {preferred.map((s) => (
                  <li key={s} className="rounded-full border border-amber-300/60 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Link href={`/analysis/${latest!.id}`} className="inline-block text-sm font-medium text-indigo-500 hover:underline">
            See full analysis →
          </Link>
        </div>
      )}
    </Widget>
  );
}
