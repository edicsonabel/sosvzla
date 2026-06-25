'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n';

export default function Home() {
  const { t } = useT();
  return (
    <>
      <div className="reveal">
        <span className="kicker">{t('home.kicker')}</span>
      </div>
      <h1 className="reveal" style={{ whiteSpace: 'pre-line' }}>{t('home.title')}</h1>
      <p className="lead reveal">
        {t('home.lead')}
      </p>

      <div className="reveal" style={{ marginTop: '1.25rem' }}>
        <Link href="/sos" className="btn btn-sos">
          {t('home.cta')}
        </Link>
      </div>

      <div className="grid-acciones">
        <Link href="/mapa" className="card reveal">
          <div className="emoji">🗺️</div>
          <h3>{t('home.card.map.title')}</h3>
          <p>{t('home.card.map.desc')}</p>
        </Link>
        <Link href="/buscar" className="card reveal">
          <div className="emoji">🔎</div>
          <h3>{t('home.card.search.title')}</h3>
          <p>{t('home.card.search.desc')}</p>
        </Link>
        <Link href="/estoy-bien" className="card reveal">
          <div className="emoji">✅</div>
          <h3>{t('home.card.safe.title')}</h3>
          <p>{t('home.card.safe.desc')}</p>
        </Link>
        <Link href="/sos" className="card reveal">
          <div className="emoji">📍</div>
          <h3>{t('home.card.sos.title')}</h3>
          <p>{t('home.card.sos.desc')}</p>
        </Link>
        <Link href="/emergencias" className="card reveal">
          <div className="emoji">📞</div>
          <h3>{t('home.card.phones.title')}</h3>
          <p>{t('home.card.phones.desc')}</p>
        </Link>
      </div>
    </>
  );
}
