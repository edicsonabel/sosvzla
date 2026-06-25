'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase, type Report, type ReportType } from '@/lib/supabase';
import { useT } from '@/lib/i18n';
import { track } from '@/lib/analytics';

const markerIcon = (color: string, pulse: boolean) =>
  L.divIcon({
    className: '',
    html: `<div style="position:relative">
      ${pulse ? `<span style="position:absolute;inset:-6px;border-radius:50%;background:${color};opacity:.35;animation:mpulse 1.8s ease-out infinite"></span>` : ''}
      <div style="position:relative;background:${color};width:18px;height:18px;border-radius:50%;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5)"></div>
    </div>
    <style>@keyframes mpulse{0%{transform:scale(.8);opacity:.5}100%{transform:scale(2.2);opacity:0}}</style>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

const STATUS_COLOR: Record<string, string> = {
  pending: '#0b3d66',    // azul: necesita ayuda
  dispatched: '#f59e0b', // ámbar: en camino
  resolved: '#16a34a',   // verde: atendido
};

// Centro de respaldo (Caracas) SOLO si no hay ningún reporte con coordenadas.
const FALLBACK_CENTER: [number, number] = [10.4806, -66.9036];

type Coord = Report & { lat: number; lng: number };

// Ajusta la vista del mapa a los reportes visibles. Sin reportes con coords,
// queda en el centro de respaldo. Se ejecuta cuando cambian los puntos.
function FitToReports({ points }: { points: Coord[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 15);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  }, [points, map]);
  return null;
}

export default function ReportsMap() {
  const { t } = useT();
  const [items, setItems] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [typeFilter, setTypeFilter] = useState<ReportType | 'all'>('all');

  // Analítica: una sola vez al abrir el mapa (no en cada poll de 15s).
  useEffect(() => {
    track('map_viewed');
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      // Vista pública: sin contacto, sin reportes 'false_report'.
      const { data, error: err } = await supabase
        .from('reports_public')
        .select('*')
        .order('created_at', { ascending: false });
      if (!active) return;
      if (err) {
        setError(true);
      } else if (data) {
        setItems(data as Report[]);
        setError(false);
      }
      setLoading(false);
    }
    load();

    // Refresco para el público anónimo: polling ligero (no requiere
    // permisos Realtime sobre la tabla cruda, que RLS restringe a voluntarios).
    const interval = setInterval(load, 15000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Solo reportes con coordenadas pueden ir al mapa.
  const withCoords = useMemo(
    () => items.filter((r): r is Coord => r.lat != null && r.lng != null),
    [items]
  );

  // Conteo por tipo (sobre los que tienen coords, que son los del mapa).
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: withCoords.length };
    for (const r of withCoords) c[r.type] = (c[r.type] ?? 0) + 1;
    return c;
  }, [withCoords]);

  const visible = useMemo(
    () => (typeFilter === 'all' ? withCoords : withCoords.filter((r) => r.type === typeFilter)),
    [withCoords, typeFilter]
  );

  const noCoords = items.length - withCoords.length;

  return (
    <>
      {/* Filtros por tipo, con contador. */}
      <div className="filtros-mapa" role="group" aria-label="Filtrar por tipo de emergencia">
        <button
          className={`chip ${typeFilter === 'all' ? 'chip-on' : ''}`}
          onClick={() => setTypeFilter('all')}
        >
          {t('map.filter.all', { n: counts.all ?? 0 })}
        </button>
        {(['medical', 'rescue', 'trapped', 'water_food', 'other'] as ReportType[]).map((ty) =>
          counts[ty] ? (
            <button
              key={ty}
              className={`chip ${typeFilter === ty ? 'chip-on' : ''}`}
              onClick={() => setTypeFilter(ty)}
            >
              {t(`type.${ty}.short`)} ({counts[ty]})
            </button>
          ) : null
        )}
      </div>

      {error && (
        <div className="aviso aviso-err" role="alert">
          {t('map.error')}
        </div>
      )}
      {noCoords > 0 && (
        <p style={{ color: 'var(--texto-sec)', fontSize: '0.85rem' }}>
          {t('map.noCoords', { n: noCoords })}
        </p>
      )}

      <div className="mapa-wrap">
        <MapContainer center={FALLBACK_CENTER} zoom={12} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitToReports points={visible} />
          {visible.map((r) => (
            <Marker
              key={r.id}
              position={[r.lat, r.lng]}
              icon={markerIcon(STATUS_COLOR[r.status] ?? '#64748b', r.status === 'pending')}
            >
              <Popup>
                <strong>{t(`type.${r.type}.short`)}</strong>
                <br />
                {r.description ?? t('map.noDesc')}
                <br />
                <span className={`badge badge-${r.status}`}>{t(`status.${r.status}`)}</span>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        {loading && <p style={{ padding: '1rem' }}>{t('map.loading')}</p>}
      </div>
    </>
  );
}
