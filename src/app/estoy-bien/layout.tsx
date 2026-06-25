import type { Metadata } from 'next';

const title = 'Estoy bien — Avisa que estás a salvo';
const description =
  'Avisa a tu familia que estás a salvo en segundos. Registra tu estado para que tus seres queridos dejen de buscarte.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/estoy-bien' },
  openGraph: {
    title: `${title} · SOS Venezuela`,
    description,
    url: 'https://sosvzla.com/estoy-bien',
    type: 'website',
  },
  twitter: { title: `${title} · SOS Venezuela`, description },
};

export default function EstoyBienLayout({ children }: { children: React.ReactNode }) {
  return children;
}
