'use client';

import { useState } from 'react';
import { useT } from '@/lib/i18n';
import { track } from '@/lib/analytics';

// Difusión en la página pública: mismos botones que el modal de /buscar
// (X, Facebook, WhatsApp, copiar). Cliente porque "copiar" necesita el
// portapapeles; los enlaces de redes son href puros.
export default function ShareButtons({ url, text }: { url: string; text: string }) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      track('report_shared', { channel: 'copy' });
    } catch {
      /* clipboard bloqueado */
    }
  }

  const sUrl = encodeURIComponent(url);
  const sText = encodeURIComponent(text);

  return (
    <div className="pmodal-share">
      <span className="pmodal-share-label">{t('pmodal.share')}</span>
      <div className="pmodal-share-btns">
        <a className="chip" href={`https://twitter.com/intent/tweet?text=${sText}&url=${sUrl}`} target="_blank" rel="noreferrer" onClick={() => track('report_shared', { channel: 'twitter' })}>𝕏</a>
        <a className="chip" href={`https://www.facebook.com/sharer/sharer.php?u=${sUrl}`} target="_blank" rel="noreferrer" onClick={() => track('report_shared', { channel: 'facebook' })}>Facebook</a>
        <a className="chip" href={`https://wa.me/?text=${sText}%20${sUrl}`} target="_blank" rel="noreferrer" onClick={() => track('report_shared', { channel: 'whatsapp' })}>WhatsApp</a>
        <button className="chip" type="button" onClick={copyLink}>
          {copied ? t('pmodal.share.copied') : `🔗 ${t('pmodal.share.copy')}`}
        </button>
      </div>
    </div>
  );
}
