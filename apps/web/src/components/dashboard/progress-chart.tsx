'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DEMO_PROGRESS } from '@/lib/demo-data';
import { Widget } from './widgets';

const AXIS = { fill: 'hsl(var(--muted-foreground))', fontSize: 12 };
export const TOOLTIP_STYLE = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 12,
  color: 'hsl(var(--card-foreground))',
  fontSize: 12,
};

/** Weekly preparation score trend. Demo data until practice sessions are tracked by the backend. */
export function ProgressChart() {
  return (
    <Widget title="Preparation Progress" subtitle="Daily practice score, last 7 days" demo>
      <div className="h-56 w-full" role="img" aria-label="Line chart of daily preparation score over the last 7 days">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={DEMO_PROGRESS} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} />
            <YAxis domain={[0, 100]} tick={AXIS} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, 'Score']} />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#6366f1"
              strokeWidth={3}
              dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Widget>
  );
}
