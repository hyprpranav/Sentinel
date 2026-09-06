'use client';
// components/ui/ThemeToggle.tsx
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sentinel-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = saved ? saved === 'dark' : prefersDark;
    setDark(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('sentinel-theme', next ? 'dark' : 'light');
  };

  return (
    <button onClick={toggle} className="theme-toggle" title="Toggle theme" aria-label="Toggle colour theme">
      {dark ? <Sun size={15} /> : <Moon size={15} />}
      <span>{dark ? 'Light' : 'Dark'}</span>
    </button>
  );
}
