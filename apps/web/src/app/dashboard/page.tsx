'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { DashboardHeader, Notice } from '@/components/dashboard/dashboard-header';
import { Motivation, motivationMessage } from '@/components/dashboard/motivation';
import { NextStepCard } from '@/components/dashboard/next-step-card';
import { PrepBanner } from '@/components/dashboard/prep-banner';
import { PrepCalendar } from '@/components/dashboard/prep-calendar';
import { ProgressChart } from '@/components/dashboard/progress-chart';
import { RecentPerformance } from '@/components/dashboard/recent-performance';
import { StatsGrid } from '@/components/dashboard/stats-grid';
import { TodaysPrep } from '@/components/dashboard/todays-prep';
import { TopicChart } from '@/components/dashboard/topic-chart';
import { WeakAreas } from '@/components/dashboard/weak-areas';
import { Analysis, analysisApi, ApiError, authApi, Resume, resumeApi, User } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [resume, setResume] = useState<Resume | null>(null);
  const [latest, setLatest] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authApi
      .me()
      .then((res) => setUser(res.user))
      .catch(async (err) => {
        if (err instanceof ApiError && err.status === 401) {
          // Stale/invalid cookie: clear it so /login doesn't bounce back here.
          await authApi.logout().catch(() => undefined);
          router.replace('/login');
        } else {
          setError('Could not load your account. Please refresh.');
        }
      });
  }, [router]);

  // Resume / analysis data is optional: the dashboard still renders if these requests fail.
  useEffect(() => {
    if (!user) return;
    resumeApi
      .list()
      .then(({ resumes }) => setResume(resumes[0] ?? null))
      .catch(() => undefined);
    analysisApi
      .list()
      .then(({ analyses }) => setLatest(analyses[0] ?? null))
      .catch(() => undefined);
  }, [user]);

  async function logout() {
    await authApi.logout().catch(() => undefined);
    router.replace('/login');
    router.refresh();
  }

  const notices = useMemo<Notice[]>(() => {
    const list: Notice[] = [
      { id: 'daily', title: 'Daily preparation reminder', body: "Today's practice session is ready.", demo: true },
    ];
    if (resume?.parsingStatus === 'COMPLETED' && !latest) {
      list.unshift({
        id: 'jd',
        title: 'Resume ready',
        body: 'Add a job description to see your match.',
        href: `/job-description?resume=${resume.id}`,
      });
    }
    if (resume?.parsingStatus === 'FAILED') {
      list.unshift({ id: 'failed', title: 'Resume analysis failed', body: 'Open your resume page to try again.', href: '/resume' });
    }
    return list;
  }, [resume, latest]);

  if (error) return <p className="p-8 text-destructive">{error}</p>;
  if (!user) return <p className="p-8 text-muted-foreground">Loading…</p>;

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6 lg:p-8">
      <DashboardHeader user={user} notices={notices} onLogout={logout} />
      <PrepBanner />
      <StatsGrid latest={latest} />
      <NextStepCard resume={resume} latest={latest} />
      <Motivation message={motivationMessage(user.name, resume, latest)} />

      <div className="grid gap-5 lg:grid-cols-2">
        <ProgressChart />
        <TopicChart />
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <TodaysPrep />
        <WeakAreas latest={latest} />
        <PrepCalendar />
      </div>

      <RecentPerformance />
    </main>
  );
}
