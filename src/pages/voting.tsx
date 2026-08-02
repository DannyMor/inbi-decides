import { ArrowLeft, ExternalLink, SkipForward } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { QueryError } from '@/components/query-error'
import { SmartImage } from '@/components/smart-image'
import { StarRating } from '@/components/star-rating'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCategories, useRateFromQueue, useVotingQueue } from '@/hooks/queries'
import type { Rating } from '@/lib/types'

export function VotingPage() {
  const { categoryId = '' } = useParams()
  const navigate = useNavigate()
  const { data: categories } = useCategories()
  const { data: queue, isLoading, error } = useVotingQueue(categoryId)
  const rate = useRateFromQueue(categoryId)
  // Skipped image ids stay rating=null in Firestore; hide them locally for this session.
  const [skippedIds, setSkippedIds] = useState<string[]>([])

  const category = categories?.find((entry) => entry.id === categoryId)
  const visibleQueue = useMemo(
    () => (queue ?? []).filter((image) => !skippedIds.includes(image.id)),
    [queue, skippedIds],
  )
  const current = visibleQueue[0] ?? null
  const next = visibleQueue[1] ?? null

  // Skipped images "return later": once everything fetched is skipped, bring them back.
  useEffect(() => {
    if (queue && queue.length > 0 && visibleQueue.length === 0) {
      setSkippedIds([])
    }
  }, [queue, visibleQueue])

  // Prefetch the next image so rating feels instant.
  useEffect(() => {
    if (next) {
      const preload = new Image()
      preload.src = next.imageUrl
    }
  }, [next])

  const handleRate = useCallback(
    (rating: Rating) => {
      if (!current || rate.isPending) return
      rate.mutate({ id: current.id, rating })
    },
    [current, rate],
  )

  const handleSkip = useCallback(() => {
    if (!current) return
    setSkippedIds((ids) => [...ids, current.id])
  }, [current])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key >= '1' && event.key <= '5') {
        handleRate(Number(event.key) as Rating)
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        handleSkip()
      } else if (event.key === 'Escape') {
        navigate('/')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleRate, handleSkip, navigate])

  const title = category ? `${category.emoji} ${category.name}`.trim() : ''

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-4 p-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="aspect-square w-full" />
        <Skeleton className="mx-auto h-14 w-72" />
      </main>
    )
  }

  if (error) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col p-4">
        <h1 className="text-xl font-semibold">{title}</h1>
        <QueryError error={error} />
      </main>
    )
  }

  if (!current) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center gap-6 p-6 text-center">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-6xl">🎉</p>
        <p className="text-lg text-muted-foreground">No new images to vote.</p>
        <div className="flex flex-col gap-3">
          <Link to={`/gallery/${categoryId}`} className={buttonVariants({ size: 'lg' })}>
            View Gallery
          </Link>
          <Link to="/" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            Back
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-4 p-4">
      <header className="flex items-center gap-2">
        <Link to="/" aria-label="Back">
          <Button variant="ghost" size="icon">
            <ArrowLeft />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">{title}</h1>
      </header>

      <div className="flex flex-1 items-center justify-center">
        <SmartImage
          key={current.id}
          image={current}
          className="max-h-[60dvh] w-full"
          brokenActions={
            <Button variant="outline" size="sm" onClick={handleSkip}>
              Skip
            </Button>
          }
        />
      </div>

      <div className="flex flex-col items-center gap-3 pb-4">
        <StarRating value={null} onRate={handleRate} size="lg" disabled={rate.isPending} />
        <div className="flex gap-2">
          <Button variant="ghost" onClick={handleSkip}>
            <SkipForward /> Skip
          </Button>
          <a
            href={current.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: 'ghost' })}
          >
            <ExternalLink /> Open Source
          </a>
        </div>
      </div>
    </main>
  )
}
