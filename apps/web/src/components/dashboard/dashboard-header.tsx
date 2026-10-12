'use client';

import Link from 'next/link';
import { User } from '@/lib/api';
import { DemoBadge } from './widgets';
import { Popover } from './popover';
import { ThemeToggle } from './theme-toggle';

function greeting(date = new Date()) {
  const h = date.getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  href?: string;
  demo?: boolean;
}

export function DashboardHeader({ user, notices, onLogout }: { user: User; notices: Notice[]; onLogout: () => void }) {
  const first = user.name.split(' ')[0];
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <h1 className="truncate text-2xl font-bold sm:text-3xl">
          {greeting()}, <span className="bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent">{first}</span> 👋
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Popover
          label={`Notifications (${notices.length})`}
          trigger={
            <span className="relative flex h-10 w-10 items-center justify-center rounded-full border bg-card/80 text-lg transition-colors hover:bg-muted">
              <span aria-hidden>🔔</span>
              {notices.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {notices.length}
                </span>
              )}
            </span>
          }
        >
          {(close) => (
            <div className="space-y-1">
              <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notifications</p>
              {notices.length === 0 && <p className="px-2 py-3 text-muted-foreground">You&apos;re all caught up.</p>}
              {notices.map((n) => {
                const body = (
                  <div className="rounded-lg px-2 py-2 hover:bg-muted">
                    <p className="flex items-center gap-2 font-medium">
                      {n.title}
                      {n.demo && <DemoBadge />}
                    </p>
                    <p className="text-xs text-muted-foreground">{n.body}</p>
                  </div>
                );
                return n.href ? (
                  <Link key={n.id} href={n.href} onClick={close} role="menuitem" className="block">
                    {body}
                  </Link>
                ) : (
                  <div key={n.id}>{body}</div>
                );
              })}
            </div>
          )}
        </Popover>

        <ThemeToggle />

        <Popover
          label="Profile menu"
          trigger={
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 text-sm font-bold text-white shadow">
              {user.name.trim().charAt(0).toUpperCase() || '?'}
            </span>
          }
        >
          {(close) => (
            <div>
              <div className="border-b px-2 pb-2">
                <p className="truncate font-semibold">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                {user.targetRole && <p className="mt-1 text-xs text-indigo-500">Target: {user.targetRole}</p>}
              </div>
              <Link href="/resume" onClick={close} role="menuitem" className="mt-1 block rounded-lg px-2 py-2 hover:bg-muted">
                My resume
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={onLogout}
                className="block w-full rounded-lg px-2 py-2 text-left text-destructive hover:bg-muted"
              >
                Log out
              </button>
            </div>
          )}
        </Popover>
      </div>
    </header>
  );
}
