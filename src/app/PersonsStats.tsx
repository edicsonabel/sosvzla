'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n';
import { fetchPersonsStats, type PersonsStats as Stats } from '@/lib/analytics';

// Tarjetas con el estado real de las personas reportadas (tabla persons).
// Cuatro cifras con color semántico: total (azul), sin contacto (rojo),
// a salvo (verde), por confirmar (ámbar). Si falla o no hay nadie reportado,
// no renderiza nada.
export default function PersonsStats() {
  const { t } = useT();
  const [s, setS] = useState<Stats | null>(null);

  useEffect(() => {
    let active = true;
    fetchPersonsStats().then((d) => {
      if (active && d) setS(d);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!s || s.total === 0) return null;

  const cards = [
    { key: 'total', value: s.total, tone: 'info', label: t('pstats.reported') },
    { key: 'missing', value: s.missing, tone: 'danger', label: t('pstats.missing') },
    { key: 'safe', value: s.safe, tone: 'ok', label: t('pstats.safe') },
    { key: 'pending', value: s.found_pending, tone: 'warn', label: t('pstats.pending') },
  ];

  return (
    <div className="pstats">
      {cards.map((c) => (
        <div key={c.key} className={`pstats-card pstats-${c.tone}`}>
          <span className="pstats-num">{c.value.toLocaleString()}</span>
          <span className="pstats-label">{c.label}</span>
        </div>
      ))}
    </div>
  );
}
