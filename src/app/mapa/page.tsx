'use client';

import dynamic from 'next/dynamic';
import { useT } from '@/lib/i18n';

// Leaflet usa window -> solo cliente, sin SSR.
const ReportsMap = dynamic(() => import('./ReportsMap'), {
  ssr: false,
  loading: () => <p>…</p>,
});

export default function MapPage() {
  const { t } = useT();
  return (
    <>
      <span className="kicker">{t('map.kicker')}</span>
      <h1>{t('map.title')}</h1>
      <p className="lead">{t('map.lead')}</p>
      <div className="leyenda">
        <span><i style={{ background: '#0b3d66' }} /> {t('map.legend.pending')}</span>
        <span><i style={{ background: '#f59e0b' }} /> {t('map.legend.dispatched')}</span>
        <span><i style={{ background: '#16a34a' }} /> {t('map.legend.resolved')}</span>
      </div>
      <ReportsMap />
    </>
  );
}
