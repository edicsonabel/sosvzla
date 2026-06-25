import type { Metadata, Viewport } from 'next';
import './globals.css';
import ServiceWorker from './ServiceWorker';
import { LanguageProvider } from '@/lib/i18n';
import { Nav, Footer } from './Nav';

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
        <LanguageProvider>
          <ServiceWorker />
          <Nav />
          <main className="container">{children}</main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
