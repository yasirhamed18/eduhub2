const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET = process.env.SUPABASE_BUCKET || 'resources';

let client = null;
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

function ensureConfigured() {
  if (!client) {
    throw new Error(
      'Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.'
    );
  }
}

// Uploads a file buffer to the storage bucket and returns its permanent
// public URL plus the internal storage path (needed later for deletion).
async function uploadFile(buffer, originalName, mimetype) {
  ensureConfigured();
  const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safe}`;

  const { error } = await client.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType: mimetype || 'application/octet-stream',
    upsert: false,
  });
  if (error) throw error;

  const { data } = client.storage.from(BUCKET).getPublicUrl(storagePath);
  return { publicUrl: data.publicUrl, storagePath };
}

// Deletes a file from storage given its full public URL. Best effort —
// failures here should never block a resource from being deleted from the DB.
async function deleteFileByPublicUrl(publicUrl) {
  if (!client || !publicUrl) return;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;
  const storagePath = decodeURIComponent(publicUrl.slice(idx + marker.length));
  try {
    await client.storage.from(BUCKET).remove([storagePath]);
  } catch (e) {
    /* ignore */
  }
}

module.exports = { uploadFile, deleteFileByPublicUrl };
