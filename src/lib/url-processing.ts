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

  const openGraph = await fetchOpenGraph(url)
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
