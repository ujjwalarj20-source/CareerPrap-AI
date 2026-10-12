'use client';

import { useEffect, useState } from 'react';

/** Light/dark toggle. The initial class is applied by the inline script in the root layout. */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('cp_theme', next ? 'dark' : 'light');
    } catch {
      /* storage unavailable: the choice just won't persist */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={dark ? 'Light theme' : 'Dark theme'}
      className="flex h-10 w-10 items-center justify-center rounded-full border bg-card/80 text-lg transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span aria-hidden>{dark ? '☀️' : '🌙'}</span>
    </button>
  );
}
