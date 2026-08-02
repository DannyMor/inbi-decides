import { resolveUrl, testImageReachable } from '@/lib/url-processing'

export interface ImportLineResult {
  url: string
  title: string
  ok: boolean
  message?: string
}

/**
 * Resolves each URL, verifies the image actually loads, and hands verified
 * entries to `save`. Unreachable images are reported and NOT saved.
 */
export async function importUrls(
  urls: string[],
  save: (input: { imageUrl: string; sourceUrl: string; title: string }) => Promise<void>,
  onProgress: (results: ImportLineResult[]) => void,
): Promise<ImportLineResult[]> {
  const results: ImportLineResult[] = []
  for (const url of urls) {
    try {
      const resolved = await resolveUrl(url)
      if (!resolved.resolved) {
        throw new Error('could not extract an image from this page — paste a direct image link')
      }
      const reachable = await testImageReachable(resolved.imageUrl)
      if (!reachable) {
        throw new Error('image did not load — check the link')
      }
      await save({
        imageUrl: resolved.imageUrl,
        sourceUrl: resolved.sourceUrl,
        title: resolved.title,
      })
      results.push({ url, title: resolved.title, ok: true })
    } catch (cause) {
      results.push({
        url,
        title: '',
        ok: false,
        message: cause instanceof Error ? cause.message : 'failed to save',
      })
    }
    onProgress([...results])
  }
  return results
}
