import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://jpjsycnbamvxnwmziedh.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3OiOiJzdXBhYmFzZSIsInJlZiI6ImpwanN5Y25iYW12eG53bXppZWRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NjY1MDQsImV4cCI6MjA5OTE0MjUwNH0.zmVHpFUB0FDsGmvl5caB8e4uzBrvI_s3JgEgorv68WA';

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

  // Try candidate buckets: user's "contentLab-storage", "contentlab-covers", "covers"
  const candidateBuckets = ['contentLab-storage', 'contentlab-covers', 'covers'];

  for (const bucket of candidateBuckets) {
    const { data, error } = await supabase.storage.from(bucket).upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type,
    });

    if (!error && data?.path) {
      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
      return {
        id: data.path,
        url: publicUrlData.publicUrl,
      };
    }
  }

  throw new Error('Gagal mengunggah gambar ke Supabase Storage (bucket contentLab-storage).');
}
