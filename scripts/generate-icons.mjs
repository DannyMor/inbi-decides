// Generates the PWA icon PNGs with zero dependencies (raw RGBA + zlib).
// Draws a gold star on a white rounded card. Run: node scripts/generate-icons.mjs
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
mkdirSync(publicDir, { recursive: true })

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(size, pixels) {
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0 // filter: none
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function starPolygon(cx, cy, outer, inner) {
  const points = []
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? outer : inner
    const angle = -Math.PI / 2 + (i * Math.PI) / 5
    points.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)])
  }
  return points
}

function pointInPolygon(x, y, polygon) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

const GOLD = [245, 185, 40]
const WHITE = [255, 255, 255]

function drawIcon(size, { maskable }) {
  const pixels = Buffer.alloc(size * size * 4)
  const star = starPolygon(size / 2, size / 2 + size * 0.03, size * 0.34, size * 0.14)
  // Maskable icons must fill the whole canvas (the OS applies its own mask).
  const cornerRadius = maskable ? 0 : size * 0.2
  const half = size / 2
  const cardHalf = half - (maskable ? 0 : size * 0.02)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const offset = (y * size + x) * 4
      const dx = Math.max(Math.abs(x - half) - (cardHalf - cornerRadius), 0)
      const dy = Math.max(Math.abs(y - half) - (cardHalf - cornerRadius), 0)
      const onCard = maskable || Math.hypot(dx, dy) <= cornerRadius
      if (!onCard) {
        pixels[offset + 3] = 0
        continue
      }
      // Supersample 2x2 for smooth star edges.
      let hits = 0
      for (const [sx, sy] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
        if (pointInPolygon(x + sx, y + sy, star)) hits++
      }
      const t = hits / 4
      pixels[offset] = Math.round(WHITE[0] + (GOLD[0] - WHITE[0]) * t)
      pixels[offset + 1] = Math.round(WHITE[1] + (GOLD[1] - WHITE[1]) * t)
      pixels[offset + 2] = Math.round(WHITE[2] + (GOLD[2] - WHITE[2]) * t)
      pixels[offset + 3] = 255
    }
  }
  return encodePng(size, pixels)
}

const targets = [
  ['pwa-192x192.png', 192, { maskable: false }],
  ['pwa-512x512.png', 512, { maskable: false }],
  ['pwa-maskable-512x512.png', 512, { maskable: true }],
  ['apple-touch-icon.png', 180, { maskable: true }],
]

for (const [name, size, options] of targets) {
  writeFileSync(join(publicDir, name), drawIcon(size, options))
  console.log(`wrote public/${name}`)
}
