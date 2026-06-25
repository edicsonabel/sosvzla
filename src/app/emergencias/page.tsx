'use client';

import { useT } from '@/lib/i18n';

// Números de emergencia en Venezuela. Pulsando el botón se abre el marcador
// del teléfono (tel:). Mantener actualizado; estos son los nacionales.
interface Contact {
  name: string;
  phone: string; // formato marcable (sin espacios para tel:)
  display: string; // formato legible
  note?: string;
}

const NATIONAL: Contact[] = [
  { name: '🆘 Emergencias (VEN 911)', phone: '911', display: '911', note: 'Línea única nacional' },
  { name: '🚒 Bomberos', phone: '171', display: '171' },
  { name: '🚑 Protección Civil', phone: '0212-6620622', display: '0212-662-0622', note: 'Coordinación nacional' },
  { name: '👮 Policía (PNB)', phone: '171', display: '171' },
];

const RESCUE: Contact[] = [
  { name: '🚑 Rescarven', phone: '0212-9092222', display: '0212-909-2222', note: 'Ambulancia privada' },
  { name: '🚁 Aeroambulancia', phone: '0212-2659647', display: '0212-265-9647' },
  { name: '🏥 Cruz Roja Venezolana', phone: '0212-5714380', display: '0212-571-4380' },
];

function CallCard({ c }: { c: Contact }) {
  return (
    <a className="item call-card" href={`tel:${c.phone}`}>
      <div style={{ flex: 1 }}>
        <strong>{c.name}</strong>
        {c.note && <div style={{ color: 'var(--texto-sec)', fontSize: '0.85rem' }}>{c.note}</div>}
      </div>
      <span className="call-num">📞 {c.display}</span>
    </a>
  );
}

export default function Emergencias() {
  const { t } = useT();
  return (
    <>
      <span className="kicker">{t('emerg.kicker')}</span>
      <h1>{t('emerg.title')}</h1>
      <p className="lead">{t('emerg.lead')}</p>

      <h3 style={{ marginTop: '1.5rem' }}>{t('emerg.national')}</h3>
      <div className="lista">
        {NATIONAL.map((c) => <CallCard key={c.name} c={c} />)}
      </div>

      <h3 style={{ marginTop: '1.5rem' }}>{t('emerg.rescue')}</h3>
      <div className="lista">
        {RESCUE.map((c) => <CallCard key={c.name} c={c} />)}
      </div>

      <p style={{ color: 'var(--texto-sec)', fontSize: '0.85rem', marginTop: '1.5rem' }}>
        {t('emerg.outdated')}
      </p>
    </>
  );
}
