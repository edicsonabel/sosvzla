import type { Metadata } from 'next';

const title = 'Teléfonos de emergencia en Venezuela';
const description =
  'Bomberos, ambulancias, Protección Civil y rescate. Números de emergencia nacionales de Venezuela. Toca para llamar directamente.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/emergencias' },
  openGraph: {
    title: `${title} · SOS Venezuela`,
    description,
    url: 'https://sosvzla.com/emergencias',
    type: 'website',
  },
  twitter: { title: `${title} · SOS Venezuela`, description },
};

export default function EmergenciasLayout({ children }: { children: React.ReactNode }) {
  return children;
}
