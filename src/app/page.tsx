'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n';

export default function Home() {
  const { t } = useT();
  return (
    <>
      <section className="hero">
        <span className="kicker reveal">{t('home.kicker')}</span>
        <h1 className="reveal" style={{ whiteSpace: 'pre-line' }}>{t('home.title')}</h1>
        <p className="lead reveal">
          {t('home.lead')}
        </p>

        <div className="reveal hero-cta">
          <Link href="/sos" className="btn btn-sos">
            <span className="btn-sos-label">{t('home.cta')}</span>
            <span className="btn-sos-sub">{t('home.card.sos.desc')}</span>
          </Link>
        </div>
      </section>

      <div className="grid-acciones">
        <Link href="/mapa" className="card reveal">
          <span className="card-icon" aria-hidden="true">🗺️</span>
          <h3>{t('home.card.map.title')}</h3>
          <p>{t('home.card.map.desc')}</p>
        </Link>
        <Link href="/buscar" className="card reveal">
          <span className="card-icon" aria-hidden="true">🔎</span>
          <h3>{t('home.card.search.title')}</h3>
          <p>{t('home.card.search.desc')}</p>
        </Link>
        <Link href="/estoy-bien" className="card reveal">
          <span className="card-icon" aria-hidden="true">✅</span>
          <h3>{t('home.card.safe.title')}</h3>
          <p>{t('home.card.safe.desc')}</p>
        </Link>
        <Link href="/emergencias" className="card reveal">
          <span className="card-icon" aria-hidden="true">📞</span>
          <h3>{t('home.card.phones.title')}</h3>
          <p>{t('home.card.phones.desc')}</p>
        </Link>
      </div>
    </>
  );
}
