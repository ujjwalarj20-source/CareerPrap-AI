'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DEMO_TODAY } from '@/lib/demo-data';
import { DemoBadge } from './widgets';

/** Daily preparation call-to-action. Interview practice is not built yet, so the button explains that. */
export function PrepBanner() {
  const [note, setNote] = useState(false);
  return (
    <section className="animate-rise relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-600 p-5 text-white shadow-lg sm:p-6">
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/80">
            Daily Interview Preparation
            <DemoBadge className="border-white/40 bg-white/20 text-white dark:text-white" />
          </p>
          <h2 className="mt-1 text-xl font-bold sm:text-2xl">Your daily prep is ready 🎯</h2>
          <p className="mt-1 text-sm text-white/85">
            Today: {DEMO_TODAY.topic} · {DEMO_TODAY.questions} questions · about {DEMO_TODAY.minutes} min
          </p>
          {note && (
            <p role="status" className="mt-2 rounded-lg bg-white/15 px-3 py-2 text-sm">
              Interview preparation isn&apos;t available yet. This banner previews how it will look.
            </p>
          )}
        </div>
        <Button
          onClick={() => setNote(true)}
          className="w-full shrink-0 bg-white text-indigo-700 shadow-md hover:bg-white/90 sm:w-auto"
        >
          Start Today&apos;s Preparation
        </Button>
      </div>
    </section>
  );
}
