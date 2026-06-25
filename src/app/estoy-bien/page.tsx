'use client';

import { useState } from 'react';
import { submitOrQueue } from '@/lib/offlineQueue';
import { uploadPhoto } from '@/lib/uploadPhoto';
import { hashEditorDoc } from '@/lib/editorDoc';
import Turnstile, { turnstileEnabled } from '@/lib/Turnstile';

export default function ImSafe() {
  const [name, setName] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [lastSeen, setLastSeen] = useState('');
  const [contact, setContact] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState<null | 'ok' | 'queued'>(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPhotoError(null);

    const online = typeof navigator === 'undefined' || navigator.onLine;
    if (turnstileEnabled() && online && !token) {
      setPhotoError('Completa la verificación anti-spam para enviar.');
      return;
    }

    // Sube la foto primero (requiere red). Si la que eligió el usuario falla, no enviamos.
    let photoUrl: string | null = null;
    if (photo) {
      setUploading(true);
      const up = await uploadPhoto(photo);
      setUploading(false);
      if (up.error) {
        setPhotoError(up.error);
        return;
      }
      photoUrl = up.url;
    }

    // La propia cédula sirve de clave para editar luego (la persona es el reportante).
    const editorHash = await hashEditorDoc(documentId);

    const r = await submitOrQueue('persons', {
      name,
      document_id: documentId || null,
      status: 'safe',
      last_seen: lastSeen || null,
      contact: contact || null,
      photo_url: photoUrl,
      reported_by: 'la propia persona',
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
      setContact('');
      setPhoto(null);
    }
  }

  return (
    <>
      <span className="kicker">● A salvo</span>
      <h1>Estoy bien</h1>
      <p className="lead">Avisa que estás a salvo. Aparecerás como “seguro” cuando alguien te busque.</p>

      <form onSubmit={submit}>
        <label>
          Tu nombre completo
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Cédula / DNI (opcional) — te servirá para editar luego
          <input value={documentId} onChange={(e) => setDocumentId(e.target.value)} placeholder="V-12345678" />
        </label>
        <label>
          ¿Dónde estás? (refugio, zona)
          <input value={lastSeen} onChange={(e) => setLastSeen(e.target.value)} />
        </label>
        <label>
          Contacto (opcional)
          <input value={contact} onChange={(e) => setContact(e.target.value)} />
        </label>
        <label>
          Foto (opcional) — ayuda a que te reconozcan
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
        {photoError && <div className="aviso aviso-err" role="alert">{photoError}</div>}
        <Turnstile onToken={setToken} />
        <button className="btn" type="submit" disabled={uploading}>
          {uploading ? 'Subiendo foto…' : 'Avisar que estoy bien'}
        </button>
        {submitted === 'ok' && <div className="aviso aviso-ok">✅ Registrado. Tus seres queridos podrán encontrarte.</div>}
        {submitted === 'queued' && <div className="aviso aviso-cola">⏳ Sin conexión: se enviará al volver la red.</div>}
      </form>
    </>
  );
}
