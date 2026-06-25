'use client';

import { useEffect, useState } from 'react';
import { supabase, type Person } from '@/lib/supabase';
import { submitOrQueue } from '@/lib/offlineQueue';
import { uploadPhoto } from '@/lib/uploadPhoto';
import { hashEditorDoc } from '@/lib/editorDoc';
import Turnstile, { turnstileEnabled } from '@/lib/Turnstile';
import EditPersonForm from './EditPersonForm';
import PersonModal from './PersonModal';
import { useT } from '@/lib/i18n';

const BADGE: Record<string, string> = {
  missing: 'badge-missing',
  safe: 'badge-safe',
  found: 'badge-found',
  found_pending: 'badge-found_pending',
};

export default function Search() {
  const { t } = useT();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Person[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null); // persona en modal
  // Fotos cuya URL existe pero falla la carga (404/CORS): caen al placeholder.
  const [photoFail, setPhotoFail] = useState<Record<string, boolean>>({});

  // formulario reportar desaparecido
  const [name, setName] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [lastSeen, setLastSeen] = useState('');
  const [description, setDescription] = useState('');
  const [contact, setContact] = useState('');
  const [editorDoc, setEditorDoc] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState<null | 'ok' | 'queued'>(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  async function search() {
    // Vista pública: sin contacto.
    let query = supabase.from('persons_public').select('*').order('created_at', { ascending: false });
    if (q.trim()) {
      const term = q.trim();
      // Busca por nombre o por documento (cédula/DNI).
      query = query.or(`name.ilike.%${term}%,document_id.ilike.%${term}%`);
    }
    const { data } = await query;
    if (data) setResults(data as Person[]);
  }

  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function report(e: React.FormEvent) {
    e.preventDefault();
    setPhotoError(null);

    const online = typeof navigator === 'undefined' || navigator.onLine;
    if (turnstileEnabled() && online && !token) {
      setPhotoError(t('search.err.captcha'));
      return;
    }

    // Sube la foto primero (requiere red). Si falla, avisa pero deja seguir.
    let photoUrl: string | null = null;
    if (photo) {
      setUploading(true);
      const up = await uploadPhoto(photo);
      setUploading(false);
      if (up.error) {
        setPhotoError(up.error);
        return; // no enviamos si la foto que el usuario eligió falló
      }
      photoUrl = up.url;
    }

    // Hash de la cédula del reportante = clave para editar luego (opcional).
    const editorHash = await hashEditorDoc(editorDoc);

    const r = await submitOrQueue('persons', {
      name,
      document_id: documentId || null,
      status: 'missing',
      last_seen: lastSeen || null,
      description: description || null,
      contact: contact || null,
      photo_url: photoUrl,
      editor_doc_hash: editorHash,
    }, token ?? undefined);
    setToken(null);
    if (!r.ok) {
      setPhotoError(r.error ?? 'No se pudo enviar. Intenta de nuevo.');
      return;
    }
    setSubmitted(r.queued ? 'queued' : 'ok');
    if (!r.queued) {
      setName('');
      setDocumentId('');
      setLastSeen('');
      setDescription('');
      setContact('');
      setEditorDoc('');
      setPhoto(null);
      search();
    }
  }

  return (
    <>
      <span className="kicker">{t('search.kicker')}</span>
      <h1>{t('search.title')}</h1>
      <p className="lead">{t('search.lead')}</p>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('search.input.ph')}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          style={{ flex: 1 }}
        />
        <button className="btn" onClick={search}>{t('search.btn')}</button>
      </div>

      <button
        className="btn btn-sec"
        style={{ marginTop: '0.75rem' }}
        onClick={() => setShowForm((v) => !v)}
      >
        {showForm ? t('search.report.close') : t('search.report.open')}
      </button>

      {showForm && (
        <form onSubmit={report}>
          <label>
            {t('search.field.name')}
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            {t('search.field.doc')}
            <input value={documentId} onChange={(e) => setDocumentId(e.target.value)} placeholder={t('search.field.doc.ph')} />
          </label>
          <label>
            {t('search.field.lastSeen')}
            <input value={lastSeen} onChange={(e) => setLastSeen(e.target.value)} />
          </label>
          <label>
            {t('search.field.desc')}
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label>
            {t('search.field.contact')}
            <input value={contact} onChange={(e) => setContact(e.target.value)} />
          </label>
          <label>
            {t('search.field.editorDoc')}
            <input value={editorDoc} onChange={(e) => setEditorDoc(e.target.value)} placeholder={t('search.field.editorDoc.ph')} />
          </label>
          <label>
            {t('search.field.photo')}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                setPhotoError(null);
                setPhoto(e.target.files?.[0] ?? null);
              }}
            />
          </label>
          {photo && (
            <img
              src={URL.createObjectURL(photo)}
              alt={t('search.photo.preview')}
              style={{ maxWidth: 140, borderRadius: 'var(--r-sm)', border: '1px solid var(--borde)' }}
            />
          )}
          {photoError && <div className="aviso aviso-err" role="alert">{photoError}</div>}
          <Turnstile onToken={setToken} />
          <button className="btn" type="submit" disabled={uploading}>
            {uploading ? t('search.uploading') : t('search.submit')}
          </button>
          {submitted === 'ok' && <div className="aviso aviso-ok">{t('search.ok')}</div>}
          {submitted === 'queued' && (
            <div className="aviso aviso-cola">{t('search.queued')}</div>
          )}
        </form>
      )}

      {results.length === 0 && <p style={{ marginTop: '1.25rem' }}>{t('search.noResults')}</p>}

      <div className="personas-grid">
        {results.map((p) => (
          <div className={`persona-card${editingId === p.id ? ' is-editing' : ''}`} key={p.id}>
            {/* Foto protagonista: la cara es lo que permite reconocer al familiar.
                Sin foto → inicial grande, nunca caja vacía. Click → detalle. */}
            <button
              type="button"
              className="persona-foto persona-foto-btn"
              onClick={() => setDetailId(p.id)}
              aria-label={p.name}
            >
              {p.photo_url && !photoFail[p.id] ? (
                <img
                  src={p.photo_url}
                  alt={p.name}
                  loading="lazy"
                  onError={() => setPhotoFail((f) => ({ ...f, [p.id]: true }))}
                  onLoad={(e) => {
                    // Imagen degenerada (1×1, pixel vacío de datos de prueba o
                    // subida corrupta): trátala como ausente y cae al placeholder.
                    const img = e.currentTarget;
                    if (img.naturalWidth <= 2 || img.naturalHeight <= 2) {
                      setPhotoFail((f) => ({ ...f, [p.id]: true }));
                    }
                  }}
                />
              ) : (
                <div className="persona-foto-vacia" aria-hidden="true">
                  <span className="persona-inicial">{(p.name?.trim()?.[0] ?? '?').toUpperCase()}</span>
                  <span className="persona-sinfoto">{t('search.noPhoto')}</span>
                </div>
              )}
              <span className={`badge ${BADGE[p.status]} persona-badge`}>
                {t(`person.status.${p.status}`)}
              </span>
            </button>

            <div className="persona-datos">
              <button type="button" className="persona-nombre persona-nombre-btn" onClick={() => setDetailId(p.id)}>
                {p.name}
              </button>
              {p.document_id && <div className="persona-meta">🪪 {p.document_id}</div>}
              {p.last_seen && <div className="persona-meta">📍 {p.last_seen}</div>}
              {p.description && <div className="persona-desc">{p.description}</div>}
              {editingId !== p.id && (
                <button
                  className="btn btn-sec"
                  style={{ marginTop: '0.6rem', alignSelf: 'flex-start' }}
                  onClick={() => setEditingId(p.id)}
                >
                  {t('search.edit')}
                </button>
              )}
              {editingId === p.id && (
                <EditPersonForm
                  person={p}
                  onCancel={() => setEditingId(null)}
                  onSaved={(updated) => {
                    setResults((rs) => rs.map((x) => (x.id === updated.id ? updated : x)));
                    setEditingId(null);
                  }}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {detailId && (() => {
        const p = results.find((x) => x.id === detailId);
        if (!p) return null;
        return (
          <PersonModal
            person={p}
            onClose={() => setDetailId(null)}
            onEdit={() => { setDetailId(null); setEditingId(p.id); }}
            onUpdated={(updated) => {
              setResults((rs) => rs.map((x) => (x.id === updated.id ? updated : x)));
            }}
          />
        );
      })()}
    </>
  );
}
