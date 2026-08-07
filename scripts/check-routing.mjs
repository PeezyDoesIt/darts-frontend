/**
 * Check that a deployed site actually routes correctly.
 *
 *   node scripts/check-routing.mjs https://peezydoesit.net
 *
 * This covers the one layer the smoke suite structurally cannot reach. `_redirects` is
 * Cloudflare-specific — `vite dev` and `vite preview` both ignore it — so SPA fallback and
 * asset serving are only real once deployed. Both of the ways that has broken in production
 * are asserted here:
 *
 *   - A deep link 404ing instead of serving the app shell. Adding a root 404.html silently
 *     overrode the SPA catch-all, and every client-side route stopped resolving.
 *   - An asset answered with the SPA fallback, so the bundle arrived as text/html and the
 *     page rendered blank. A 200 is not enough on its own — the content type is the tell.
 */

const base = (process.argv[2] ?? '').replace(/\/$/, '')
if (!base) {
  console.error('usage: node scripts/check-routing.mjs <baseUrl>')
  process.exit(2)
}

/** Client-side routes. None of these exist as files, so all of them rely on the fallback. */
const SPA_ROUTES = [
  '/', '/new-game', '/spades/setup', '/lrc/setup', '/yahtzee/setup',
  '/dice/farkle/setup', '/leaderboard',
]

const failures = []
const notes = []

const sleep = ms => new Promise(r => setTimeout(r, ms))

/**
 * A fresh deployment propagates unevenly — the same path can 404 on one edge and serve on
 * the next a few seconds later. Retrying avoids failing the build on a deploy that is
 * merely still settling, while a genuine break stays broken through every attempt.
 */
async function getWithRetry(url, accept, attempts = 6) {
  let last
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await sleep(5000)
    try {
      const res = await fetch(url, { cache: 'no-store', redirect: 'follow' })
      last = { status: res.status, type: (res.headers.get('content-type') ?? '').toLowerCase() }
      if (accept(last)) return { ...last, attempts: i + 1 }
    } catch (err) {
      last = { status: 0, type: '', error: String(err) }
    }
  }
  return { ...last, attempts, failed: true }
}

const isHtml = r => r.status === 200 && r.type.includes('text/html')

async function checkSpaRoutes() {
  for (const route of SPA_ROUTES) {
    const r = await getWithRetry(base + route, isHtml)
    if (r.failed) {
      failures.push(`${route} — expected 200 text/html (the app shell), got ${r.status} ${r.type || r.error || ''}`)
    } else {
      notes.push(`ok  ${route} → 200 html${r.attempts > 1 ? ` (after ${r.attempts} tries)` : ''}`)
    }
  }
}

/**
 * The assets index.html actually references. Reading them out of the served HTML rather than
 * hardcoding names means this keeps working as content hashes change every build.
 */
async function checkReferencedAssets() {
  const res = await fetch(base + '/', { cache: 'no-store' })
  const html = await res.text()
  const refs = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(m => m[1])

  if (refs.length === 0) {
    failures.push('index.html referenced no /assets/* files — the build looks wrong')
    return
  }

  for (const ref of refs) {
    const expected = ref.endsWith('.css') ? 'text/css' : 'javascript'
    const r = await getWithRetry(base + ref, x => x.status === 200 && x.type.includes(expected))
    if (r.failed) {
      // text/html here means the SPA fallback answered for a missing file, which is the
      // blank-page failure: the browser refuses the bundle over its MIME type.
      const why = r.type.includes('text/html')
        ? 'the SPA fallback answered — this file is missing from the deployment'
        : `expected ${expected}`
      failures.push(`${ref} — got ${r.status} ${r.type || r.error || ''} (${why})`)
    } else {
      notes.push(`ok  ${ref} → 200 ${r.type.split(';')[0]}`)
    }
  }
}

await checkSpaRoutes()
await checkReferencedAssets()

console.log(`routing check — ${base}\n`)
for (const n of notes) console.log('  ' + n)

if (failures.length > 0) {
  console.log('')
  for (const f of failures) console.error('  FAIL  ' + f)
  console.error(`\n${failures.length} routing check(s) failed`)
  process.exit(1)
}

console.log(`\nall ${notes.length} routing checks passed`)
