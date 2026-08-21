import { supabase } from '../../middleware/supabaseClient.js';
import { withTimeout } from './withTimeout.js';

const UPLOAD_DOWNLOAD_TIMEOUT_MS = 120_000; // large audio files, allow generous headroom
const METADATA_TIMEOUT_MS = 15_000; // signed URL / delete are small, fast calls

export async function uploadAudioFile(
  courseId: string,
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const storagePath = `${courseId}/${Date.now()}-${fileName}`;
  const client = supabase();

  const { error } = await withTimeout(
    client.storage.from('lecture-audio').upload(storagePath, fileBuffer, { contentType: mimeType }),
    UPLOAD_DOWNLOAD_TIMEOUT_MS,
    'uploadAudioFile'
  );

  if (error) throw error;

  // Bucket is private, so this URL alone won't be accessible.
  // We generate signed URLs when serving audio back to the user.
  return storagePath;
}


export async function getSignedAudioUrl(path: string): Promise<string> {
  const { data, error } = await withTimeout(
    supabase().storage.from('lecture-audio').createSignedUrl(path, 60 * 60), // 1 hour expiry
    METADATA_TIMEOUT_MS,
    'getSignedAudioUrl'
  );

  if (error) throw error;
  return data.signedUrl;
}

export async function downloadAudioFile(path: string): Promise<Buffer> {
  const { data, error } = await withTimeout(
    supabase().storage.from('lecture-audio').download(path),
    UPLOAD_DOWNLOAD_TIMEOUT_MS,
    'downloadAudioFile'
  );

  if (error) throw error;

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function deleteAudioFile(path: string) {
  const { error } = await withTimeout(
    supabase().storage.from('lecture-audio').remove([path]),
    METADATA_TIMEOUT_MS,
    'deleteAudioFile'
  );
  if (error) throw error;
}