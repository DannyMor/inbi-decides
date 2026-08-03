import { describe, expect, it } from 'vitest'
import {
  extractFirstUrl,
  extractGoogleImagesUrl,
  extractPinterestPinId,
  isPinterestShortLink,
  isDirectImageUrl,
  splitUrlList,
  titleFromUrl,
} from './url-processing'

describe('isDirectImageUrl', () => {
  it('accepts common image extensions', () => {
    expect(isDirectImageUrl('https://example.com/photo.jpg')).toBe(true)
    expect(isDirectImageUrl('https://example.com/photo.PNG')).toBe(true)
    expect(isDirectImageUrl('https://example.com/photo.webp?w=800')).toBe(true)
  })

  it('accepts known image hosts without an extension', () => {
    expect(isDirectImageUrl('https://i.pinimg.com/736x/ab/cd/ef/image')).toBe(true)
  })

  it('rejects regular pages and garbage', () => {
    expect(isDirectImageUrl('https://www.pinterest.com/pin/1234/')).toBe(false)
    expect(isDirectImageUrl('not a url')).toBe(false)
  })
})

describe('extractGoogleImagesUrl', () => {
  it('pulls imgurl out of a Google Images link', () => {
    const url =
      'https://www.google.com/imgres?imgurl=' +
      encodeURIComponent('https://example.com/kitchen.jpg') +
      '&imgrefurl=' +
      encodeURIComponent('https://example.com/kitchens')
    expect(extractGoogleImagesUrl(url)).toBe('https://example.com/kitchen.jpg')
  })

  it('returns null for non-Google URLs', () => {
    expect(extractGoogleImagesUrl('https://example.com/?imgurl=https%3A%2F%2Fx.com%2Fa.jpg')).toBe(
      null,
    )
  })

  it('returns null when imgurl is missing or invalid', () => {
    expect(extractGoogleImagesUrl('https://www.google.com/imgres?q=kitchen')).toBe(null)
    expect(extractGoogleImagesUrl('https://www.google.com/imgres?imgurl=notaurl')).toBe(null)
  })
})

describe('titleFromUrl', () => {
  it('humanizes the last path segment and strips the extension', () => {
    expect(titleFromUrl('https://example.com/modern-farmhouse_kitchen.jpg')).toBe(
      'modern farmhouse kitchen',
    )
  })

  it('falls back to the hostname for bare domains', () => {
    expect(titleFromUrl('https://example.com/')).toBe('example.com')
  })
})

describe('extractPinterestPinId', () => {
  it('extracts the pin id from pin pages on any Pinterest domain', () => {
    expect(extractPinterestPinId('https://www.pinterest.com/pin/99360735500167749/')).toBe(
      '99360735500167749',
    )
    expect(extractPinterestPinId('https://ru.pinterest.com/pin/123456/')).toBe('123456')
    expect(extractPinterestPinId('https://www.pinterest.co.uk/pin/42/sent/')).toBe('42')
  })

  it('returns null for non-pin Pinterest pages and other sites', () => {
    expect(extractPinterestPinId('https://www.pinterest.com/danny/board-name/')).toBe(null)
    expect(extractPinterestPinId('https://notpinterest.com/pin/123/')).toBe(null)
    expect(extractPinterestPinId('https://evil.com/?x=pinterest.com/pin/1')).toBe(null)
  })
})

describe('extractFirstUrl', () => {
  it('pulls the first URL out of share-sheet text', () => {
    expect(extractFirstUrl('Check this out! https://pin.it/abc123 so cool')).toBe(
      'https://pin.it/abc123',
    )
  })

  it('strips trailing sentence punctuation', () => {
    expect(extractFirstUrl('look: https://example.com/a.jpg!')).toBe('https://example.com/a.jpg')
  })

  it('returns null when there is no URL', () => {
    expect(extractFirstUrl('just some text')).toBe(null)
  })
})

describe('isPinterestShortLink', () => {
  it('detects pin.it share links only', () => {
    expect(isPinterestShortLink('https://pin.it/13yooxDHR')).toBe(true)
    expect(isPinterestShortLink('https://www.pinterest.com/pin/123/')).toBe(false)
    expect(isPinterestShortLink('https://pin.it.evil.com/x')).toBe(false)
  })
})

describe('splitUrlList', () => {
  it('splits lines, trims, and drops non-URLs', () => {
    const raw = ' https://a.com/1.jpg \nhello\n\nhttp://b.com/2\n'
    expect(splitUrlList(raw)).toEqual(['https://a.com/1.jpg', 'http://b.com/2'])
  })
})
