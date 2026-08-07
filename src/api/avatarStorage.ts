import { supabase } from '../lib/supabase'

/**
 * Player avatars in Supabase Storage.
 *
 * Every function here is best-effort and never throws: a photo failing to reach the cloud
 * must not stop a player being saved or a game being started. Callers get null and carry
 * on with whatever they already had locally.
 *
 * The bucket is private, so images are read through short-lived signed URLs rather than a
 * public path — these are photographs of identifiable people.
 */
const BUCKET = 'player-avatars'

/** How long a signed URL stays valid. Long enough for a session, short enough to matter. */
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 12

export function isDataUrl(value: string | null | undefined): boolean {
  return !!value && value.startsWith('data:')
}

export function isRemoteUrl(value: string | null | undefined): boolean {
  return !!value && (value.startsWith('http://') || value.startsWith('https://'))
}

/** `<user_id>/<player_id>.jpg` — the first segment is what the storage policies check. */
export function avatarPathFor(userId: string, playerId: string): string {
  return `${userId}/${playerId}.jpg`
}

async function currentUserId(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.user?.id ?? null
  } catch {
    return null
  }
}

/** data: URL → Blob, so it can be uploaded as a real image rather than a base64 string. */
function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const [header, encoded] = dataUrl.split(',')
    if (!header || !encoded) return null
    const mime = /:(.*?);/.exec(header)?.[1] ?? 'image/jpeg'
    const binary = atob(encoded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new Blob([bytes], { type: mime })
  } catch {
    return null
  }
}

export type UploadResult = { path: string; signedUrl: string | null } | null

/**
 * Upload a data-URL avatar for a player. Returns null when signed out, when the value is
 * not a data URL, or on any failure — in every one of those cases the caller keeps what it
 * had rather than losing the picture.
 */
export async function uploadAvatar(playerId: string, dataUrl: string): Promise<UploadResult> {
  if (!isDataUrl(dataUrl)) return null
  const userId = await currentUserId()
  if (!userId) return null

  const blob = dataUrlToBlob(dataUrl)
  if (!blob) return null

  const path = avatarPathFor(userId, playerId)
  try {
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
      contentType: blob.type || 'image/jpeg',
      // One object per player, replaced in place — otherwise every edit orphans a file
      // nothing will ever clean up.
      upsert: true,
    })
    if (error) {
      console.warn('[avatars] upload failed', error)
      return null
    }
  } catch (e) {
    console.warn('[avatars] upload threw', e)
    return null
  }

  return { path, signedUrl: await signAvatar(path) }
}

/** A short-lived URL an <img> can render. Null when signed out or the object is gone. */
export async function signAvatar(path: string): Promise<string | null> {
  if (!path) return null
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
    if (error) {
      console.warn('[avatars] sign failed', error)
      return null
    }
    return data?.signedUrl ?? null
  } catch (e) {
    console.warn('[avatars] sign threw', e)
    return null
  }
}

/**
 * Sign many paths at once. Returns a path → URL map, omitting any that failed, so one dead
 * object cannot blank out every other player's picture.
 */
export async function signAvatars(paths: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))]
  if (unique.length === 0) return {}

  const out: Record<string, string> = {}
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(unique, SIGNED_URL_TTL_SECONDS)
    if (error) {
      console.warn('[avatars] batch sign failed', error)
      return {}
    }
    for (const row of data ?? []) {
      if (row.path && row.signedUrl) out[row.path] = row.signedUrl
    }
  } catch (e) {
    console.warn('[avatars] batch sign threw', e)
  }
  return out
}

/** Remove a player's stored photo. Failure is ignored — an orphan beats a blocked delete. */
export async function deleteAvatar(path: string): Promise<void> {
  if (!path) return
  try {
    const { error } = await supabase.storage.from(BUCKET).remove([path])
    if (error) console.warn('[avatars] delete failed', error)
  } catch (e) {
    console.warn('[avatars] delete threw', e)
  }
}
