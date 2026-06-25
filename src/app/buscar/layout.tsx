import type { Metadata } from 'next';

const title = 'Buscar personas desaparecidas';
const description =
  'Busca o reporta a alguien desaparecido tras el sismo. Consulta el estado de las personas reportadas y ayuda a reunir familias.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/buscar' },
  openGraph: {
    title: `${title} · SOS Venezuela`,
    description,
    url: 'https://sosvzla.com/buscar',
    type: 'website',
  },
  twitter: { title: `${title} · SOS Venezuela`, description },
};

export default function BuscarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
