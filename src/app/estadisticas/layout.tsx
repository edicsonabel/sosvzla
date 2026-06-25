import type { Metadata } from 'next';

const title = 'Estadísticas de uso';
const description =
  'Datos agregados y anónimos del uso de SOS Venezuela: reportes, búsquedas, visitas al mapa y más. Sin cookies de seguimiento ni datos personales.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/estadisticas' },
  openGraph: {
    title: `${title} · SOS Venezuela`,
    description,
    url: 'https://sosvzla.com/estadisticas',
    type: 'website',
  },
  twitter: { title: `${title} · SOS Venezuela`, description },
};

export default function EstadisticasLayout({ children }: { children: React.ReactNode }) {
  return children;
}
