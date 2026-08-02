// Turns a pasted URL into { imageUrl, sourceUrl, title } without any backend.
// Everything runs in the browser, so cross-origin page scraping is limited:
// - direct image links and Google Images links resolve locally
// - other pages go through the microlink.io public API (CORS-enabled) to read
//   OpenGraph metadata; on failure we gracefully store the original URL.

export interface ResolvedImage {
  imageUrl: string
  sourceUrl: string
  title: string
  /** false when we could not find a real image URL and stored the page URL as-is */
  resolved: boolean
}

const IMAGE_EXTENSIONS = /\.(avif|bmp|gif|heic|jpe?g|png|svg|webp)(\?.*)?$/i
const IMAGE_HOSTS = [
  'i.pinimg.com',
  'images.unsplash.com',
  'i.imgur.com',
  'lh3.googleusercontent.com',
  'encrypted-tbn0.gstatic.com',
]

export function isDirectImageUrl(url: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  if (IMAGE_EXTENSIONS.test(parsed.pathname)) return true
  return IMAGE_HOSTS.includes(parsed.hostname)
}

/** Google Images result links carry the real image in the `imgurl` query param. */
export function extractGoogleImagesUrl(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (!parsed.hostname.includes('google.')) return null
  const imgurl = parsed.searchParams.get('imgurl')
  if (!imgurl) return null
  try {
    return new URL(imgurl).toString()
  } catch {
    return null
  }
}

export function titleFromUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const segment = parsed.pathname.split('/').filter(Boolean).pop() ?? parsed.hostname
    return decodeURIComponent(segment)
      .replace(IMAGE_EXTENSIONS, '')
      .replace(/[-_+]+/g, ' ')
      .trim()
  } catch {
    return url
  }
}

/** Split a pasted blob into candidate URLs, one per line. */
export function splitUrlList(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^https?:\/\//i.test(line))
}

interface MicrolinkResponse {
  status: string
  data?: {
    title?: string | null
    image?: { url?: string | null } | null
    url?: string | null
  }
}

async function fetchOpenGraph(url: string): Promise<{ imageUrl: string; title: string } | null> {
  try {
    const response = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`)
    if (!response.ok) return null
    const payload = (await response.json()) as MicrolinkResponse
    const imageUrl = payload.data?.image?.url
    if (payload.status !== 'success' || !imageUrl) return null
    return { imageUrl, title: payload.data?.title ?? '' }
  } catch {
    return null
  }
}

/**
 * Pinterest app "share" links. These are redirects that no free CORS-friendly
 * service can follow (Pinterest antibot blocks proxies), so we reject them
 * with guidance instead of saving a URL that can never render.
 */
export function isPinterestShortLink(url: string): boolean {
  try {
    return new URL(url).hostname === 'pin.it'
  } catch {
    return false
  }
}

/** Matches pin pages on any Pinterest domain (pinterest.com, ru.pinterest.com, pinterest.co.uk, …). */
export function extractPinterestPinId(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (!/(^|\.)pinterest\.[a-z.]+$/.test(parsed.hostname)) return null
  const match = parsed.pathname.match(/^\/pin\/(\d+)/)
  return match ? match[1] : null
}

interface PinterestPin {
  images?: Record<string, { url?: string } | undefined>
  grid_title?: string | null
  description?: string | null
}

/** Pinterest's public widget API — CORS-enabled, no auth, not blocked by their antibot. */
async function fetchPinterestPin(pinId: string): Promise<{ imageUrl: string; title: string } | null> {
  try {
    const response = await fetch(
      `https://widgets.pinterest.com/v3/pidgets/pins/info/?pin_ids=${pinId}`,
    )
    if (!response.ok) return null
    const payload = (await response.json()) as { status?: string; data?: PinterestPin[] }
    const pin = payload.data?.[0]
    if (payload.status !== 'success' || !pin?.images) return null
    // Prefer the largest size the widget API exposes ('orig' beats any pixel size).
    const rank = (key: string) => (key.startsWith('orig') ? Infinity : parseInt(key) || 0)
    const sizes = Object.keys(pin.images).sort((a, b) => rank(b) - rank(a))
    const imageUrl = sizes.map((size) => pin.images?.[size]?.url).find(Boolean)
    if (!imageUrl) return null
    return { imageUrl, title: pin.grid_title || pin.description?.trim() || '' }
  } catch {
    return null
  }
}

/** Last resort: fetch the page HTML through a CORS proxy and read its OpenGraph tags. */
async function fetchOpenGraphViaProxy(
  url: string,
): Promise<{ imageUrl: string; title: string } | null> {
  try {
    const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`)
    if (!response.ok) return null
    const html = await response.text()
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const imageUrl =
      doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ??
      doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content')
    if (!imageUrl || !/^https?:\/\//.test(imageUrl)) return null
    const title =
      doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ??
      doc.querySelector('title')?.textContent ??
      ''
    return { imageUrl, title: title.trim() }
  } catch {
    return null
  }
}

export async function resolveUrl(rawUrl: string): Promise<ResolvedImage> {
  const url = rawUrl.trim()

  if (isDirectImageUrl(url)) {
    return { imageUrl: url, sourceUrl: url, title: titleFromUrl(url), resolved: true }
  }

  const googleImage = extractGoogleImagesUrl(url)
  if (googleImage) {
    const parsed = new URL(url)
    const sourceUrl = parsed.searchParams.get('imgrefurl') ?? googleImage
    return { imageUrl: googleImage, sourceUrl, title: titleFromUrl(googleImage), resolved: true }
  }

  if (isPinterestShortLink(url)) {
    throw new Error(
      'pin.it share links cannot be resolved — open the link in a browser and paste the full pinterest.com/pin/… address instead',
    )
  }

  const pinId = extractPinterestPinId(url)
  if (pinId) {
    const pin = await fetchPinterestPin(pinId)
    if (pin) {
      return { imageUrl: pin.imageUrl, sourceUrl: url, title: pin.title, resolved: true }
    }
  }

  // Generic pages: try microlink first, then the CORS-proxy OpenGraph fallback.
  const openGraph = (await fetchOpenGraph(url)) ?? (await fetchOpenGraphViaProxy(url))
  if (openGraph) {
    return {
      imageUrl: openGraph.imageUrl,
      sourceUrl: url,
      title: openGraph.title || titleFromUrl(url),
      resolved: true,
    }
  }

  // Graceful fallback: keep the URL so nothing is lost; admin can edit later.
  return { imageUrl: url, sourceUrl: url, title: titleFromUrl(url), resolved: false }
}
