'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase, type Report } from '@/lib/supabase';

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

const TYPE_LABEL: Record<string, string> = {
  medical: '🩺 Médico',
  rescue: '🚒 Rescate',
  trapped: '🏚️ Atrapado',
  water_food: '💧 Agua/comida',
  other: '❓ Otro',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'pendiente',
  dispatched: 'en camino',
  resolved: 'resuelto',
};

// Centro por defecto: Caracas. Ajustar a la zona afectada.
const CENTER: [number, number] = [10.4806, -66.9036];

export default function ReportsMap() {
  const [items, setItems] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      // Vista pública: sin contacto, sin reportes 'false_report'.
      const { data } = await supabase
        .from('reports_public')
        .select('*')
        .order('created_at', { ascending: false });
      if (active && data) {
        setItems(data as Report[]);
        setLoading(false);
      }
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

  return (
    <div className="mapa-wrap">
      <MapContainer center={CENTER} zoom={12} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {items
          .filter((r): r is Report & { lat: number; lng: number } => r.lat != null && r.lng != null)
          .map((r) => (
          <Marker
            key={r.id}
            position={[r.lat, r.lng]}
            icon={markerIcon(STATUS_COLOR[r.status] ?? '#64748b', r.status === 'pending')}
          >
            <Popup>
              <strong>{TYPE_LABEL[r.type] ?? r.type}</strong>
              <br />
              {r.description ?? 'Sin descripción'}
              <br />
              <span className={`badge badge-${r.status}`}>{STATUS_LABEL[r.status] ?? r.status}</span>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {loading && <p style={{ padding: '1rem' }}>Cargando mapa…</p>}
    </div>
  );
}
