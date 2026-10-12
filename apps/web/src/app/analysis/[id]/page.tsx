'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AnalysisResult } from '@/components/analysis/analysis-result';
import { Button } from '@/components/ui/button';
import { Analysis, analysisApi, ApiError } from '@/lib/api';

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    analysisApi
      .get(id)
      .then(({ analysis: a }) => setAnalysis(a))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) return router.replace('/login');
        setError(err instanceof ApiError && err.status === 404 ? 'This analysis was not found.' : 'Could not load the analysis.');
      });
  }, [id, router]);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-3xl font-bold text-transparent">
          Match Analysis
        </h1>
        <div className="flex gap-2">
          {analysis && (
            <Button asChild size="sm" className="bg-gradient-to-r from-indigo-600 to-violet-600">
              <Link href={`/job-description?resume=${analysis.resumeId}`}>Try another job</Link>
            </Button>
          )}
          <Button asChild variant="outline" size="sm" className="bg-white/70">
            <Link href="/resume">← Resume</Link>
          </Button>
        </div>
      </header>
      {error && <p role="alert" className="text-destructive">{error}</p>}
      {!error && !analysis && <div className="animate-shimmer h-64 rounded-2xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200" />}
      {analysis && <AnalysisResult analysis={analysis} />}
    </main>
  );
}
