'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, type Report } from '@/lib/supabase';
import { useT } from '@/lib/i18n';

const STATUS_BADGE: Record<string, string> = {
  pending: 'badge-pending',
  dispatched: 'badge-dispatched',
  resolved: 'badge-resolved',
};

// Seguimiento público de un SOS. La familia abre este enlace para ver el estado.
// Lee de la vista pública (sin contacto). Polling para ver cambios en vivo.
export default function TrackReport({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useT();
  const [report, setReport] = useState<Report | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'notfound'>('loading');

  useEffect(() => {
    let active = true;
    async function load() {
      const { data, error } = await supabase
        .from('reports_public')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (!active) return;
      if (error || !data) {
        setState((s) => (s === 'ok' ? 'ok' : 'notfound'));
      } else {
        setReport(data as Report);
        setState('ok');
      }
    }
    load();
    const interval = setInterval(load, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [id]);

  if (state === 'loading') {
    return <p>{t('track.loading')}</p>;
  }

  if (state === 'notfound' || !report) {
    return (
      <>
        <h1>{t('track.notfound.title')}</h1>
        <p className="lead">
          {t('track.notfound.lead')}
        </p>
        <Link href="/" className="btn btn-sec">{t('track.notfound.home')}</Link>
      </>
    );
  }

  return (
    <>
      <span className="kicker">{t('track.kicker')}</span>
      <h1>{t(`type.${report.type}`)}</h1>

      <div className="card">
        <span className={`badge ${STATUS_BADGE[report.status] ?? ''}`}>
          {t(`status.${report.status}.long`)}
        </span>
        {report.description && (
          <p style={{ marginTop: '0.75rem' }}>{report.description}</p>
        )}
        <p style={{ color: 'var(--texto-sec)', fontSize: '0.85rem', marginTop: '0.75rem' }}>
          {t('track.reportedAt', { date: new Date(report.created_at).toLocaleString() })}
        </p>
      </div>

      <p style={{ color: 'var(--texto-sec)', fontSize: '0.85rem', marginTop: '1rem' }}>
        {t('track.autoUpdate')}
      </p>

      <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <Link href="/mapa" className="btn btn-sec">{t('track.viewMap')}</Link>
        <Link href="/sos" className="btn btn-sec">{t('track.reportAnother')}</Link>
      </div>
    </>
  );
}
