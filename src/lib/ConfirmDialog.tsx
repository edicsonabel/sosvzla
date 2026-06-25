'use client';

import { useEffect, useRef } from 'react';
import { useT } from './i18n';
import type { DictKey } from './dict';

// Modal de confirmación reusable y accesible. Evita cambios de estado por
// toque accidental. Esc o clic en el fondo cancela; el botón de confirmar
// recibe el foco al abrir. Acción de confirmar puede ser "peligrosa" (estilo).
export interface ConfirmOptions {
  title: DictKey;
  message?: DictKey;
  confirmLabel: DictKey;
  danger?: boolean;
  onConfirm: () => void;
}

export default function ConfirmDialog({
  open,
  options,
  onClose,
}: {
  open: boolean;
  options: ConfirmOptions | null;
  onClose: () => void;
}) {
  const { t } = useT();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    // Foco al botón de confirmar al abrir.
    confirmRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !options) return null;

  function confirm() {
    options!.onConfirm();
    onClose();
  }

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={t(options.title)}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0 }}>{t(options.title)}</h3>
        {options.message && <p style={{ color: 'var(--texto-sec)' }}>{t(options.message)}</p>}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem', flexWrap: 'wrap' }}>
          <button className="btn btn-sec" type="button" onClick={onClose}>
            {t('confirm.cancel')}
          </button>
          <button
            ref={confirmRef}
            className={`btn ${options.danger ? 'btn-peligro' : ''}`}
            type="button"
            onClick={confirm}
          >
            {t(options.confirmLabel)}
          </button>
        </div>
      </div>
    </div>
  );
}
