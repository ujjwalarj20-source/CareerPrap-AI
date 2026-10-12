'use client';

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DEMO_TOPICS } from '@/lib/demo-data';
import { TOOLTIP_STYLE } from './progress-chart';
import { Widget } from './widgets';

const AXIS = { fill: 'hsl(var(--muted-foreground))', fontSize: 12 };
const colorFor = (score: number) => (score >= 75 ? '#10b981' : score >= 60 ? '#6366f1' : '#f59e0b');

/** Per-topic practice scores. Demo data until practice sessions are tracked by the backend. */
export function TopicChart() {
  return (
    <Widget title="Topic Performance" subtitle="Average score by topic" demo>
      <div className="h-56 w-full" role="img" aria-label="Bar chart of average practice score by topic">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={DEMO_TOPICS} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="topic" tick={AXIS} tickLine={false} axisLine={false} interval={0} />
            <YAxis domain={[0, 100]} tick={AXIS} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, 'Score']} />
            <Bar dataKey="score" radius={[8, 8, 0, 0]} maxBarSize={36}>
              {DEMO_TOPICS.map((t) => (
                <Cell key={t.topic} fill={colorFor(t.score)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Widget>
  );
}
