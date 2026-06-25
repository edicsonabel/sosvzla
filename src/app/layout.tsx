import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import ServiceWorker from './ServiceWorker';
import { LanguageProvider } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';
import { Nav, Footer } from './Nav';
import PageViewTracker from './PageViewTracker';

// Anti-FOUC: aplica el tema guardado en <html> antes del primer paint, para
// que no parpadee de claro a oscuro al cargar.
const themeInit = `(function(){try{var t=localStorage.getItem('sos_theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

// Structured data: identifica el sitio y habilita el cuadro de búsqueda en
// resultados de Google (sitelinks searchbox apuntando a /buscar).
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://sosvzla.com/#organization',
      name: 'SOS Venezuela',
      url: 'https://sosvzla.com',
      logo: 'https://sosvzla.com/icon.svg',
    },
    {
      '@type': 'WebSite',
      '@id': 'https://sosvzla.com/#website',
      url: 'https://sosvzla.com',
      name: 'SOS Venezuela',
      description: 'Plataforma de ayuda en emergencia para Venezuela.',
      inLanguage: 'es-VE',
      publisher: { '@id': 'https://sosvzla.com/#organization' },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://sosvzla.com/buscar?q={search_term_string}',
        },
        'query-input': 'required name=search_term_string',
      },
    },
  ],
};

const SITE_DESC =
  'Reporta emergencias con tu ubicación, búscalas en el mapa en vivo y encuentra a personas desaparecidas. Funciona aunque la señal sea débil.';

export const metadata: Metadata = {
  metadataBase: new URL('https://sosvzla.com'),
  title: {
    default: 'SOS Venezuela — Ayuda en emergencia',
    template: '%s · SOS Venezuela',
  },
  description: SITE_DESC,
  applicationName: 'SOS Venezuela',
  manifest: '/manifest.json',
  keywords: [
    'SOS Venezuela',
    'emergencia Venezuela',
    'personas desaparecidas',
    'sismo Venezuela',
    'rescate',
    'reportar emergencia',
    'mapa de emergencias',
    'ayuda humanitaria',
  ],
  authors: [{ name: 'SOS Venezuela' }],
  creator: 'SOS Venezuela',
  publisher: 'SOS Venezuela',
  alternates: { canonical: '/' },
  formatDetection: { telephone: true, email: false, address: false },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    title: 'SOS Venezuela — Ayuda en emergencia',
    description: SITE_DESC,
    url: 'https://sosvzla.com',
    siteName: 'SOS Venezuela',
    locale: 'es_VE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SOS Venezuela — Ayuda en emergencia',
    description: SITE_DESC,
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
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <LanguageProvider>
          <ThemeProvider>
            <ServiceWorker />
            <PageViewTracker />
            <Nav />
            <main className="container">{children}</main>
            <Footer />
          </ThemeProvider>
        </LanguageProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
