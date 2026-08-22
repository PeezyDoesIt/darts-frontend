import { describe, expect, it } from 'vitest'
import { imagePathFor, avatarPathFor, isDataUrl, isRemoteUrl } from '../../src/api/avatarStorage'

/**
 * The rules that decide whether a photo survives.
 *
 * Backgrounds were being carried as base64 in localStorage and in Postgres at once, and the
 * fix clears those columns once the image is in Storage. Clearing a column that still holds
 * the only copy of a photo is the one failure here that cannot be undone from the app, so
 * the two rules that prevent it are pinned rather than trusted.
 */

const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

/**
 * Mirror of `storedImage` in the players store, which is not exported — the store is a Pinia
 * setup function and pulling it apart to reach one helper would test the seam, not the rule.
 * If this drifts from the original the store's own behaviour is what changed; that is what
 * the comment on the real one is for.
 */
function storedImage(value: string | null | undefined, path: string | null | undefined): string | null {
  if (!value) return null
  if (isRemoteUrl(value)) return null
  if (isDataUrl(value)) return path ? null : value
  return value
}

describe('what reaches the image columns', () => {
  it('keeps an inline photo while it has nowhere else to live', () => {
    // The important one. No path means the upload has not happened, so this data URL is the
    // only copy in the cloud — clearing it would lose the photo outright.
    expect(storedImage(PIXEL, null)).toBe(PIXEL)
    expect(storedImage(PIXEL, undefined)).toBe(PIXEL)
  })

  it('drops the inline copy once a path proves it is in Storage', () => {
    expect(storedImage(PIXEL, 'user/player-bg.jpg')).toBeNull()
  })

  it('never persists a signed URL', () => {
    // Signed URLs expire, so a stored one is dead by the time another device reads it.
    expect(storedImage('https://x.supabase.co/object/sign/abc?token=xyz', 'user/p.jpg')).toBeNull()
    expect(storedImage('https://x.supabase.co/object/sign/abc?token=xyz', null)).toBeNull()
  })

  it('passes an emoji through untouched', () => {
    expect(storedImage('🎯', null)).toBe('🎯')
  })

  it('treats empty as nothing', () => {
    expect(storedImage(null, null)).toBeNull()
    expect(storedImage('', 'user/p.jpg')).toBeNull()
  })
})

describe('where each image lives in the bucket', () => {
  it('leaves the avatar path exactly where it always was', () => {
    /*
     * Load-bearing. Avatars have been stored at `<user>/<player>.jpg` since before
     * backgrounds were in Storage, and every path already written to a row points there.
     * Giving the avatar a suffix would strand every photo already uploaded.
     */
    expect(imagePathFor('u1', 'p1', 'avatar')).toBe('u1/p1.jpg')
    expect(avatarPathFor('u1', 'p1')).toBe('u1/p1.jpg')
  })

  it('gives each background its own object', () => {
    expect(imagePathFor('u1', 'p1', 'playerBackground')).toBe('u1/p1-bg.jpg')
    expect(imagePathFor('u1', 'p1', 'throwBackground')).toBe('u1/p1-throw.jpg')
    expect(imagePathFor('u1', 'p1', 'walkupBackground')).toBe('u1/p1-walkup.jpg')
  })

  it('gives four distinct paths, so no image overwrites another', () => {
    const paths = (['avatar', 'playerBackground', 'throwBackground', 'walkupBackground'] as const)
      .map(k => imagePathFor('u1', 'p1', k))
    expect(new Set(paths).size).toBe(4)
  })

  it('keeps the user id first, which is what the storage policies check', () => {
    for (const k of ['avatar', 'playerBackground', 'throwBackground', 'walkupBackground'] as const) {
      expect(imagePathFor('u1', 'p1', k).startsWith('u1/')).toBe(true)
    }
  })
})
