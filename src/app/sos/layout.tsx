import type { Metadata } from 'next';

const title = 'Pedir ayuda — Reportar emergencia';
const description =
  'Reporta una emergencia con tu ubicación GPS. Tu SOS aparece en el mapa para que voluntarios y rescatistas te encuentren. Funciona sin conexión.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/sos' },
  openGraph: {
    title: `${title} · SOS Venezuela`,
    description,
    url: 'https://sosvzla.com/sos',
    type: 'website',
  },
  twitter: { title: `${title} · SOS Venezuela`, description },
};

export default function SosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
