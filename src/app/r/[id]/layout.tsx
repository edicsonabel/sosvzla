import type { Metadata } from 'next';

// Enlace privado de seguimiento de un SOS: lo abre la familia, no debe
// indexarse ni rastrearse.
export const metadata: Metadata = {
  title: 'Seguimiento de SOS',
  description: 'Sigue en vivo el estado de un reporte de emergencia.',
  robots: { index: false, follow: false },
};

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
