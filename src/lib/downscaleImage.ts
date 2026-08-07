/**
 * Bounded image downscaling for anything headed into localStorage.
 *
 * Avatars and player backgrounds are kept as data URLs inside the roster, which lives in a
 * ~5MB text store. A photo straight off a phone is 3-8MB before base64 adds a third on top,
 * so a single unscaled upload can exceed the entire quota — and the avatar it feeds renders
 * at about 96px. Everything above these caps is data that can never be seen.
 */

/** An avatar is shown at ~96px; 512 leaves room for retina and future larger surfaces. */
export const AVATAR_MAX_PX = 512
/** Backgrounds cover a whole card, so they get more room. */
export const BACKGROUND_MAX_PX = 1280

export const AVATAR_QUALITY = 0.8

/**
 * Fit `w`x`h` inside a `maxPx` box, preserving aspect ratio. Never upscales — a small
 * source stays small rather than being blown up into a bigger file for no gain.
 */
export function fitWithin(w: number, h: number, maxPx: number): { width: number; height: number } {
  if (w <= 0 || h <= 0) return { width: 0, height: 0 }
  const scale = Math.min(1, maxPx / Math.max(w, h))
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) }
}

function toDataUrl(
  source: CanvasImageSource, srcW: number, srcH: number, maxPx: number, quality: number,
): string {
  const { width, height } = fitWithin(srcW, srcH, maxPx)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2d context unavailable')
  ctx.drawImage(source, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', quality)
}

/** Downscale a live video frame — the camera capture path. */
export function downscaleVideoFrame(
  video: HTMLVideoElement, maxPx = AVATAR_MAX_PX, quality = AVATAR_QUALITY,
): string {
  return toDataUrl(video, video.videoWidth, video.videoHeight, maxPx, quality)
}

/**
 * Downscale a picked file. Rejects rather than silently storing the original, so a caller
 * can never accidentally fall back to writing a multi-megabyte data URL.
 */
export function downscaleFile(
  file: Blob, maxPx = AVATAR_MAX_PX, quality = AVATAR_QUALITY,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      try {
        resolve(toDataUrl(img, img.naturalWidth, img.naturalHeight, maxPx, quality))
      } catch (e) {
        reject(e)
      } finally {
        URL.revokeObjectURL(url)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that image'))
    }
    img.src = url
  })
}
