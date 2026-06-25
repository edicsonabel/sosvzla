'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, type Report, type ReportStatus } from '@/lib/supabase';

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
  false_report: 'falso',
};

const FILTERS: { value: ReportStatus | 'active'; label: string }[] = [
  { value: 'active', label: 'Activos' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'dispatched', label: 'En camino' },
  { value: 'resolved', label: 'Resueltos' },
  { value: 'false_report', label: 'Falsos' },
];

export default function VolunteerPanel({ email, isAdmin }: { email: string; isAdmin: boolean }) {
  const [items, setItems] = useState<Report[]>([]);
  const [filter, setFilter] = useState<ReportStatus | 'active'>('active');
  const [loading, setLoading] = useState(true);

  async function load() {
    // Tabla cruda (con contacto): RLS solo permite a voluntarios.
    const { data } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setItems(data as Report[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // Realtime: como voluntario sí tenemos permiso de lectura sobre la tabla.
    const channel = supabase
      .channel('panel-reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function changeStatus(id: string, status: ReportStatus) {
    // Actualización optimista
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    const { error } = await supabase.from('reports').update({ status }).eq('id', id);
    if (error) load(); // revertir si falla
  }

  const visible = items.filter((r) =>
    filter === 'active' ? r.status === 'pending' || r.status === 'dispatched' : r.status === filter
  );

  const countBy = (s: ReportStatus) => items.filter((r) => r.status === s).length;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <span className="kicker">● Coordinación</span>
          <h1>Panel de voluntarios</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {isAdmin && (
            <Link href="/admin" className="btn btn-sec">★ Gestión de voluntarios</Link>
          )}
          <button className="btn btn-sec" onClick={() => supabase.auth.signOut()}>
            Salir ({email})
          </button>
        </div>
      </div>

      <p className="lead">
        {countBy('pending')} pendientes · {countBy('dispatched')} en camino ·{' '}
        {countBy('resolved')} resueltos
      </p>

      <div className="filtros">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            className={`chip ${filter === f.value ? 'chip-on' : ''}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && <p>Cargando reportes…</p>}

      <div className="lista">
        {!loading && visible.length === 0 && <p>No hay reportes en esta vista.</p>}
        {visible.map((r) => (
          <div className="item" key={r.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
              <strong>{TYPE_LABEL[r.type] ?? r.type}</strong>
              <span className={`badge badge-${r.status}`}>{STATUS_LABEL[r.status] ?? r.status}</span>
            </div>
            {r.description && <div style={{ marginTop: '0.3rem' }}>{r.description}</div>}
            <div style={{ color: 'var(--texto-sec)', fontSize: '0.85rem', marginTop: '0.4rem', fontFamily: 'var(--mono)' }}>
              📍 {r.lat.toFixed(5)}, {r.lng.toFixed(5)}
              {' · '}
              <a
                href={`https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lng}#map=18/${r.lat}/${r.lng}`}
                target="_blank"
                rel="noreferrer"
              >
                ver mapa
              </a>
            </div>
            {r.contact && <div style={{ marginTop: '0.3rem' }}>📞 {r.contact}</div>}

            <div className="acciones">
              {r.status !== 'dispatched' && r.status !== 'resolved' && (
                <button className="chip" onClick={() => changeStatus(r.id, 'dispatched')}>
                  → En camino
                </button>
              )}
              {r.status !== 'resolved' && (
                <button className="chip" onClick={() => changeStatus(r.id, 'resolved')}>
                  ✓ Resuelto
                </button>
              )}
              {r.status !== 'pending' && (
                <button className="chip" onClick={() => changeStatus(r.id, 'pending')}>
                  ↺ Reabrir
                </button>
              )}
              {r.status !== 'false_report' && (
                <button className="chip chip-peligro" onClick={() => changeStatus(r.id, 'false_report')}>
                  ⚑ Falso
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
