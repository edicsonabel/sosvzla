'use client';

import { useEffect, useState } from 'react';
import { submitOrQueue, enableAutoSync, pendingCount } from '@/lib/offlineQueue';
import Turnstile, { turnstileEnabled } from '@/lib/Turnstile';
import type { ReportType } from '@/lib/supabase';

const TYPES: { value: ReportType; label: string }[] = [
  { value: 'medical', label: '🩺 Médico / herido' },
  { value: 'rescue', label: '🚒 Rescate' },
  { value: 'trapped', label: '🏚️ Atrapado / colapso' },
  { value: 'water_food', label: '💧 Agua / comida' },
  { value: 'other', label: '❓ Otro' },
];

type SubmitState = 'idle' | 'submitting' | 'ok' | 'queued' | 'error';

export default function ReportSOS() {
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
      setGeoError('Tu dispositivo no soporta geolocalización.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setManual(false);
      },
      () => {
        setGeoError('No pudimos obtener tu ubicación por GPS. Puedes escribir una referencia y enviar igual.');
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
      setGeoError('Comparte tu ubicación GPS o escribe una referencia de dónde estás.');
      return;
    }
    // Captcha: requerido solo en envío en vivo (con red). Sin red, va a la cola.
    const online = typeof navigator === 'undefined' || navigator.onLine;
    if (turnstileEnabled() && online && !token) {
      setState('error');
      setErrorMsg('Completa la verificación anti-spam para enviar.');
      return;
    }
    setState('submitting');
    // Si no hay GPS, mandamos la referencia escrita dentro de la descripción
    // y coordenadas nulas; el panel de voluntarios la lee.
    const fullDescription = [description, manualText.trim() ? `📍 Referencia: ${manualText.trim()}` : '']
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
      setErrorMsg(r.error ?? 'No se pudo enviar. Intenta de nuevo.');
      return;
    }
    setState(r.queued ? 'queued' : 'ok');
    if (!r.queued) {
      setDescription('');
      setContact('');
      setManualText('');
    }
  }

  return (
    <>
      <span className="kicker">● Emergencia</span>
      <h1>Pedir ayuda</h1>
      <p className="lead">Tu reporte aparecerá en el mapa para que voluntarios y rescatistas te encuentren.</p>

      {queued > 0 && (
        <div className="aviso aviso-cola">
          ⏳ {queued} reporte(s) guardado(s) sin conexión. Se enviarán al volver la red.
        </div>
      )}

      <form onSubmit={submit}>
        <label>
          Tipo de emergencia
          <select value={type} onChange={(e) => setType(e.target.value as ReportType)}>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>

        <label>
          ¿Qué ocurre? (cuántas personas, heridos, detalles)
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej: 4 personas atrapadas en planta baja, una herida."
          />
        </label>

        <label>
          Contacto (opcional)
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Nombre y/o teléfono"
          />
        </label>

        <div className="card">
          <strong>📍 Ubicación</strong>
          {coords ? (
            <p>Lat {coords.lat.toFixed(5)}, Lng {coords.lng.toFixed(5)}</p>
          ) : (
            <p aria-live="polite">{geoError ?? 'Obteniendo ubicación…'}</p>
          )}
          <button type="button" className="btn btn-sec" onClick={locate}>
            Usar mi ubicación GPS
          </button>

          {(manual || (!coords && geoError)) && (
            <label style={{ marginTop: '.75rem' }}>
              ¿Dónde estás? (referencia escrita)
              <input
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Ej: Av. Bolívar, edificio azul frente a la plaza, piso 3."
              />
            </label>
          )}
        </div>

        <Turnstile onToken={setToken} />

        <button className="btn" type="submit" disabled={state === 'submitting'}>
          {state === 'submitting' ? 'Enviando…' : 'Enviar SOS'}
        </button>

        {state === 'ok' && (
          <div className="aviso aviso-ok" role="status" aria-live="polite">✅ SOS enviado. Mantente a salvo, vienen en camino.</div>
        )}
        {state === 'queued' && (
          <div className="aviso aviso-cola" role="status" aria-live="polite">
            ⏳ Sin conexión: tu SOS quedó guardado y se enviará automáticamente.
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
