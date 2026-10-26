import { supabase } from '@/integrations/supabase/client';

/**
 * Uploads a cover image to the public `event-images` bucket and returns its
 * public URL. Throws on failure so callers can decide what to do.
 */
export const uploadEventImage = async (data: Blob, fileName: string): Promise<string> => {
  const { error } = await supabase.storage
    .from('event-images')
    .upload(fileName, data, {
      cacheControl: '3600',
      upsert: false,
      contentType: data.type || undefined,
    });

  if (error) throw error;

  return supabase.storage.from('event-images').getPublicUrl(fileName).data.publicUrl;
};
