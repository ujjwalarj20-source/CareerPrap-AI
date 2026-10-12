import { DEMO_TODAY } from '@/lib/demo-data';
import { ProgressBar, Widget } from './widgets';

/** Today's plan. Demo data until the preparation backend exists. */
export function TodaysPrep() {
  const { topic, questions, minutes, completed } = DEMO_TODAY;
  const pct = (completed / questions) * 100;
  return (
    <Widget title="Today's Preparation" subtitle="Your plan for today" demo>
      <p className="text-lg font-semibold">{topic}</p>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[
          { k: 'Questions', v: questions },
          { k: 'Minutes', v: minutes },
          { k: 'Done', v: `${completed}/${questions}` },
        ].map((x) => (
          <div key={x.k} className="rounded-xl bg-muted/70 px-2 py-3">
            <dd className="text-lg font-bold tabular-nums">{x.v}</dd>
            <dt className="text-xs text-muted-foreground">{x.k}</dt>
          </div>
        ))}
      </dl>
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span className="tabular-nums">{Math.round(pct)}%</span>
        </div>
        <ProgressBar value={pct} />
      </div>
    </Widget>
  );
}
