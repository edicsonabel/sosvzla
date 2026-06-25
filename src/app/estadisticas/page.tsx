'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n';
import type { DictKey } from '@/lib/dict';
import { fetchSummary, type AnalyticsSummary, type EventName } from '@/lib/analytics';
import { BarChart, DonutChart, CHART_COLORS, type BarRow, type Slice } from './Charts';
import PersonsStats from '../PersonsStats';

// Eventos a mostrar como tarjetas de total, en orden de relevancia.
const METRICS: EventName[] = [
  'session_start',
  'page_view',
  'report_created',
  'person_reported',
  'search_performed',
  'map_viewed',
  'report_shared',
];

// Series del gráfico diario (las de mayor volumen/interés).
const DAILY_SERIES: EventName[] = [
  'session_start',
  'page_view',
  'report_created',
  'search_performed',
];

export default function Estadisticas() {
  const { t } = useT();
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchSummary().then((d) => {
      if (!active) return;
      setData(d);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <>
        <span className="kicker">{t('stats.kicker')}</span>
        <h1>{t('stats.title')}</h1>
        <p className="lead">{t('stats.loading')}</p>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <span className="kicker">{t('stats.kicker')}</span>
        <h1>{t('stats.title')}</h1>
        <p className="lead">{t('stats.empty')}</p>
      </>
    );
  }

  // Tarjetas de total: total absoluto + delta de últimos 7 días.
  const cards = METRICS.map((ev) => ({
    ev,
    label: t(`stats.metric.${ev}` as DictKey),
    total: data.totals[ev] ?? 0,
    last7: data.last7d[ev] ?? 0,
  }));

  // Filas del gráfico diario: una por día, con el conteo de cada serie.
  const barRows: BarRow[] = data.daily.map((row) => {
    const values: Record<string, number> = {};
    for (const ev of DAILY_SERIES) values[t(`stats.metric.${ev}` as DictKey)] = (row[ev] as number) ?? 0;
    // Etiqueta X corta: "DD/MM".
    const [, m, d] = row.day.split('-');
    return { x: `${d}/${m}`, values };
  });
  const barSeries = DAILY_SERIES.map((ev, i) => ({
    label: t(`stats.metric.${ev}` as DictKey),
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  // Desgloses (donut): tipo de reporte y canal de compartido.
  const typeSlices: Slice[] = Object.entries(data.by_type)
    .map(([k, v]) => ({ label: t(`stats.type.${k}` as DictKey), value: v }))
    .sort((a, b) => b.value - a.value);
  const channelSlices: Slice[] = Object.entries(data.by_channel)
    .map(([k, v]) => ({ label: t(`stats.channel.${k}` as DictKey), value: v }))
    .sort((a, b) => b.value - a.value);

  const when = new Date(data.generated_at).toLocaleString();

  return (
    <>
      <span className="kicker">{t('stats.kicker')}</span>
      <h1>{t('stats.title')}</h1>
      <p className="lead">{t('stats.lead')}</p>

      <h2 className="stats-h2">{t('pstats.title')}</h2>
      <PersonsStats />

      <h2 className="stats-h2">{t('stats.section.totals')}</h2>
      <div className="stats-cards">
        {cards.map((c) => (
          <div key={c.ev} className="stats-card">
            <span className="stats-card-num">{c.total.toLocaleString()}</span>
            <span className="stats-card-label">{c.label}</span>
            <span className="stats-card-delta">
              +{c.last7.toLocaleString()} · {t('stats.window.7d').toLowerCase()}
            </span>
          </div>
        ))}
      </div>

      <h2 className="stats-h2">{t('stats.section.daily')}</h2>
      <BarChart rows={barRows} series={barSeries} title={t('stats.section.daily')} />

      <div className="stats-donuts">
        <DonutChart data={typeSlices} title={t('stats.section.byType')} />
        <DonutChart data={channelSlices} title={t('stats.section.byChannel')} />
      </div>

      <p className="stats-updated">{t('stats.updated', { when })}</p>
    </>
  );
}
