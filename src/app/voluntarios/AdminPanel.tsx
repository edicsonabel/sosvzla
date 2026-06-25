'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface PendingUser {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
}

interface VolunteerRow {
  user_id: string;
  name: string | null;
  role: string;
}

export default function AdminPanel() {
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [team, setTeam] = useState<VolunteerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const [{ data: pend }, { data: vols }] = await Promise.all([
      supabase.rpc('pending_volunteers'),
      supabase.from('volunteers').select('user_id, name, role').order('role'),
    ]);
    setPending((pend as PendingUser[]) ?? []);
    setTeam((vols as VolunteerRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function approve(userId: string, role: 'volunteer' | 'admin') {
    setBusy(userId);
    await supabase.rpc('approve_volunteer', { p_user_id: userId, p_role: role });
    await load();
    setBusy(null);
  }

  async function remove(userId: string) {
    setBusy(userId);
    await supabase.rpc('remove_volunteer', { p_user_id: userId });
    await load();
    setBusy(null);
  }

  return (
    <section style={{ marginTop: '1.5rem' }}>
      {/* Pendientes */}
      <h3 style={{ marginTop: '0.5rem' }}>
        Solicitudes pendientes {pending.length > 0 && `(${pending.length})`}
      </h3>
      {loading && <p>Cargando…</p>}
      {!loading && pending.length === 0 && (
        <p style={{ color: 'var(--texto-sec)' }}>No hay solicitudes pendientes.</p>
      )}
      <div className="lista">
        {pending.map((u) => (
          <div className="item" key={u.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <strong>{u.full_name ?? 'Sin nombre'}</strong>
                <div style={{ color: 'var(--texto-sec)', fontSize: '0.85rem' }}>{u.email}</div>
              </div>
              <div className="acciones" style={{ marginTop: 0, borderTop: 'none', paddingTop: 0 }}>
                <button className="chip" disabled={busy === u.id} onClick={() => approve(u.id, 'volunteer')}>
                  ✓ Aprobar
                </button>
                <button className="chip" disabled={busy === u.id} onClick={() => approve(u.id, 'admin')}>
                  ★ Hacer admin
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Equipo actual */}
      <h3 style={{ marginTop: '1.75rem' }}>Voluntarios activos ({team.length})</h3>
      <div className="lista">
        {team.map((v) => (
          <div className="item" key={v.user_id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <strong>{v.name ?? 'Sin nombre'}</strong>{' '}
                {v.role === 'admin' && <span className="badge badge-found">admin</span>}
              </div>
              <div className="acciones" style={{ marginTop: 0, borderTop: 'none', paddingTop: 0 }}>
                <button className="chip chip-peligro" disabled={busy === v.user_id} onClick={() => remove(v.user_id)}>
                  Quitar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
