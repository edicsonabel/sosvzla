'use client';

import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import AdminPanel from '../voluntarios/AdminPanel';

export default function Admin() {
  const { loading, session, isAdmin } = useSession();

  if (loading) {
    return (
      <>
        <span className="kicker">● Administración</span>
        <h1>Gestión de voluntarios</h1>
        <p className="lead">Cargando…</p>
      </>
    );
  }

  // No autenticado
  if (!session) {
    return (
      <>
        <span className="kicker">● Administración</span>
        <h1>Acceso restringido</h1>
        <p className="lead">Inicia sesión desde el panel de voluntarios.</p>
        <Link href="/voluntarios" className="btn">Ir a voluntarios</Link>
      </>
    );
  }

  // Autenticado pero NO admin
  if (!isAdmin) {
    return (
      <>
        <span className="kicker">● Administración</span>
        <h1>Sin permiso</h1>
        <p className="lead">
          Tu cuenta ({session.user.email}) no es administradora. Esta sección es
          solo para coordinadores.
        </p>
        <button className="btn btn-sec" onClick={() => supabase.auth.signOut()}>
          Cerrar sesión
        </button>
      </>
    );
  }

  // Admin autorizado
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <span className="kicker">● Administración</span>
          <h1>Gestión de voluntarios</h1>
        </div>
        <Link href="/voluntarios" className="btn btn-sec">← Panel de reportes</Link>
      </div>
      <p className="lead">Aprueba solicitudes y administra el equipo de voluntarios.</p>
      <AdminPanel />
    </>
  );
}
