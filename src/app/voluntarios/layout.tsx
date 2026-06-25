import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Voluntarios',
  description: 'Panel de voluntarios y rescatistas de SOS Venezuela.',
  alternates: { canonical: '/voluntarios' },
  robots: { index: false, follow: false },
};

export default function VoluntariosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
