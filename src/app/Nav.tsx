'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useT, LangToggle } from '@/lib/i18n';
import { ThemeToggle } from '@/lib/theme';

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
      </nav>
    </header>
  );
}

export function Footer() {
  const { t } = useT();
  return <footer className="footer">{t('footer.tagline')}</footer>;
}
