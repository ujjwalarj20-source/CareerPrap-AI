'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { analysisApi, ApiError, jobDescriptionApi, Resume, resumeApi } from '@/lib/api';

const MIN_CHARS = 50;
const MAX_CHARS = 20000;

function AddJobDescription() {
  const router = useRouter();
  const resumeId = useSearchParams().get('resume');
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (!resumeId) {
      setLoading(false);
      return;
    }
    resumeApi
      .get(resumeId)
      .then(({ resume: r }) => setResume(r))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) router.replace('/login');
      })
      .finally(() => setLoading(false));
  }, [resumeId, router]);

  const trimmed = text.trim().length;
  const tooShort = trimmed > 0 && trimmed < MIN_CHARS;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!resume) return;
    setError(null);
    if (trimmed === 0) return setError('Please paste a job description.');
    if (trimmed < MIN_CHARS) return setError(`The job description is too short. Please paste at least ${MIN_CHARS} characters.`);

    setAnalyzing(true);
    try {
      const { jobDescription } = await jobDescriptionApi.create({ resumeId: resume.id, text });
      if (jobDescription.parsingStatus !== 'COMPLETED') {
        setError(`${jobDescription.parsingError ?? 'We could not analyze this job description.'} Please try again.`);
        return setAnalyzing(false);
      }
      const { analysis } = await analysisApi.create(jobDescription.id);
      router.push(`/analysis/${analysis.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return router.replace('/login');
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setAnalyzing(false);
    }
  }

  if (loading) return <p className="p-8 text-muted-foreground">Loading…</p>;

  if (!resume || resume.parsingStatus !== 'COMPLETED') {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-8">
        <p className="rounded-xl border bg-white/80 p-6">
          Please upload your resume and wait for it to finish analyzing before adding a job description.
        </p>
        <Button asChild>
          <Link href="/resume">Go to my resume</Link>
        </Button>
      </main>
    );
  }

  if (analyzing) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
        <div>
          <h1 className="text-xl font-semibold">Analyzing your resume against this job description...</h1>
          <p className="mt-1 text-sm text-muted-foreground">This usually takes a few seconds.</p>
        </div>
        <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-200">
          <div className="animate-shimmer h-full w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500" />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-8">
      <header className="flex items-center justify-between">
        <h1 className="bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-3xl font-bold text-transparent">
          Add Job Description
        </h1>
        <Button asChild variant="outline" size="sm" className="bg-white/70">
          <Link href="/resume">← Resume</Link>
        </Button>
      </header>

      <div className="flex items-center gap-3 rounded-xl border bg-white/80 p-4 shadow-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-600">
          {resume.fileType.toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Resume</p>
          <p className="truncate font-medium">{resume.originalFileName}</p>
        </div>
        <span className="ml-auto rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Ready</span>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border bg-white/80 p-6 shadow-sm backdrop-blur">
        <div>
          <h2 className="text-lg font-semibold">Paste the job description</h2>
          <p className="text-sm text-muted-foreground">Paste the job description you want to compare with your resume.</p>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_CHARS}
          rows={14}
          placeholder="Paste job description here..."
          aria-label="Job description"
          className="w-full resize-y rounded-lg border border-input bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className={tooShort ? 'text-amber-700' : undefined}>
            {tooShort ? `Add a bit more detail (at least ${MIN_CHARS} characters).` : 'Include the requirements and responsibilities for the best results.'}
          </span>
          <span className="tabular-nums">
            {text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
          </span>
        </div>
        {error && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 shadow-md hover:opacity-90">
          Analyze Resume vs Job
        </Button>
      </form>
    </main>
  );
}

export default function JobDescriptionPage() {
  return (
    <Suspense fallback={<p className="p-8 text-muted-foreground">Loading…</p>}>
      <AddJobDescription />
    </Suspense>
  );
}
