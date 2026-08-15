import { supabase } from '../../middleware/supabaseClient.js';

export async function uploadAudioFile(
  courseId: string,
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const storagePath = `${courseId}/${Date.now()}-${fileName}`;
  const client = supabase();

  const { error } = await client.storage
    .from('lecture-audio')
    .upload(storagePath, fileBuffer, { contentType: mimeType });

  if (error) throw error;

  // Bucket is private, so this URL alone won't be accessible.
  // We generate signed URLs when serving audio back to the user.
  return storagePath;
}

export async function getSignedAudioUrl(path: string): Promise<string> {
  const { data, error } = await supabase()
    .storage.from('lecture-audio')
    .createSignedUrl(path, 60 * 60); // 1 hour expiry

  if (error) throw error;
  return data.signedUrl;
}