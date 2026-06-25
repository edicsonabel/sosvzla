'use client';

import { useEffect, useState } from 'react';
import { supabase, type Person } from '@/lib/supabase';
import { submitOrQueue } from '@/lib/offlineQueue';
import { uploadPhoto } from '@/lib/uploadPhoto';
import { hashEditorDoc } from '@/lib/editorDoc';
import EditPersonForm from './EditPersonForm';

const BADGE: Record<string, string> = {
  missing: 'badge-missing',
  safe: 'badge-safe',
  found: 'badge-found',
};

const STATUS_LABEL: Record<string, string> = {
  missing: 'desaparecido',
  safe: 'seguro',
  found: 'encontrado',
};

export default function Search() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Person[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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
    });
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
      <span className="kicker">● Personas</span>
      <h1>Buscar personas</h1>
      <p className="lead">Busca por nombre o reporta a alguien desaparecido.</p>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nombre o cédula…"
          onKeyDown={(e) => e.key === 'Enter' && search()}
          style={{ flex: 1 }}
        />
        <button className="btn" onClick={search}>Buscar</button>
      </div>

      <button
        className="btn btn-sec"
        style={{ marginTop: '0.75rem' }}
        onClick={() => setShowForm((v) => !v)}
      >
        {showForm ? 'Cerrar' : '➕ Reportar desaparecido'}
      </button>

      {showForm && (
        <form onSubmit={report}>
          <label>
            Nombre completo
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Cédula / DNI (opcional)
            <input value={documentId} onChange={(e) => setDocumentId(e.target.value)} placeholder="V-12345678" />
          </label>
          <label>
            Última ubicación conocida
            <input value={lastSeen} onChange={(e) => setLastSeen(e.target.value)} />
          </label>
          <label>
            Señas (edad, ropa, etc.)
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label>
            Tu contacto
            <input value={contact} onChange={(e) => setContact(e.target.value)} />
          </label>
          <label>
            Tu cédula de reportante (opcional) — necesaria para editar luego
            <input value={editorDoc} onChange={(e) => setEditorDoc(e.target.value)} placeholder="Tu cédula, p. ej. V-12345678" />
          </label>
          <label>
            Foto (opcional) — ayuda a identificar
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
              alt="Vista previa"
              style={{ maxWidth: 140, borderRadius: 'var(--r-sm)', border: '1px solid var(--borde)' }}
            />
          )}
          {photoError && <div className="aviso aviso-err">{photoError}</div>}
          <button className="btn" type="submit" disabled={uploading}>
            {uploading ? 'Subiendo foto…' : 'Reportar'}
          </button>
          {submitted === 'ok' && <div className="aviso aviso-ok">✅ Reporte registrado.</div>}
          {submitted === 'queued' && (
            <div className="aviso aviso-cola">⏳ Sin conexión: se enviará al volver la red.</div>
          )}
        </form>
      )}

      <div className="lista">
        {results.length === 0 && <p>Sin resultados.</p>}
        {results.map((p) => (
          <div className="item" key={p.id}>
            <div style={{ display: 'flex', gap: '0.85rem' }}>
              {p.photo_url && (
                <img
                  src={p.photo_url}
                  alt={p.name}
                  style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 'var(--r-sm)', flexShrink: 0, border: '1px solid var(--borde)' }}
                />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <strong>{p.name}</strong>
                  <span className={`badge ${BADGE[p.status]}`}>{STATUS_LABEL[p.status] ?? p.status}</span>
                </div>
                {p.document_id && <div style={{ color: 'var(--texto-sec)' }}>🪪 {p.document_id}</div>}
                {p.last_seen && <div>📍 {p.last_seen}</div>}
                {p.description && <div style={{ color: 'var(--texto-sec)' }}>{p.description}</div>}
                {editingId !== p.id && (
                  <button
                    className="btn btn-sec"
                    style={{ marginTop: '0.5rem' }}
                    onClick={() => setEditingId(p.id)}
                  >
                    ✏️ Editar
                  </button>
                )}
              </div>
            </div>
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
        ))}
      </div>
    </>
  );
}
