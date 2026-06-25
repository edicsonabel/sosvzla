'use client';

import { useState } from 'react';
import { submitOrQueue } from '@/lib/offlineQueue';

export default function ImSafe() {
  const [name, setName] = useState('');
  const [lastSeen, setLastSeen] = useState('');
  const [contact, setContact] = useState('');
  const [submitted, setSubmitted] = useState<null | 'ok' | 'queued'>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = await submitOrQueue('persons', {
      name,
      status: 'safe',
      last_seen: lastSeen || null,
      contact: contact || null,
      reported_by: 'la propia persona',
    });
    setSubmitted(r.queued ? 'queued' : 'ok');
    if (!r.queued) {
      setName('');
      setLastSeen('');
      setContact('');
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
          ¿Dónde estás? (refugio, zona)
          <input value={lastSeen} onChange={(e) => setLastSeen(e.target.value)} />
        </label>
        <label>
          Contacto (opcional)
          <input value={contact} onChange={(e) => setContact(e.target.value)} />
        </label>
        <button className="btn" type="submit">Avisar que estoy bien</button>
        {submitted === 'ok' && <div className="aviso aviso-ok">✅ Registrado. Tus seres queridos podrán encontrarte.</div>}
        {submitted === 'queued' && <div className="aviso aviso-cola">⏳ Sin conexión: se enviará al volver la red.</div>}
      </form>
    </>
  );
}
