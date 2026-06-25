'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useT, LangToggle } from '@/lib/i18n';
import { ThemeToggle } from '@/lib/theme';

const REPO_URL = 'https://github.com/edicsonabel/sosvzla';

// Logo de GitHub (mark oficial, monocromo). Hereda el color del enlace.
function GithubIcon() {
  return (
    <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

// Barra de navegación traducible + toggle de idioma. Cliente porque usa useT.
export function Nav() {
  const { t } = useT();
  const pathname = usePathname();
  const links: [string, string][] = [
    ['/sos', t('nav.report')],
    ['/mapa', t('nav.map')],
    ['/buscar', t('nav.search')],
    ['/estoy-bien', t('nav.safe')],
    ['/emergencias', t('nav.phones')],
    ['/voluntarios', t('nav.volunteers')],
  ];
  return (
    <header className="topbar">
      <Link href="/" className="brand">
        <span className="dot" aria-hidden="true" />
        SOS&nbsp;Venezuela
      </Link>
      <nav>
        {links.map(([href, label]) => (
          <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined}>
            {label}
          </Link>
        ))}
        <ThemeToggle />
        <LangToggle />
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="github-link"
          aria-label={t('nav.github')}
          title={t('nav.github')}
        >
          <GithubIcon />
        </a>
      </nav>
    </header>
  );
}

export function Footer() {
  const { t } = useT();
  return (
    <footer className="footer">
      <span>{t('footer.tagline')}</span>
      <span className="footer-contribute">
        {t('footer.openSource')}{' '}
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
          {t('footer.contribute')} ↗
        </a>
      </span>
    </footer>
  );
}
