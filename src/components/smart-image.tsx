import { ExternalLink, ImageOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { InspirationImage } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'

interface SmartImageProps {
  image: InspirationImage
  className?: string
  /** Extra actions rendered inside the broken-image fallback (archive/delete). */
  brokenActions?: React.ReactNode
}

/** Lazy image with skeleton while loading and a graceful broken-image state. */
export function SmartImage({ image, className, brokenActions }: SmartImageProps) {
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
