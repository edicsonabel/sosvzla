'use client';

import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import { useT } from '@/lib/i18n';
import AdminPanel from '../voluntarios/AdminPanel';

export default function Admin() {
  const { t } = useT();
  const { loading, session, isAdmin } = useSession();

  if (loading) {
    return (
      <>
        <span className="kicker">{t('admin.kicker')}</span>
        <h1>{t('admin.title')}</h1>
        <p className="lead">{t('admin.loading')}</p>
      </>
    );
  }

  // No autenticado
  if (!session) {
    return (
      <>
        <span className="kicker">{t('admin.kicker')}</span>
        <h1>{t('admin.norole.title')}</h1>
        <p className="lead">{t('admin.norole.lead')}</p>
        <Link href="/voluntarios" className="btn">{t('admin.goVol')}</Link>
      </>
    );
  }

  // Autenticado pero NO admin
  if (!isAdmin) {
    return (
      <>
        <span className="kicker">{t('admin.kicker')}</span>
        <h1>{t('admin.noperm.title')}</h1>
        <p className="lead">{t('admin.noperm.lead', { email: session.user.email ?? '' })}</p>
        <button className="btn btn-sec" onClick={() => supabase.auth.signOut()}>
          {t('vol.signout')}
        </button>
      </>
    );
  }

  // Admin autorizado
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <span className="kicker">{t('admin.kicker')}</span>
          <h1>{t('admin.title')}</h1>
        </div>
        <Link href="/voluntarios" className="btn btn-sec">{t('admin.backReports')}</Link>
      </div>
      <p className="lead">{t('admin.lead')}</p>
      <AdminPanel />
    </>
  );
}
