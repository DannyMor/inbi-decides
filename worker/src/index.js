// pin.it resolver — the one tiny piece of "backend" Inbi Decides has.
//
// Browsers cannot follow a pin.it redirect from JavaScript (Pinterest sends no
// CORS headers), so this Worker does the single hop server-side and returns
// the final pinterest.com/pin/… URL with CORS enabled.
//
// GET /?url=https://pin.it/XXXX  ->  { "resolvedUrl": "https://www.pinterest.com/pin/123…/" }

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

const MAX_HOPS = 5

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
      // Short links never change their target — let Cloudflare's edge cache them.
      'Cache-Control': 'public, max-age=604800',
    },
  })
}

function isAllowedHost(hostname) {
  // Only Pinterest infrastructure — this must not become an open redirector probe.
  return hostname === 'pin.it' || hostname === 'api.pinterest.com' || /(^|\.)pinterest\.[a-z.]+$/.test(hostname)
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS })
    }
    if (request.method !== 'GET') {
      return json({ error: 'GET only' }, 405)
    }

    const target = new URL(request.url).searchParams.get('url')
    let current
    try {
      current = new URL(target)
    } catch {
      return json({ error: 'pass ?url=https://pin.it/…' }, 400)
    }
    if (current.hostname !== 'pin.it') {
      return json({ error: 'only pin.it links are resolved' }, 400)
    }

    for (let hop = 0; hop < MAX_HOPS; hop++) {
      const response = await fetch(current.toString(), { redirect: 'manual' })
      const location = response.headers.get('location')
      if (!location) break
      const next = new URL(location, current)
      if (!isAllowedHost(next.hostname)) break
      current = next
      if (/\/pin\/\d+/.test(current.pathname)) break
    }

    if (!/\/pin\/\d+/.test(current.pathname) && current.hostname === 'pin.it') {
      return json({ error: 'could not resolve this short link' }, 502)
    }
    return json({ resolvedUrl: current.toString() })
  },
}
