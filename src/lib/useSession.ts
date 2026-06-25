'use client';

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface SessionState {
  loading: boolean;
  session: Session | null;
  isVolunteer: boolean;
}

// Hook de sesión + comprobación de rol voluntario.
// El rol se valida contra la tabla public.volunteers (RLS la restringe a
// que cada quien solo vea su propia fila).
export function useSession(): SessionState {
  const [session, setSession] = useState<Session | null>(null);
  const [isVolunteer, setIsVolunteer] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function checkRole(uid: string | undefined) {
      if (!uid) {
        if (active) setIsVolunteer(false);
        return;
      }
      const { data } = await supabase
        .from('volunteers')
        .select('user_id')
        .eq('user_id', uid)
        .maybeSingle();
      if (active) setIsVolunteer(!!data);
    }

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await checkRole(data.session?.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      if (!active) return;
      setSession(s);
      await checkRole(s?.user.id);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { loading, session, isVolunteer };
}
