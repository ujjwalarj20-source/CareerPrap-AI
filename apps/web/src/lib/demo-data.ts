/**
 * DEMO DATA - placeholder values for dashboard widgets whose backend does not exist yet
 * (interview practice, streaks, questions, calendar). Nothing here comes from the user's account.
 * Every widget that renders it is labelled "Demo data" in the UI.
 * Replace each export with a real API call as the matching backend is built.
 */

export const DEMO_PROGRESS = [
  { day: 'Mon', score: 42 },
  { day: 'Tue', score: 48 },
  { day: 'Wed', score: 46 },
  { day: 'Thu', score: 55 },
  { day: 'Fri', score: 61 },
  { day: 'Sat', score: 59 },
  { day: 'Sun', score: 68 },
];

export const DEMO_TOPICS = [
  { topic: 'JavaScript', score: 82 },
  { topic: 'React', score: 74 },
  { topic: 'Node.js', score: 69 },
  { topic: 'Databases', score: 58 },
  { topic: 'System Design', score: 44 },
  { topic: 'Behavioral', score: 71 },
];

export const DEMO_STATS = {
  interviewReadiness: 68,
  streakDays: 5,
  questionsCompleted: 42,
  questionsTotal: 120,
};

export const DEMO_TODAY = {
  topic: 'System Design Basics',
  questions: 10,
  minutes: 25,
  completed: 3,
};

export const DEMO_RECENT_INTERVIEWS = [
  { id: 1, title: 'Mock interview: Frontend fundamentals', date: 'Yesterday', score: 78 },
  { id: 2, title: 'Mock interview: Node.js & APIs', date: '3 days ago', score: 64 },
  { id: 3, title: 'Behavioral round practice', date: 'Last week', score: 72 },
];

export type DayStatus = 'completed' | 'missed' | 'today' | 'upcoming' | 'none';

/** Deterministic demo calendar for the given month: past days alternate done/missed, future days are planned. */
export function demoCalendarStatus(year: number, month: number, day: number, now = new Date()): DayStatus {
  const date = new Date(year, month, day);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (date.getTime() === todayStart.getTime()) return 'today';
  const weekday = date.getDay();
  if (date < todayStart) {
    if (weekday === 0) return 'none'; // rest day
    return (day * 7 + month) % 5 === 0 ? 'missed' : 'completed';
  }
  return weekday === 0 || weekday === 6 ? 'none' : 'upcoming';
}
