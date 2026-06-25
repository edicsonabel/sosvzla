'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import VolunteerPanel from './VolunteerPanel';

export default function Volunteers() {
  const { loading, session, isVolunteer } = useSession();
  const [error, setError] = useState<string | null>(null);

  async function loginWithGoogle() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo:
          typeof window !== 'undefined' ? `${window.location.origin}/voluntarios` : undefined,
      },
    });
    if (error) setError(error.message);
  }

  if (loading) {
    return (
      <>
        <span className="kicker">● Voluntarios</span>
        <h1>Panel de coordinación</h1>
        <p className="lead">Cargando…</p>
      </>
    );
  }

  // No autenticado -> login con Google
  if (!session) {
    return (
      <>
        <span className="kicker">● Acceso voluntarios</span>
        <h1>Panel de coordinación</h1>
        <p className="lead">
          Acceso solo para voluntarios autorizados. Inicia sesión con tu cuenta
          de Google.
        </p>
        <button className="btn btn-google" onClick={loginWithGoogle}>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"/>
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A8.99 8.99 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
          </svg>
          Continuar con Google
        </button>
        {error && <div className="aviso aviso-err" style={{ marginTop: '1rem' }}>{error}</div>}
      </>
    );
  }

  // Autenticado pero NO voluntario
  if (!isVolunteer) {
    return (
      <>
        <span className="kicker">● Acceso restringido</span>
        <h1>Sin permiso</h1>
        <p className="lead">
          Tu cuenta ({session.user.email}) no está autorizada como voluntario.
          Contacta a un coordinador para que te dé de alta.
        </p>
        <button className="btn btn-sec" onClick={() => supabase.auth.signOut()}>
          Cerrar sesión
        </button>
      </>
    );
  }

  // Voluntario autorizado
  return <VolunteerPanel email={session.user.email ?? ''} />;
}
