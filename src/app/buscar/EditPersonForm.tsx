'use client';

import { useState } from 'react';
import { updatePersonSelf, claimPersonFound, type Person } from '@/lib/supabase';
import { uploadPhoto } from '@/lib/uploadPhoto';
import { useT } from '@/lib/i18n';

// Edición propia sin login: el reportante reescribe campos y reenvía su
// cédula (clave). El servidor valida el hash. La cédula del reportante NO
// se muestra ni se precarga; se exige escribirla cada vez.
export default function EditPersonForm({
  person,
  onSaved,
  onCancel,
}: {
  person: Person;
  onSaved: (p: Person) => void;
  onCancel: () => void;
}) {
  const { t } = useT();
  const [name, setName] = useState(person.name);
  const [documentId, setDocumentId] = useState(person.document_id ?? '');
  const [lastSeen, setLastSeen] = useState(person.last_seen ?? '');
  const [description, setDescription] = useState(person.description ?? '');
  const [contact, setContact] = useState(person.contact ?? '');
  const [editorDoc, setEditorDoc] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimOk, setClaimOk] = useState(false);

  // El reportante sugiere "creo que lo encontré": deja el estado en
  // found_pending; un voluntario confirma. Reusa la cédula del formulario.
  async function claimFound() {
    setError(null);
    if (!editorDoc.trim()) {
      setError(t('editp.docRequired'));
      return;
    }
    setClaiming(true);
    const r = await claimPersonFound(person.id, editorDoc);
    setClaiming(false);
    if (r.error || !r.person) {
      setError(t('editp.docMismatch'));
      return;
    }
    setClaimOk(true);
    onSaved(r.person);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!editorDoc.trim()) {
      setError(t('editp.docRequired'));
      return;
    }
    setSaving(true);

    // Foto nueva (opcional): si falla, aborta sin guardar.
    let photoUrl = person.photo_url ?? '';
    if (photo) {
      const up = await uploadPhoto(photo);
      if (up.error) {
        setSaving(false);
        setError(up.error);
        return;
      }
      photoUrl = up.url ?? '';
    }

    const r = await updatePersonSelf(person.id, editorDoc, {
      name,
      document_id: documentId,
      last_seen: lastSeen,
      description,
      contact,
      photo_url: photoUrl,
    });
    setSaving(false);
    if (r.error || !r.person) {
      setError(t('editp.docMismatch'));
      return;
    }
    onSaved(r.person);
  }

  return (
    <form onSubmit={save} style={{ marginTop: '0.75rem' }}>
      <label>
        {t('editp.field.name')}
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label>
        {t('editp.field.doc')}
        <input value={documentId} onChange={(e) => setDocumentId(e.target.value)} placeholder={t('editp.field.doc.ph')} />
      </label>
      <label>
        {t('editp.field.lastSeen')}
        <input value={lastSeen} onChange={(e) => setLastSeen(e.target.value)} />
      </label>
      <label>
        {t('editp.field.desc')}
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <label>
        {t('editp.field.contact')}
        <input value={contact} onChange={(e) => setContact(e.target.value)} />
      </label>
      <label>
        {t('editp.field.photo')}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
        />
      </label>
      <label>
        {t('editp.field.editorDoc')}
        <input
          value={editorDoc}
          onChange={(e) => setEditorDoc(e.target.value)}
          placeholder={t('editp.field.editorDoc.ph')}
          required
        />
      </label>
      {error && <div className="aviso aviso-err">{error}</div>}
      {claimOk && <div className="aviso aviso-ok">{t('editp.claim.ok')}</div>}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button className="btn" type="submit" disabled={saving || claiming}>
          {saving ? t('editp.saving') : t('editp.save')}
        </button>
        <button className="btn btn-sec" type="button" onClick={onCancel} disabled={saving || claiming}>
          {t('editp.cancel')}
        </button>
      </div>

      {/* "Creo que lo encontré": solo si sigue desaparecido. Requiere la cédula. */}
      {person.status === 'missing' && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--borde)' }}>
          <p style={{ color: 'var(--texto-sec)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
            {t('editp.claim.hint')}
          </p>
          <button className="btn btn-sec" type="button" onClick={claimFound} disabled={saving || claiming}>
            {claiming ? t('editp.claiming') : t('editp.claim')}
          </button>
        </div>
      )}
    </form>
  );
}
