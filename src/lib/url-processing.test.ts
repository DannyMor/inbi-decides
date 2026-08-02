import { describe, expect, it } from 'vitest'
import {
  extractGoogleImagesUrl,
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

describe('splitUrlList', () => {
  it('splits lines, trims, and drops non-URLs', () => {
    const raw = ' https://a.com/1.jpg \nhello\n\nhttp://b.com/2\n'
    expect(splitUrlList(raw)).toEqual(['https://a.com/1.jpg', 'http://b.com/2'])
  })
})
