import { DEMO_RECENT_INTERVIEWS } from '@/lib/demo-data';
import { ProgressBar, Widget } from './widgets';

/** Recent mock interviews. Demo data until interview practice exists in the backend. */
export function RecentPerformance() {
  return (
    <Widget title="Recent Interview Performance" subtitle="Your latest practice sessions" demo>
      <ul className="divide-y">
        {DEMO_RECENT_INTERVIEWS.map((i) => (
          <li key={i.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{i.title}</p>
              <p className="text-xs text-muted-foreground">{i.date}</p>
            </div>
            <div className="w-24 shrink-0 sm:w-32">
              <p className="mb-1 text-right text-sm font-semibold tabular-nums">{i.score}%</p>
              <ProgressBar value={i.score} />
            </div>
          </li>
        ))}
      </ul>
    </Widget>
  );
}
