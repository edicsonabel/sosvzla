'use client';

import dynamic from 'next/dynamic';

// Leaflet usa window -> solo cliente, sin SSR.
const ReportsMap = dynamic(() => import('./ReportsMap'), {
  ssr: false,
  loading: () => <p>Cargando mapa…</p>,
});

export default function MapPage() {
  return (
    <>
      <span className="kicker">● Coordinación en vivo</span>
      <h1>Mapa de SOS</h1>
      <p className="lead">
        Los reportes aparecen en tiempo real. Voluntarios: coordínense por zona
        y prioridad.
      </p>
      <div className="leyenda">
        <span><i style={{ background: '#0b3d66' }} /> Pendiente</span>
        <span><i style={{ background: '#f59e0b' }} /> En camino</span>
        <span><i style={{ background: '#16a34a' }} /> Resuelto</span>
      </div>
      <ReportsMap />
    </>
  );
}
