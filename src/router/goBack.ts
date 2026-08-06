import type { Router } from 'vue-router'

/**
 * Navigate back without the risk of leaving the app.
 *
 * `router.back()` delegates to `history.back()`, which walks the browser's history
 * regardless of whether the previous entry belongs to this app. Land on a page directly —
 * a shared link, a Capacitor cold start, a hard refresh — and there is no in-app entry
 * behind it, so "Back" navigates to whatever preceded it: about:blank, or another site.
 * The app becomes unreachable, and its storage is gone with it.
 *
 * Vue Router records the previous in-app location in `history.state.back`, which is null
 * exactly when there is nothing of ours to return to. In that case we push a sensible
 * destination instead, so Back always means "somewhere in this app".
 */
export function goBack(router: Router, fallback = '/') {
  const hasInAppHistory =
    typeof window !== 'undefined' && window.history.state?.back != null

  if (hasInAppHistory) router.back()
  else router.replace(fallback)
}
