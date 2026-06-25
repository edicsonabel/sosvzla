'use client';

import { useEffect, useState } from 'react';
import { submitOrQueue, enableAutoSync, pendingCount } from '@/lib/offlineQueue';
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
  const [state, setState] = useState<SubmitState>('idle');
  const [queued, setQueued] = useState(0);

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
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGeoError('No pudimos obtener tu ubicación. Actívala o escríbela manualmente.'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!coords) {
      setGeoError('Necesitamos tu ubicación para enviar el SOS.');
      return;
    }
    setState('submitting');
    const r = await submitOrQueue('reports', {
      type,
      description: description || null,
      contact: contact || null,
      lat: coords.lat,
      lng: coords.lng,
    });
    setQueued(pendingCount());
    setState(r.queued ? 'queued' : 'ok');
    if (!r.queued) {
      setDescription('');
      setContact('');
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
            <p>{geoError ?? 'Obteniendo ubicación…'}</p>
          )}
          <button type="button" className="btn btn-sec" onClick={locate}>
            Volver a ubicarme
          </button>
        </div>

        <button className="btn" type="submit" disabled={state === 'submitting'}>
          {state === 'submitting' ? 'Enviando…' : 'Enviar SOS'}
        </button>

        {state === 'ok' && (
          <div className="aviso aviso-ok">✅ SOS enviado. Mantente a salvo, vienen en camino.</div>
        )}
        {state === 'queued' && (
          <div className="aviso aviso-cola">
            ⏳ Sin conexión: tu SOS quedó guardado y se enviará automáticamente.
          </div>
        )}
      </form>
    </>
  );
}
