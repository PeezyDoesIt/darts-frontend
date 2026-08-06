import { beforeEach, describe, expect, it, vi } from 'vitest'
import { goBack } from '@/router/goBack'
import type { Router } from 'vue-router'

/**
 * `router.back()` walks the browser's history without regard for whether the previous
 * entry belongs to this app. Reached directly — shared link, Capacitor cold start, hard
 * refresh — there is no in-app entry behind the page, so Back left the app entirely
 * (about:blank), taking its storage with it. Reproduced in a browser before this fix:
 * a deep link to /player-setup, then Save Player, landed on about:blank.
 */
function fakeRouter() {
  return { back: vi.fn(), replace: vi.fn(), push: vi.fn() } as unknown as Router &
    { back: ReturnType<typeof vi.fn>; replace: ReturnType<typeof vi.fn> }
}

function setHistoryState(state: unknown) {
  window.history.replaceState(state, '', window.location.href)
}

describe('goBack', () => {
  beforeEach(() => setHistoryState(null))

  it('goes back when there is an in-app entry behind us', () => {
    setHistoryState({ back: '/', current: '/player-setup', position: 2 })
    const router = fakeRouter()

    goBack(router)

    expect(router.back).toHaveBeenCalledTimes(1)
    expect(router.replace).not.toHaveBeenCalled()
  })

  it('redirects home instead of leaving the app when history.state.back is null', () => {
    // exactly what a deep link produces — verified in a real browser
    setHistoryState({ back: null, current: '/player-setup', position: 1 })
    const router = fakeRouter()

    goBack(router)

    expect(router.back).not.toHaveBeenCalled()
    expect(router.replace).toHaveBeenCalledWith('/')
  })

  it('redirects when there is no history state at all', () => {
    setHistoryState(null)
    const router = fakeRouter()

    goBack(router)

    expect(router.back).not.toHaveBeenCalled()
    expect(router.replace).toHaveBeenCalledWith('/')
  })

  it('honours a custom fallback', () => {
    setHistoryState({ back: null, current: '/lrc/setup', position: 1 })
    const router = fakeRouter()

    goBack(router, '/new-game')

    expect(router.replace).toHaveBeenCalledWith('/new-game')
  })

  it('treats an empty-string back entry as real history, not absence', () => {
    // '' is a falsy but valid location; only null/undefined mean "nothing of ours"
    setHistoryState({ back: '', current: '/x', position: 2 })
    const router = fakeRouter()

    goBack(router)

    expect(router.back).toHaveBeenCalledTimes(1)
  })
})
