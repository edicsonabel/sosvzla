'use client';

import Link from 'next/link';
import { useT, LangToggle } from '@/lib/i18n';
import { ThemeToggle } from '@/lib/theme';

// Barra de navegación traducible + toggle de idioma. Cliente porque usa useT.
export function Nav() {
  const { t } = useT();
  return (
    <header className="topbar">
      <Link href="/" className="brand">
        <span className="dot" aria-hidden="true" />
        SOS&nbsp;Venezuela
      </Link>
      <nav>
        <Link href="/sos">{t('nav.report')}</Link>
        <Link href="/mapa">{t('nav.map')}</Link>
        <Link href="/buscar">{t('nav.search')}</Link>
        <Link href="/estoy-bien">{t('nav.safe')}</Link>
        <Link href="/emergencias">{t('nav.phones')}</Link>
        <Link href="/voluntarios">{t('nav.volunteers')}</Link>
        <ThemeToggle />
        <LangToggle />
      </nav>
    </header>
  );
}

export function Footer() {
  const { t } = useT();
  return <footer className="footer">{t('footer.tagline')}</footer>;
}
