'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, type Report, type ReportStatus } from '@/lib/supabase';
import { useT } from '@/lib/i18n';
import type { DictKey } from '@/lib/dict';
import PersonsPanel from './PersonsPanel';
import ConfirmDialog, { type ConfirmOptions } from '@/lib/ConfirmDialog';

const TYPE_LABEL: Record<string, DictKey> = {
  medical: 'type.medical.short',
  rescue: 'type.rescue.short',
  trapped: 'type.trapped.short',
  water_food: 'type.water_food.short',
  other: 'type.other.short',
};

const STATUS_LABEL: Record<string, DictKey> = {
  pending: 'status.pending',
  dispatched: 'status.dispatched',
  resolved: 'status.resolved',
  false_report: 'vpanel.filter.false_report',
};

const FILTERS: { value: ReportStatus | 'active'; label: DictKey }[] = [
  { value: 'active', label: 'vpanel.filter.active' },
  { value: 'pending', label: 'vpanel.filter.pending' },
  { value: 'dispatched', label: 'vpanel.filter.dispatched' },
  { value: 'resolved', label: 'vpanel.filter.resolved' },
  { value: 'false_report', label: 'vpanel.filter.false_report' },
];

export default function VolunteerPanel({ email, isAdmin }: { email: string; isAdmin: boolean }) {
  const { t } = useT();
  const [tab, setTab] = useState<'reports' | 'persons'>('reports');
  const [items, setItems] = useState<Report[]>([]);
  const [filter, setFilter] = useState<ReportStatus | 'active'>('active');
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);

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
          <span className="kicker">{t('vpanel.kicker')}</span>
          <h1>{t('vpanel.title')}</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {isAdmin && (
            <Link href="/admin" className="btn btn-sec">{t('vpanel.admin')}</Link>
          )}
          <button className="btn btn-sec" onClick={() => supabase.auth.signOut()}>
            {t('vpanel.signout', { email })}
          </button>
        </div>
      </div>

      <div className="tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'reports'}
          className={`tab ${tab === 'reports' ? 'tab-on' : ''}`}
          onClick={() => setTab('reports')}
        >
          {t('vpanel.tab.reports')}
        </button>
        <button
          role="tab"
          aria-selected={tab === 'persons'}
          className={`tab ${tab === 'persons' ? 'tab-on' : ''}`}
          onClick={() => setTab('persons')}
        >
          {t('vpanel.tab.persons')}
        </button>
      </div>

      {tab === 'persons' && <PersonsPanel />}

      {tab === 'reports' && (
      <>
      <p className="lead">
        {t('vpanel.summary', {
          pending: countBy('pending'),
          dispatched: countBy('dispatched'),
          resolved: countBy('resolved'),
        })}
      </p>

      <div className="filtros">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            className={`chip ${filter === f.value ? 'chip-on' : ''}`}
            onClick={() => setFilter(f.value)}
          >
            {t(f.label)}
          </button>
        ))}
      </div>

      {loading && <p>{t('vpanel.loading')}</p>}

      <div className="lista">
        {!loading && visible.length === 0 && <p>{t('vpanel.empty')}</p>}
        {visible.map((r) => (
          <div className="item" key={r.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
              <strong>{TYPE_LABEL[r.type] ? t(TYPE_LABEL[r.type]) : r.type}</strong>
              <span className={`badge badge-${r.status}`}>{STATUS_LABEL[r.status] ? t(STATUS_LABEL[r.status]) : r.status}</span>
            </div>
            {r.description && <div style={{ marginTop: '0.3rem' }}>{r.description}</div>}
            <div style={{ color: 'var(--texto-sec)', fontSize: '0.85rem', marginTop: '0.4rem', fontFamily: 'var(--mono)' }}>
              {r.lat != null && r.lng != null ? (
                <>
                  📍 {r.lat.toFixed(5)}, {r.lng.toFixed(5)}
                  {' · '}
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lng}#map=18/${r.lat}/${r.lng}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t('vpanel.viewMap')}
                  </a>
                </>
              ) : (
                <>{t('vpanel.noGps')}</>
              )}
            </div>
            {r.contact && <div style={{ marginTop: '0.3rem' }}>📞 {r.contact}</div>}

            <div className="acciones">
              {r.status !== 'dispatched' && r.status !== 'resolved' && (
                <button className="chip" onClick={() => changeStatus(r.id, 'dispatched')}>
                  {t('vpanel.action.dispatch')}
                </button>
              )}
              {r.status !== 'resolved' && (
                <button
                  className="chip"
                  onClick={() => setConfirm({
                    title: 'confirm.report.resolve.title',
                    message: 'confirm.report.resolve.msg',
                    confirmLabel: 'confirm.report.resolve.ok',
                    onConfirm: () => changeStatus(r.id, 'resolved'),
                  })}
                >
                  {t('vpanel.action.resolve')}
                </button>
              )}
              {r.status !== 'pending' && (
                <button className="chip" onClick={() => changeStatus(r.id, 'pending')}>
                  {t('vpanel.action.reopen')}
                </button>
              )}
              {r.status !== 'false_report' && (
                <button
                  className="chip chip-peligro"
                  onClick={() => setConfirm({
                    title: 'confirm.report.false.title',
                    message: 'confirm.report.false.msg',
                    confirmLabel: 'confirm.report.false.ok',
                    danger: true,
                    onConfirm: () => changeStatus(r.id, 'false_report'),
                  })}
                >
                  {t('vpanel.action.false')}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      </>
      )}

      <ConfirmDialog open={confirm !== null} options={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}
