'use client';

import { useEffect, useState } from 'react';
import { supabase, type Person, type PersonStatus } from '@/lib/supabase';
import { useT } from '@/lib/i18n';
import type { DictKey } from '@/lib/dict';

const STATUS_LABEL: Record<string, DictKey> = {
  missing: 'person.status.missing',
  safe: 'person.status.safe',
  found: 'person.status.found',
  found_pending: 'person.status.found_pending',
};

const FILTERS: { value: PersonStatus | 'all'; label: DictKey }[] = [
  { value: 'all', label: 'ppanel.filter.all' },
  { value: 'missing', label: 'ppanel.filter.missing' },
  { value: 'found_pending', label: 'ppanel.filter.found_pending' },
  { value: 'safe', label: 'ppanel.filter.safe' },
  { value: 'found', label: 'ppanel.filter.found' },
];

export default function PersonsPanel() {
  const { t } = useT();
  const [items, setItems] = useState<Person[]>([]);
  const [filter, setFilter] = useState<PersonStatus | 'all'>('missing');
  const [loading, setLoading] = useState(true);

  async function load() {
    // Tabla cruda (con contacto): RLS solo permite a voluntarios.
    const { data } = await supabase
      .from('persons')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setItems(data as Person[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel('panel-persons')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'persons' }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function changeStatus(id: string, status: PersonStatus) {
    // Actualización optimista; revertir si falla.
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    const { error } = await supabase.from('persons').update({ status }).eq('id', id);
    if (error) load();
  }

  const visible = items.filter((p) => (filter === 'all' ? true : p.status === filter));
  const countBy = (s: PersonStatus) => items.filter((p) => p.status === s).length;

  return (
    <>
      <p className="lead">
        {t('ppanel.summary', {
          missing: countBy('missing'),
          safe: countBy('safe'),
          found: countBy('found'),
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

      {loading && <p>{t('ppanel.loading')}</p>}

      <div className="lista">
        {!loading && visible.length === 0 && <p>{t('ppanel.empty')}</p>}
        {visible.map((p) => (
          <div className="item" key={p.id}>
            <div style={{ display: 'flex', gap: '0.85rem' }}>
              {p.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.photo_url}
                  alt={p.name}
                  style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 'var(--r-sm)', flexShrink: 0, border: '1px solid var(--borde)' }}
                />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <strong>{p.name}</strong>
                  <span className={`badge badge-${p.status}`}>
                    {STATUS_LABEL[p.status] ? t(STATUS_LABEL[p.status]) : p.status}
                  </span>
                </div>
                {p.document_id && <div style={{ color: 'var(--texto-sec)' }}>🪪 {p.document_id}</div>}
                {p.last_seen && <div>📍 {p.last_seen}</div>}
                {p.description && <div style={{ color: 'var(--texto-sec)' }}>{p.description}</div>}
                {p.contact && <div style={{ marginTop: '0.3rem' }}>📞 {p.contact}</div>}
                {p.reported_by && (
                  <div style={{ color: 'var(--texto-sec)', fontSize: '0.85rem' }}>
                    {t('ppanel.reportedBy', { who: p.reported_by })}
                  </div>
                )}

                {/* Sugerencia del reportante pendiente de confirmar. */}
                {p.status === 'found_pending' && (
                  <div className="aviso aviso-cola" style={{ marginTop: '0.5rem' }}>
                    {t('ppanel.claimNote')}
                  </div>
                )}

                <div className="acciones">
                  {p.status === 'found_pending' ? (
                    <>
                      <button className="chip" onClick={() => changeStatus(p.id, 'found')}>
                        {t('ppanel.action.confirmFound')}
                      </button>
                      <button className="chip chip-peligro" onClick={() => changeStatus(p.id, 'missing')}>
                        {t('ppanel.action.reject')}
                      </button>
                    </>
                  ) : (
                    <>
                      {p.status !== 'missing' && (
                        <button className="chip" onClick={() => changeStatus(p.id, 'missing')}>
                          {t('ppanel.action.missing')}
                        </button>
                      )}
                      {p.status !== 'safe' && (
                        <button className="chip" onClick={() => changeStatus(p.id, 'safe')}>
                          {t('ppanel.action.safe')}
                        </button>
                      )}
                      {p.status !== 'found' && (
                        <button className="chip" onClick={() => changeStatus(p.id, 'found')}>
                          {t('ppanel.action.found')}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
