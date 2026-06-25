'use client';

import { useEffect, useRef, useState } from 'react';
import { claimPersonFound, type Person } from '@/lib/supabase';
import { useT } from '@/lib/i18n';

const BADGE: Record<string, string> = {
  missing: 'badge-missing',
  safe: 'badge-safe',
  found: 'badge-found',
  found_pending: 'badge-found_pending',
};

// Detalle de persona en modal: foto grande (la cara es lo que permite
// reconocer a un familiar) + datos públicos + acción rápida "creo que la
// encontré" (requiere la cédula del reporte, igual que el flujo de edición) +
// difusión en redes. Editar el resto abre el formulario completo.
export default function PersonModal({
  person,
  onClose,
  onEdit,
  onUpdated,
}: {
  person: Person;
  onClose: () => void;
  onEdit: () => void;
  onUpdated: (p: Person) => void;
}) {
  const { t, lang } = useT();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [photoFail, setPhotoFail] = useState(false);
  const [editorDoc, setEditorDoc] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimOk, setClaimOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const showPhoto = person.photo_url && !photoFail;
  const reportedOn = (() => {
    try {
      return new Date(person.created_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-VE', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
    } catch {
      return person.created_at?.slice(0, 10) ?? '';
    }
  })();

  function shareUrl(): string {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/buscar`;
  }
  const shareText = `${person.name}${person.last_seen ? ` — ${person.last_seen}` : ''} · SOS Venezuela`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard bloqueado */
    }
  }

  async function claim() {
    setError(null);
    if (!editorDoc.trim()) {
      setError(t('pmodal.recognize.docRequired'));
      return;
    }
    setClaiming(true);
    const r = await claimPersonFound(person.id, editorDoc);
    setClaiming(false);
    if (r.error || !r.person) {
      setError(t('pmodal.recognize.docMismatch'));
      return;
    }
    setClaimOk(true);
    onUpdated(r.person);
  }

  const sUrl = encodeURIComponent(shareUrl());
  const sText = encodeURIComponent(shareText);

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="pmodal"
        role="dialog"
        aria-modal="true"
        aria-label={person.name}
        onClick={(e) => e.stopPropagation()}
      >
        <button ref={closeRef} className="pmodal-close" onClick={onClose} aria-label={t('pmodal.close')}>
          ✕
        </button>

        <div className="pmodal-foto">
          {showPhoto ? (
            <img
              src={person.photo_url!}
              alt={person.name}
              onError={() => setPhotoFail(true)}
              onLoad={(e) => {
                const img = e.currentTarget;
                if (img.naturalWidth <= 2 || img.naturalHeight <= 2) setPhotoFail(true);
              }}
            />
          ) : (
            <div className="pmodal-foto-vacia" aria-hidden="true">
              <span className="persona-inicial">{(person.name?.trim()?.[0] ?? '?').toUpperCase()}</span>
              <span className="persona-sinfoto">{t('search.noPhoto')}</span>
            </div>
          )}
          <span className={`badge ${BADGE[person.status]} persona-badge`}>
            {t(`person.status.${person.status}`)}
          </span>
        </div>

        <div className="pmodal-body">
          <h3 className="pmodal-nombre">{person.name}</h3>
          {person.document_id && <div className="pmodal-doc">🪪 {person.document_id}</div>}

          <div className="pmodal-datos">
            <div className="pmodal-dato">
              <span className="pmodal-dato-k">📍 {t('pmodal.lastLocation')}</span>
              <span className="pmodal-dato-v">{person.last_seen || t('pmodal.noLocation')}</span>
            </div>
            <div className="pmodal-dato">
              <span className="pmodal-dato-k">🕐 {t('pmodal.reportedOn')}</span>
              <span className="pmodal-dato-v">{reportedOn}</span>
            </div>
          </div>

          {person.description && <p className="pmodal-desc">{person.description}</p>}

          {/* Acción rápida: solo si sigue desaparecida. Deja found_pending. */}
          {person.status === 'missing' && (
            <div className="pmodal-accion">
              <strong>{t('pmodal.recognize.title')}</strong>
              <p>{t('pmodal.recognize.hint')}</p>
              {claimOk ? (
                <div className="aviso aviso-ok">{t('pmodal.recognize.ok')}</div>
              ) : (
                <>
                  <input
                    value={editorDoc}
                    onChange={(e) => { setEditorDoc(e.target.value); setError(null); }}
                    placeholder={t('pmodal.recognize.docPh')}
                  />
                  {error && <div className="aviso aviso-err">{error}</div>}
                  <button className="btn" type="button" onClick={claim} disabled={claiming}>
                    {claiming ? t('pmodal.recognize.sending') : `✓ ${t('pmodal.recognize.btn')}`}
                  </button>
                </>
              )}
            </div>
          )}

          <div className="pmodal-share">
            <span className="pmodal-share-label">{t('pmodal.share')}</span>
            <div className="pmodal-share-btns">
              <a className="chip" href={`https://twitter.com/intent/tweet?text=${sText}&url=${sUrl}`} target="_blank" rel="noreferrer">𝕏</a>
              <a className="chip" href={`https://www.facebook.com/sharer/sharer.php?u=${sUrl}`} target="_blank" rel="noreferrer">Facebook</a>
              <a className="chip" href={`https://wa.me/?text=${sText}%20${sUrl}`} target="_blank" rel="noreferrer">WhatsApp</a>
              <button className="chip" type="button" onClick={copyLink}>
                {copied ? t('pmodal.share.copied') : `🔗 ${t('pmodal.share.copy')}`}
              </button>
            </div>
          </div>

          <div className="pmodal-foot">
            <button className="btn btn-sec" type="button" onClick={onEdit}>{t('pmodal.edit')}</button>
            <a
              className="pmodal-report"
              href={`mailto:abuse@sosvzla.com?subject=${encodeURIComponent('Reporte de contenido — ' + person.name + ' (' + person.id + ')')}`}
            >
              {t('pmodal.report')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
