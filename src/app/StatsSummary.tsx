'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useT } from '@/lib/i18n';
import type { DictKey } from '@/lib/dict';
import { fetchSummary, type AnalyticsSummary, type EventName } from '@/lib/analytics';

// Resumen de cifras para la home: totales clave (con promedio diario de los
// últimos 30 días) + desgloses por tipo de reporte y canal de compartido.
// Las GRÁFICAS viven solo en /estadisticas; aquí solo números.
// Si la analítica falla o no hay datos, no renderiza nada.
const KEY_METRICS: EventName[] = [
  'session_start',
  'report_created',
  'person_reported',
  'search_performed',
];

// Promedio diario sobre la ventana de 30 días (1 decimal, sin ruido).
function perDay(total30: number): string {
  const avg = total30 / 30;
  return avg >= 10 ? Math.round(avg).toString() : avg.toFixed(1);
}

export default function StatsSummary() {
  const { t } = useT();
  const [data, setData] = useState<AnalyticsSummary | null>(null);

  useEffect(() => {
    let active = true;
    fetchSummary().then((d) => {
      if (active && d) setData(d);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!data) return null;
  const { totals, last30d, by_type, by_channel } = data;
  const hasAny = KEY_METRICS.some((ev) => (totals[ev] ?? 0) > 0);
  if (!hasAny) return null;

  // Desgloses en cifras (ordenados desc). Se omiten si están vacíos.
  const typeRows = Object.entries(by_type)
    .map(([k, v]) => ({ label: t(`stats.type.${k}` as DictKey), value: v }))
    .sort((a, b) => b.value - a.value);
  const channelRows = Object.entries(by_channel)
    .map(([k, v]) => ({ label: t(`stats.channel.${k}` as DictKey), value: v }))
    .sort((a, b) => b.value - a.value);

  return (
    <section className="stats-home reveal">
      <h2 className="stats-home-title">{t('stats.home.title')}</h2>

      <div className="stats-home-cards">
        {KEY_METRICS.map((ev) => (
          <div key={ev} className="stats-home-card">
            <span className="stats-home-num">{(totals[ev] ?? 0).toLocaleString()}</span>
            <span className="stats-home-label">{t(`stats.metric.${ev}` as DictKey)}</span>
            <span className="stats-home-avg">
              {t('stats.perDay', { n: perDay(last30d[ev] ?? 0) })}
            </span>
          </div>
        ))}
      </div>

      <div className="stats-home-breakdowns">
        {typeRows.length > 0 && (
          <div className="stats-breakdown">
            <h3 className="stats-breakdown-title">{t('stats.section.byType')}</h3>
            <ul className="stats-breakdown-list">
              {typeRows.map((r) => (
                <li key={r.label}>
                  <span>{r.label}</span>
                  <span className="stats-breakdown-val">{r.value.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {channelRows.length > 0 && (
          <div className="stats-breakdown">
            <h3 className="stats-breakdown-title">{t('stats.section.byChannel')}</h3>
            <ul className="stats-breakdown-list">
              {channelRows.map((r) => (
                <li key={r.label}>
                  <span>{r.label}</span>
                  <span className="stats-breakdown-val">{r.value.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <Link href="/estadisticas" className="stats-home-link">
        {t('stats.home.link')}
      </Link>
    </section>
  );
}
