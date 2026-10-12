import { DayStatus, demoCalendarStatus } from '@/lib/demo-data';
import { cn } from '@/lib/utils';
import { Widget } from './widgets';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const STYLE: Record<DayStatus, string> = {
  completed: 'bg-emerald-500 text-white',
  missed: 'bg-red-500/15 text-red-500 line-through',
  today: 'bg-gradient-to-br from-indigo-500 to-cyan-500 text-white ring-2 ring-indigo-300 ring-offset-2 ring-offset-card',
  upcoming: 'border border-dashed border-indigo-400/60 text-foreground',
  none: 'text-muted-foreground/60',
};

const LEGEND: { status: DayStatus; label: string; dot: string }[] = [
  { status: 'completed', label: 'Completed', dot: 'bg-emerald-500' },
  { status: 'missed', label: 'Missed', dot: 'bg-red-400' },
  { status: 'today', label: 'Today', dot: 'bg-indigo-500' },
  { status: 'upcoming', label: 'Upcoming', dot: 'border border-dashed border-indigo-400' },
];

/** Month view of preparation days. The real calendar and today's date; the day statuses are demo data. */
export function PrepCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <Widget
      title="Preparation Calendar"
      subtitle={now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
      demo
    >
      <div className="grid grid-cols-7 gap-1 text-center text-xs" role="grid" aria-label="Preparation calendar">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="py-1 font-medium text-muted-foreground">
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`b${i}`} />;
          const status = demoCalendarStatus(year, month, day, now);
          return (
            <div
              key={day}
              role="gridcell"
              aria-label={`${day}: ${status === 'none' ? 'rest day' : status}`}
              className={cn('mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium sm:h-9 sm:w-9', STYLE[status])}
            >
              {day}
            </div>
          );
        })}
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {LEGEND.map((l) => (
          <li key={l.status} className="flex items-center gap-1.5">
            <span className={cn('h-2.5 w-2.5 rounded-full', l.dot)} />
            {l.label}
          </li>
        ))}
      </ul>
    </Widget>
  );
}
