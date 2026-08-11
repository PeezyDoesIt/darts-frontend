/**
 * Make a missing build asset fail as a miss.
 *
 * Everything under /assets is content-hashed and changes every build. During the gap between
 * a new index.html going live and its assets propagating, a request for the new bundle can
 * be answered by the SPA catch-all in _redirects — index.html, with a 200. Cloudflare then
 * caches that HTML *at the asset URL*, under the asset cache-control of max-age=14400, so a
 * momentary miss becomes four hours of blank page for anyone who loaded the site in that
 * window, long after the deploy itself is healthy.
 *
 * This cannot be fixed in _redirects: a `/assets/* ... 404` rule there is silently ignored by
 * Pages, verified twice on real preview deployments while the `/*` rule beneath it kept
 * working. Pages does not appear to accept 404 as a status in that file.
 *
 * So the check happens here instead, on the only route it needs to cover. Nothing under
 * /assets is ever HTML — vite emits js, css, fonts and images — so an HTML response for one
 * of these paths means the fallback answered and the file is genuinely absent.
 *
 * This function sits in front of every asset the app loads, so a failure here takes the whole
 * site down. It is deliberately built to fail open: anything unexpected returns the original
 * response untouched, and the worst case is the behaviour we already have today.
 */
export async function onRequest(context) {
  let res
  try {
    res = await context.next()
  } catch {
    // Never leave the asset unserved because this check could not run.
    return context.next()
  }

  try {
    const type = res.headers.get('content-type') ?? ''
    if (res.status === 200 && type.includes('text/html')) {
      return new Response('Not found', {
        status: 404,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          // Do not let the 404 itself linger at this URL once the asset does exist.
          'cache-control': 'no-store',
        },
      })
    }
  } catch {
    // Fall through and serve whatever came back.
  }

  return res
}
