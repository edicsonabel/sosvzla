'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useT } from './i18n';

// Tema con 3 modos: 'auto' (sigue al sistema), 'light', 'dark'.
//  - auto: no se pone data-theme; manda @media prefers-color-scheme.
//  - light/dark: se fija data-theme en <html> y el CSS lo respeta.
// El modo se guarda en localStorage. Para evitar parpadeo (FOUC) en la
// primera carga, ver el script inline en layout.tsx que aplica el atributo
// antes del primer render.

export type Theme = 'auto' | 'light' | 'dark';
const STORAGE_KEY = 'sos_theme';

interface ThemeValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

function apply(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('auto');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (saved === 'light' || saved === 'dark' || saved === 'auto') {
      setThemeState(saved);
      apply(saved);
    }
  }, []);

  function setTheme(t: Theme) {
    setThemeState(t);
    apply(t);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, t);
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) return { theme: 'auto', setTheme: () => {} };
  return ctx;
}

// Botón que cicla auto -> light -> dark -> auto, con icono por estado.
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useT();
  const next: Record<Theme, Theme> = { auto: 'light', light: 'dark', dark: 'auto' };
  const icon: Record<Theme, string> = { auto: '🌗', light: '☀️', dark: '🌙' };
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setTheme(next[theme])}
      aria-label={t(`theme.${theme}` as 'theme.auto')}
      title={t(`theme.${theme}` as 'theme.auto')}
    >
      {icon[theme]}
    </button>
  );
}
