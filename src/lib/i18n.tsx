'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { dict, type Lang, type DictKey } from './dict';

// i18n ligero: contexto + diccionario, sin librería pesada ni routing por
// locale (no queremos romper el insert anónimo ni el SEO existente). El idioma
// se guarda en localStorage y se aplica en cliente. Por defecto: español (VE).

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue | null>(null);
const STORAGE_KEY = 'sos_lang';

function detectInitial(): Lang {
  if (typeof window === 'undefined') return 'es';
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'es' || saved === 'en') return saved;
  // Detecta del navegador; cualquier cosa que no sea inglés -> español.
  return navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'es';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('es');

  // Hidrata el idioma en cliente (evita mismatch SSR: el server siempre 'es').
  useEffect(() => {
    setLangState(detectInitial());
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.lang = lang;
  }, [lang]);

  function setLang(l: Lang) {
    setLangState(l);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, l);
  }

  function t(key: DictKey, vars?: Record<string, string | number>): string {
    let str: string = dict[lang][key] ?? dict.es[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return str;
  }

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useT(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fallback seguro si se usa fuera del provider (no debería pasar): español.
    return {
      lang: 'es',
      setLang: () => {},
      t: (key) => dict.es[key as DictKey] ?? (key as string),
    };
  }
  return ctx;
}

// Botón de cambio de idioma para la barra de navegación.
export function LangToggle() {
  const { lang, setLang } = useT();
  return (
    <button
      type="button"
      className="lang-toggle"
      onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
      aria-label={lang === 'es' ? 'Switch to English' : 'Cambiar a español'}
    >
      {lang === 'es' ? 'EN' : 'ES'}
    </button>
  );
}
