import { ExternalLink, ImageOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { InspirationImage } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'

interface SmartImageProps {
  image: InspirationImage
  className?: string
  /**
   * 'cover' fills a fixed-size box (caller must give the box a height, e.g.
   * aspect-square) — used for gallery tiles. 'contain' shows the whole image
   * at natural aspect, capped by the caller's max-h — used for voting/detail.
   */
  fit?: 'cover' | 'contain'
  /** Extra actions rendered inside the broken-image fallback (archive/delete). */
  brokenActions?: React.ReactNode
}

export function SmartImage({ image, className, fit = 'cover', brokenActions }: SmartImageProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')

  useEffect(() => {
    setStatus('loading')
  }, [image.imageUrl])

  if (status === 'error') {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-lg bg-muted p-6 text-center',
          className,
        )}
      >
        <ImageOff className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Image unavailable</p>
        <a
          href={image.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4"
        >
          Open source page <ExternalLink className="size-3.5" />
        </a>
        {brokenActions}
      </div>
    )
  }

  if (fit === 'contain') {
    // Natural aspect ratio; the img is never lazy here (a hidden lazy image
    // would never intersect the viewport and therefore never load).
    return (
      <div className={cn('flex w-full items-center justify-center', className)}>
        {status === 'loading' && <Skeleton className="h-72 w-full rounded-lg" />}
        <img
          src={image.imageUrl}
          alt={image.title || 'Inspiration image'}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          className={cn(
            'max-h-[inherit] max-w-full rounded-lg object-contain',
            status === 'loading' && 'hidden',
          )}
        />
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden rounded-lg', className)}>
      {status === 'loading' && <Skeleton className="absolute inset-0" />}
      <img
        src={image.imageUrl}
        alt={image.title || 'Inspiration image'}
        loading="lazy"
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
        className={cn(
          'h-full w-full object-cover transition-opacity',
          status === 'loading' ? 'opacity-0' : 'opacity-100',
        )}
      />
    </div>
  )
}
