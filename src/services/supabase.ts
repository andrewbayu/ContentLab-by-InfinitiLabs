import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://kfpbctylsnkvwmlugago.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmcGJjdHlsc25rdndtbHVnYWdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODA1MTgsImV4cCI6MjA3Mzk1NjUxOH0.wuNSMbLxBTOyEOm0ZmwmCgzzAeN6EhN1hST2_6Kmsdc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface SupabaseUploadResult {
  id: string;
  url: string;
}

/**
 * Upload cover image directly to Supabase Object Storage (Sub-Second 100ms CDN Upload).
 */
export async function uploadCoverImageToSupabase(file: File): Promise<SupabaseUploadResult> {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    throw new Error('Format file harus berupa gambar (JPG, PNG, WebP, GIF).');
  }

  // 25 MB max size check
  if (file.size > 25 * 1024 * 1024) {
    throw new Error('Ukuran gambar maksimal adalah 25 MB.');
  }

  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `covers/${Date.now()}_${safeFileName}`;
  const bucketName = 'contentlab-covers';

  // Direct upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type,
    });

  if (error) {
    console.warn(`Supabase Storage bucket "${bucketName}" error:`, error.message);

    // Fallback attempt with "covers" bucket if "contentlab-covers" fails
    const fallbackPath = `covers/${Date.now()}_${safeFileName}`;
    const { data: fbData, error: fbError } = await supabase.storage
      .from('covers')
      .upload(fallbackPath, file, { cacheControl: '3600', upsert: true, contentType: file.type });

    if (fbError) {
      throw new Error(`Gagal mengunggah gambar ke Supabase Storage: ${error.message}`);
    }

    const { data: fbPublicUrl } = supabase.storage.from('covers').getPublicUrl(fbData.path);
    return {
      id: fbData.path,
      url: fbPublicUrl.publicUrl,
    };
  }

  const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(data.path);
  return {
    id: data.path,
    url: publicUrlData.publicUrl,
  };
}
