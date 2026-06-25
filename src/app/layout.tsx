import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://sosvzla.com'),
  title: 'SOS Venezuela',
  description: 'Plataforma de ayuda en emergencia: reporta SOS y busca personas.',
  manifest: '/manifest.json',
  openGraph: {
    title: 'SOS Venezuela',
    description: 'Reporta emergencias, búscalas en el mapa y encuentra personas.',
    url: 'https://sosvzla.com',
    siteName: 'SOS Venezuela',
    locale: 'es_VE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SOS Venezuela',
    description: 'Reporta emergencias, búscalas en el mapa y encuentra personas.',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0b3d66' },
    { media: '(prefers-color-scheme: dark)', color: '#07101d' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <header className="topbar">
          <Link href="/" className="brand">
            <span className="dot" aria-hidden="true" />
            SOS&nbsp;Venezuela
          </Link>
          <nav>
            <Link href="/sos">Reportar</Link>
            <Link href="/mapa">Mapa</Link>
            <Link href="/buscar">Buscar</Link>
            <Link href="/estoy-bien">Estoy bien</Link>
            <Link href="/voluntarios">Voluntarios</Link>
          </nav>
        </header>
        <main className="container">{children}</main>
        <footer className="footer">
          proyecto solidario · datos abiertos · ayuda mutua
        </footer>
      </body>
    </html>
  );
}
