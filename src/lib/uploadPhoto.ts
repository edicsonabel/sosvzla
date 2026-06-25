import { supabase } from './supabase';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

export interface UploadResult {
  url: string | null;
  error: string | null;
}

// Sube una foto al bucket 'photos' (carpeta missing/) y devuelve su URL pública.
// Valida tipo y tamaño en cliente; el bucket también los valida.
export async function uploadPhoto(file: File): Promise<UploadResult> {
  if (!ALLOWED.includes(file.type)) {
    return { url: null, error: 'Formato no válido. Usa JPG, PNG o WebP.' };
  }
  if (file.size > MAX_BYTES) {
    return { url: null, error: 'La imagen supera 5 MB. Usa una más liviana.' };
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  // Nombre único sin depender de Date/Math globales prohibidos aquí: usamos
  // crypto del navegador.
  const id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : `${file.size}-${file.lastModified}`;
  const path = `missing/${id}.${ext}`;

  const { error } = await supabase.storage.from('photos').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });
  if (error) {
    return { url: null, error: 'No se pudo subir la imagen. Intenta de nuevo.' };
  }

  const { data } = supabase.storage.from('photos').getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}
