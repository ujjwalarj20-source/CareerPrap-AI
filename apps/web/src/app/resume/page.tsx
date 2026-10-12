'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DragEvent, useCallback, useEffect, useRef, useState } from 'react';
import { ProgressSteps } from '@/components/resume/charts';
import { ResumeOverview } from '@/components/resume/resume-overview';
import { Button } from '@/components/ui/button';
import { ApiError, Resume, resumeApi } from '@/lib/api';
import { cn } from '@/lib/utils';

const MAX_MB = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB ?? 5);
const ALLOWED = ['pdf', 'docx'];
const STATUS_LABEL = { UPLOADED: 'Uploaded', PARSING: 'Analyzing…', COMPLETED: 'Analyzed', FAILED: 'Failed' } as const;

/** Which step of the pipeline the resume is at (0 upload, 1 read text, 2 AI analysis, 3 done). */
const stageOf = (r: Resume) =>
  r.parsingStatus === 'COMPLETED'
    ? 3
    : r.parsingStatus === 'PARSING'
      ? 2
      : r.parsingStatus === 'UPLOADED'
        ? 1
        : /readable text/i.test(r.parsingError ?? '')
          ? 1
          : 2;

// The API enforces all of this too; this just gives instant feedback.
function validate(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED.includes(ext)) return 'Unsupported file type. Please upload a PDF or DOCX.';
  if (file.size > MAX_MB * 1024 * 1024) return `File is too large. Maximum size is ${MAX_MB} MB.`;
  if (file.size === 0) return 'This file is empty.';
  return null;
}

export default function ResumePage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Returns true (and redirects) when the session is gone.
  const handleAuthError = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/login');
        return true;
      }
      return false;
    },
    [router],
  );

  // Load the most recent resume on mount.
  useEffect(() => {
    resumeApi
      .list()
      .then(async ({ resumes }) => (resumes[0] ? (await resumeApi.get(resumes[0].id)).resume : null))
      .then(setResume)
      .catch((err) => {
        if (!handleAuthError(err)) setError('Could not load your resume. Please refresh.');
      })
      .finally(() => setLoading(false));
  }, [handleAuthError]);

  // Poll while the server is still parsing.
  const pendingId =
    resume && (resume.parsingStatus === 'UPLOADED' || resume.parsingStatus === 'PARSING') ? resume.id : null;
  useEffect(() => {
    if (!pendingId) return;
    const timer = setInterval(() => {
      resumeApi
        .get(pendingId)
        .then(({ resume: r }) => setResume(r))
        .catch(() => undefined);
    }, 2000);
    return () => clearInterval(timer);
  }, [pendingId]);

  async function upload(file: File) {
    setError(null);
    const problem = validate(file);
    if (problem) return setError(problem);
    setProgress(0);
    try {
      const { resume: created } = await resumeApi.upload(file, setProgress);
      setResume(created);
    } catch (err) {
      if (!handleAuthError(err)) setError(err instanceof ApiError ? err.message : 'Upload failed. Please try again.');
    } finally {
      setProgress(null);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void upload(file);
  }

  async function remove() {
    if (!resume || !window.confirm('Delete this resume? This cannot be undone.')) return;
    try {
      await resumeApi.remove(resume.id);
      setResume(null);
      setError(null);
    } catch (err) {
      if (!handleAuthError(err)) setError('Could not delete the resume. Please try again.');
    }
  }

  const uploading = progress !== null;

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-3xl font-bold text-transparent">
            Your Resume
          </h1>
          <p className="text-sm text-muted-foreground">Upload once, and we turn it into structured insights.</p>
        </div>
        <Button asChild variant="outline" size="sm" className="bg-white/70">
          <Link href="/dashboard">← Dashboard</Link>
        </Button>
      </header>

      <section className="rounded-2xl border bg-white/80 p-6 shadow-sm backdrop-blur">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{resume ? 'Replace your resume' : 'Upload your resume'}</h2>
          <div className="flex gap-2 text-xs">
            <span className="rounded-full bg-indigo-50 px-3 py-1 font-medium text-indigo-700">PDF · DOCX</span>
            <span className="rounded-full bg-cyan-50 px-3 py-1 font-medium text-cyan-700">Max {MAX_MB} MB</span>
          </div>
        </div>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-all',
            dragging
              ? 'scale-[1.01] border-indigo-500 bg-indigo-50'
              : 'border-indigo-200 bg-gradient-to-b from-white to-indigo-50/40',
          )}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-2xl text-white shadow-lg">
            ⬆
          </div>
          <p className="font-medium">{dragging ? 'Drop it here' : 'Drag and drop your resume here'}</p>
          <p className="text-sm text-muted-foreground">or</p>
          <Button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 shadow-md hover:opacity-90"
          >
            Browse files
          </Button>
          <input
            ref={inputRef}
            type="file"
            hidden
            aria-label="Choose resume file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = ''; // allow re-selecting the same file
              if (file) void upload(file);
            }}
          />
        </div>

        {uploading && (
          <div className="mt-4" aria-live="polite">
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>Uploading…</span>
              <span className="font-semibold tabular-nums">{progress}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="animate-shimmer h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </section>

      {loading ? (
        <div className="space-y-3">
          <div className="animate-shimmer h-24 rounded-2xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200" />
          <div className="animate-shimmer h-48 rounded-2xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200" />
        </div>
      ) : (
        resume && (
          <>
            <section className="animate-rise rounded-2xl border bg-white/80 p-6 shadow-sm backdrop-blur">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xs font-bold text-indigo-600">
                    {resume.fileType.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{resume.originalFileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {Math.max(1, Math.round(resume.fileSize / 1024))} KB
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-semibold',
                      resume.parsingStatus === 'COMPLETED' && 'bg-emerald-50 text-emerald-700',
                      resume.parsingStatus === 'FAILED' && 'bg-red-50 text-destructive',
                      (resume.parsingStatus === 'UPLOADED' || resume.parsingStatus === 'PARSING') &&
                        'bg-indigo-50 text-indigo-700',
                    )}
                  >
                    Status: {STATUS_LABEL[resume.parsingStatus]}
                  </span>
                  <Button variant="outline" size="sm" onClick={remove}>
                    Delete
                  </Button>
                </div>
              </div>
              <ProgressSteps stage={stageOf(resume)} failed={resume.parsingStatus === 'FAILED'} />
              {resume.parsingStatus === 'FAILED' && resume.parsingError && (
                <p className="mt-4 text-sm text-destructive">{resume.parsingError} Try uploading the file again.</p>
              )}
            </section>
            {resume.parsingStatus === 'COMPLETED' && resume.structuredResumeData && (
              <>
                <section className="animate-rise overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-cyan-50 p-6 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="flex items-center gap-2 text-xl font-bold">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-sm text-white">✓</span>
                        Resume Ready
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{resume.originalFileName}</span> · Parsing status: Completed
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {[
                          resume.structuredResumeData.name,
                          resume.structuredResumeData.jobTitles[0],
                          `${resume.structuredResumeData.skills.length} skills found`,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    <Button asChild className="bg-gradient-to-r from-indigo-600 to-violet-600 shadow-md hover:opacity-90">
                      <Link href={`/job-description?resume=${resume.id}`}>Add Job Description →</Link>
                    </Button>
                  </div>
                </section>
                <ResumeOverview data={resume.structuredResumeData} />
              </>
            )}
          </>
        )
      )}
    </main>
  );
}
