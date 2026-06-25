import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { dict, type Lang } from '@/lib/dict';
import type { Person } from '@/lib/supabase';

// Página pública por persona desaparecida. Pensada para difundir: el enlace
// genera vista previa (foto + nombre + estado) al pegarlo en WhatsApp/redes,
// y abre la ficha exacta de esa persona. Server component → metadatos OG
// dinámicos. Lee de la vista pública (sin contacto ni datos privados).

const STATUS_BADGE: Record<string, string> = {
  missing: 'badge-missing',
  safe: 'badge-safe',
  found: 'badge-found',
  found_pending: 'badge-found_pending',
};

// Cliente anónimo de servidor: la vista persons_public está abierta a 'anon'.
function serverClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'anon';
  return createClient(url, key, { auth: { persistSession: false } });
}

async function getPerson(id: string): Promise<Person | null> {
  const { data } = await serverClient()
    .from('persons_public')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return (data as Person) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const p = await getPerson(id);
  if (!p) return { title: 'SOS Venezuela' };

  const statusEs = dict.es[`person.status.${p.status}` as keyof typeof dict.es];
  const title = `${p.name} — ${statusEs} · SOS Venezuela`;
  const desc = [p.last_seen ? `Vista en ${p.last_seen}` : null, p.description]
    .filter(Boolean)
    .join(' · ') || 'Ayuda a difundir y reunir a esta persona con su familia.';

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      type: 'profile',
      images: p.photo_url ? [{ url: p.photo_url }] : undefined,
    },
    twitter: {
      card: p.photo_url ? 'summary_large_image' : 'summary',
      title,
      description: desc,
      images: p.photo_url ? [p.photo_url] : undefined,
    },
  };
}

export default async function PersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = await getPerson(id);
  // Idioma fijo a ES en server (la app es VE-first); el resto de la app
  // traduce en cliente. Aquí priorizamos que el enlace compartido funcione.
  const L: Lang = 'es';
  const tr = (k: string) => dict[L][k as keyof (typeof dict)[Lang]] ?? k;

  if (!p) {
    return (
      <>
        <h1>{tr('track.notfound.title')}</h1>
        <p className="lead">{tr('track.notfound.lead')}</p>
        <Link href="/buscar" className="btn btn-sec">{tr('pp.backToSearch')}</Link>
      </>
    );
  }

  const reportedOn = (() => {
    try {
      return new Date(p.created_at).toLocaleDateString('es-VE', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
    } catch {
      return p.created_at?.slice(0, 10) ?? '';
    }
  })();

  return (
    <article className="pp">
      <Link href="/buscar" className="pp-back">← {tr('pp.backToSearch')}</Link>

      <div className="pp-card">
        <div className="pp-foto">
          {p.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.photo_url} alt={p.name} />
          ) : (
            <div className="pp-foto-vacia" aria-hidden="true">
              <span className="persona-inicial">{(p.name?.trim()?.[0] ?? '?').toUpperCase()}</span>
              <span className="persona-sinfoto">{tr('search.noPhoto')}</span>
            </div>
          )}
          <span className={`badge ${STATUS_BADGE[p.status] ?? ''} persona-badge`}>
            {tr(`person.status.${p.status}`)}
          </span>
        </div>

        <div className="pp-body">
          <h1 className="pp-nombre">{p.name}</h1>
          {p.document_id && <div className="pp-doc">🪪 {p.document_id}</div>}

          <div className="pp-datos">
            <div className="pmodal-dato">
              <span className="pmodal-dato-k">📍 {tr('pmodal.lastLocation')}</span>
              <span className="pmodal-dato-v">{p.last_seen || tr('pmodal.noLocation')}</span>
            </div>
            <div className="pmodal-dato">
              <span className="pmodal-dato-k">🕐 {tr('pmodal.reportedOn')}</span>
              <span className="pmodal-dato-v">{reportedOn}</span>
            </div>
          </div>

          {p.description && <p className="pp-desc">{p.description}</p>}

          <Link href="/buscar" className="btn">{tr('pp.cta')}</Link>
        </div>
      </div>
    </article>
  );
}
