import { Analysis, Resume } from '@/lib/api';

/** Message built only from the user's real state (resume + latest analysis); no invented achievements. */
export function motivationMessage(name: string, resume: Resume | null, latest: Analysis | null): string {
  const first = name.split(' ')[0];
  if (!resume) return `Welcome, ${first}! Upload your resume and we'll turn it into a roadmap for your next interview.`;
  if (resume.parsingStatus !== 'COMPLETED') return `Hang tight, ${first}. Your resume is being analyzed — good things take a few seconds.`;
  if (!latest) return `Your resume is ready, ${first}. Add a job description to see exactly where you stand.`;
  const gaps = latest.result.requiredSkills.missing;
  if (gaps.length === 0) return `You cover every required skill for this job, ${first}. Keep sharpening your interview answers!`;
  return `You're on your way, ${first}. Closing ${gaps.length === 1 ? 'one skill gap' : `${gaps.length} skill gaps`} — starting with ${gaps[0]} — is your fastest way to improve your match.`;
}

export function Motivation({ message }: { message: string }) {
  return (
    <section className="animate-rise flex items-start gap-3 rounded-2xl border bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 p-5">
      <span aria-hidden className="text-2xl">💡</span>
      <p className="text-sm font-medium leading-relaxed sm:text-base">{message}</p>
    </section>
  );
}
