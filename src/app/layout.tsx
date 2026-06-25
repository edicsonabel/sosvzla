import type { Metadata, Viewport } from 'next';
import './globals.css';
import ServiceWorker from './ServiceWorker';
import { LanguageProvider } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';
import { Nav, Footer } from './Nav';

// Anti-FOUC: aplica el tema guardado en <html> antes del primer paint, para
// que no parpadee de claro a oscuro al cargar.
const themeInit = `(function(){try{var t=localStorage.getItem('sos_theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

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
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <LanguageProvider>
          <ThemeProvider>
            <ServiceWorker />
            <Nav />
            <main className="container">{children}</main>
            <Footer />
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
