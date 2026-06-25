'use client';

import { useState } from 'react';
import { submitOrQueue } from '@/lib/offlineQueue';
import { uploadPhoto } from '@/lib/uploadPhoto';
import { hashEditorDoc } from '@/lib/editorDoc';
import Turnstile, { turnstileEnabled } from '@/lib/Turnstile';
import { useT } from '@/lib/i18n';

export default function ImSafe() {
  const { t } = useT();
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
      setPhotoError(t('safe.err.captcha'));
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
      reported_by: t('safe.reportedBy'),
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
      <span className="kicker">{t('safe.kicker')}</span>
      <h1>{t('safe.title')}</h1>
      <p className="lead">{t('safe.lead')}</p>

      <form onSubmit={submit}>
        <label>
          {t('safe.field.name')}
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          {t('safe.field.doc')}
          <input value={documentId} onChange={(e) => setDocumentId(e.target.value)} placeholder={t('safe.field.doc.ph')} />
        </label>
        <label>
          {t('safe.field.where')}
          <input value={lastSeen} onChange={(e) => setLastSeen(e.target.value)} />
        </label>
        <label>
          {t('safe.field.contact')}
          <input value={contact} onChange={(e) => setContact(e.target.value)} />
        </label>
        <label>
          {t('safe.field.photo')}
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
          {uploading ? t('safe.uploading') : t('safe.submit')}
        </button>
        {submitted === 'ok' && <div className="aviso aviso-ok">{t('safe.ok')}</div>}
        {submitted === 'queued' && <div className="aviso aviso-cola">{t('safe.queued')}</div>}
      </form>
    </>
  );
}
