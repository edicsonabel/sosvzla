// Hash sha256 de la cédula del reportante. Sirve de "clave" para que la
// misma persona edite luego su reporte sin login. Se guarda el hash en BD;
// la cédula en claro nunca se almacena. El RPC update_person_self hashea
// igual en el servidor y compara.
export async function hashEditorDoc(doc: string): Promise<string | null> {
  const clean = doc.trim();
  if (!clean) return null;
  const bytes = new TextEncoder().encode(clean);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
