'use client';

import { useEffect, useState } from 'react';
import { submitOrQueue, enableAutoSync, pendingCount } from '@/lib/offlineQueue';
import Turnstile, { turnstileEnabled } from '@/lib/Turnstile';
import { useT } from '@/lib/i18n';
import type { ReportType } from '@/lib/supabase';

const TYPE_VALUES: ReportType[] = ['medical', 'rescue', 'trapped', 'water_food', 'other'];

type SubmitState = 'idle' | 'submitting' | 'ok' | 'queued' | 'error';

export default function ReportSOS() {
  const { t } = useT();
  const [type, setType] = useState<ReportType>('trapped');
  const [description, setDescription] = useState('');
  const [contact, setContact] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [manual, setManual] = useState(false); // ingresar ubicación a mano
  const [manualText, setManualText] = useState(''); // referencia escrita si no hay GPS
  const [state, setState] = useState<SubmitState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [queued, setQueued] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null); // id del SOS para compartir
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    enableAutoSync((n) => {
      setQueued(pendingCount());
      console.log(`${n} reportes sincronizados`);
    });
    setQueued(pendingCount());
    locate();
  }, []);

  function locate() {
    setGeoError(null);
    if (!('geolocation' in navigator)) {
      setGeoError(t('sos.err.noSupport'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setManual(false);
      },
      () => {
        setGeoError(t('sos.err.noGps'));
        setManual(true);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    // GPS es lo ideal, pero NO bloquea el SOS: en emergencia, una referencia
    // escrita (calle, edificio) ya ayuda a los rescatistas a ubicar.
    if (!coords && !manualText.trim()) {
      setGeoError(t('sos.err.noLocAtAll'));
      return;
    }
    // Captcha: requerido solo en envío en vivo (con red). Sin red, va a la cola.
    const online = typeof navigator === 'undefined' || navigator.onLine;
    if (turnstileEnabled() && online && !token) {
      setState('error');
      setErrorMsg(t('sos.err.captcha'));
      return;
    }
    setState('submitting');
    // Si no hay GPS, mandamos la referencia escrita dentro de la descripción
    // y coordenadas nulas; el panel de voluntarios la lee.
    const fullDescription = [description, manualText.trim() ? `${t('sos.ref.prefix')}: ${manualText.trim()}` : '']
      .filter(Boolean)
      .join('\n') || null;
    const r = await submitOrQueue('reports', {
      type,
      description: fullDescription,
      contact: contact || null,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
    }, token ?? undefined);
    setQueued(pendingCount());
    setToken(null); // el token Turnstile es de un solo uso
    if (!r.ok) {
      setState('error');
      setErrorMsg(r.error ?? t('sos.err.generic'));
      return;
    }
    setState(r.queued ? 'queued' : 'ok');
    if (!r.queued) {
      setShareId(r.id ?? null);
      setDescription('');
      setContact('');
      setManualText('');
    }
  }

  function shareUrl(): string {
    if (typeof window === 'undefined' || !shareId) return '';
    return `${window.location.origin}/r/${shareId}`;
  }

  async function copyShare() {
    const url = shareUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard bloqueado: el usuario puede copiar manual del input */
    }
  }

  return (
    <>
      <span className="kicker">{t('sos.kicker')}</span>
      <h1>{t('sos.title')}</h1>
      <p className="lead">{t('sos.lead')}</p>

      {queued > 0 && (
        <div className="aviso aviso-cola">
          ⏳ {t('sos.queued.count', { n: queued })}
        </div>
      )}

      <form onSubmit={submit}>
        <label>
          {t('sos.field.type')}
          <select value={type} onChange={(e) => setType(e.target.value as ReportType)}>
            {TYPE_VALUES.map((value) => (
              <option key={value} value={value}>{t(`type.${value}`)}</option>
            ))}
          </select>
        </label>

        <label>
          {t('sos.field.what')}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('sos.field.what.ph')}
          />
        </label>

        <label>
          {t('sos.field.contact')}
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder={t('sos.field.contact.ph')}
          />
        </label>

        <div className="card">
          <strong>{t('sos.loc.title')}</strong>
          {coords ? (
            <p>{t('sos.loc.coords', { lat: coords.lat.toFixed(5), lng: coords.lng.toFixed(5) })}</p>
          ) : (
            <p aria-live="polite">{geoError ?? t('sos.loc.getting')}</p>
          )}
          <button type="button" className="btn btn-sec" onClick={locate}>
            {t('sos.loc.useGps')}
          </button>

          {(manual || (!coords && geoError)) && (
            <label style={{ marginTop: '.75rem' }}>
              {t('sos.loc.manual')}
              <input
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder={t('sos.loc.manual.ph')}
              />
            </label>
          )}
        </div>

        <Turnstile onToken={setToken} />

        <button className="btn" type="submit" disabled={state === 'submitting'}>
          {state === 'submitting' ? t('sos.submitting') : t('sos.submit')}
        </button>

        {state === 'ok' && (
          <div className="aviso aviso-ok" role="status" aria-live="polite">
            {t('sos.ok')}
            {shareId && (
              <div className="share-sos">
                <p style={{ margin: '0.5rem 0', fontWeight: 600 }}>
                  {t('sos.share.title')}
                </p>
                <input readOnly value={shareUrl()} onFocus={(e) => e.target.select()} />
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-sec" onClick={copyShare}>
                    {copied ? t('sos.share.copied') : t('sos.share.copy')}
                  </button>
                  <a
                    className="btn btn-sec"
                    href={`https://wa.me/?text=${encodeURIComponent(t('sos.share.waText', { url: shareUrl() }))}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t('sos.share.whatsapp')}
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
        {state === 'queued' && (
          <div className="aviso aviso-cola" role="status" aria-live="polite">
            {t('sos.queued')}
          </div>
        )}
        {state === 'error' && (
          <div className="aviso aviso-err" role="alert" aria-live="assertive">
            ⚠️ {errorMsg}
          </div>
        )}
      </form>
    </>
  );
}
