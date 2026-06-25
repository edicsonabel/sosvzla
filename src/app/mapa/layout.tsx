import type { Metadata } from 'next';

const title = 'Mapa de SOS en vivo';
const description =
  'Voluntarios y rescatistas ven en vivo dónde se necesita ayuda. Mapa de emergencias reportadas en Venezuela, actualizado en tiempo real.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/mapa' },
  openGraph: {
    title: `${title} · SOS Venezuela`,
    description,
    url: 'https://sosvzla.com/mapa',
    type: 'website',
  },
  twitter: { title: `${title} · SOS Venezuela`, description },
};

export default function MapaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
