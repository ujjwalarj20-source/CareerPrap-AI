import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Analysis, Resume } from '@/lib/api';
import { Widget } from './widgets';

/** Real, backend-driven "what to do next" card that keeps the Resume → JD → Analysis flow reachable. */
export function NextStepCard({ resume, latest }: { resume: Resume | null; latest: Analysis | null }) {
  let title: string;
  let body: string;
  let cta: { href: string; label: string } | null;

  if (!resume) {
    title = 'Upload your resume';
    body = 'Start by uploading a PDF or DOCX resume. We parse it into structured data you can compare against jobs.';
    cta = { href: '/resume', label: 'Upload resume' };
  } else if (resume.parsingStatus === 'FAILED') {
    title = 'Resume could not be analyzed';
    body = resume.parsingError ?? 'Please try uploading it again.';
    cta = { href: '/resume', label: 'Re-upload resume' };
  } else if (resume.parsingStatus !== 'COMPLETED') {
    title = 'Analyzing your resume…';
    body = 'This takes a few seconds.';
    cta = { href: '/resume', label: 'View progress' };
  } else if (!latest) {
    title = 'Resume ready — add a job description';
    body = `${resume.originalFileName} is analyzed. Paste a job description to see how well you match.`;
    cta = { href: `/job-description?resume=${resume.id}`, label: 'Add Job Description' };
  } else {
    title = 'Compare against another job';
    body = `Your latest analysis${latest.jobTitle ? ` for ${latest.jobTitle}` : ''} is saved. Try a different job description anytime.`;
    cta = { href: `/job-description?resume=${resume.id}`, label: 'Add Job Description' };
  }

  return (
    <Widget
      title="Next step"
      subtitle="Resume → Job description → Match analysis"
      action={
        latest && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/analysis/${latest.id}`}>Latest analysis</Link>
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">{body}</p>
        </div>
        {cta && (
          <Button asChild className="shrink-0 bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md hover:opacity-90">
            <Link href={cta.href}>{cta.label}</Link>
          </Button>
        )}
      </div>
    </Widget>
  );
}
