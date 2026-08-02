import { ArrowLeft, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ImageDetailDialog } from '@/components/image-detail-dialog'
import { SmartImage } from '@/components/smart-image'
import { StarRow } from '@/components/star-rating'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useCategories, useGallery } from '@/hooks/queries'
import type { InspirationImage, Rating } from '@/lib/types'
import { cn } from '@/lib/utils'

type StarFilter = 'all' | 'unrated' | Rating
const STAR_FILTERS: StarFilter[] = ['all', 5, 4, 3, 2, 1, 'unrated']

export function GalleryPage() {
  const { categoryId = '' } = useParams()
  const { data: categories } = useCategories()
  const { data: images, isLoading } = useGallery(categoryId)
  const [selected, setSelected] = useState<InspirationImage | null>(null)
  const [search, setSearch] = useState('')
  const [starFilter, setStarFilter] = useState<StarFilter>('all')
  const [showArchived, setShowArchived] = useState(false)

  const category = categories?.find((entry) => entry.id === categoryId)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (images ?? []).filter((image) => {
      if (!showArchived && image.archived) return false
      if (starFilter === 'unrated' && image.rating !== null) return false
      if (typeof starFilter === 'number' && image.rating !== starFilter) return false
      if (term && !`${image.title} ${image.notes}`.toLowerCase().includes(term)) return false
      return true
    })
  }, [images, search, starFilter, showArchived])

  const groups = useMemo(() => {
    const byRating = new Map<Rating | null, InspirationImage[]>()
    for (const image of filtered) {
      const bucket = byRating.get(image.rating) ?? []
      bucket.push(image)
      byRating.set(image.rating, bucket)
    }
    const order: (Rating | null)[] = [5, 4, 3, 2, 1, null]
    return order
      .filter((rating) => byRating.has(rating))
      .map((rating) => ({ rating, images: byRating.get(rating)! }))
  }, [filtered])

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-4 p-4">
      <header className="flex items-center gap-2">
        <Link to="/" aria-label="Back">
          <Button variant="ghost" size="icon">
            <ArrowLeft />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">
          {category ? `${category.emoji} ${category.name}`.trim() : 'Gallery'}
        </h1>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search title or notes"
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {STAR_FILTERS.map((filter) => (
          <button
            key={String(filter)}
            type="button"
            onClick={() => setStarFilter(filter)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              starFilter === filter
                ? 'border-primary bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-accent',
            )}
          >
            {filter === 'all' ? 'All' : filter === 'unrated' ? 'Unrated' : `${filter}★`}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowArchived((value) => !value)}
          className={cn(
            'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
            showArchived
              ? 'border-primary bg-primary text-primary-foreground'
              : 'bg-background text-muted-foreground hover:bg-accent',
          )}
        >
          Archived
        </button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="aspect-square w-full" />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <p className="py-16 text-center text-muted-foreground">Nothing here yet.</p>
      )}

      {groups.map(({ rating, images: groupImages }) => (
        <section key={String(rating)} className="flex flex-col gap-3">
          <div className="flex items-center gap-2 pt-2">
            {rating === null ? (
              <span className="text-sm font-medium text-muted-foreground">Not voted</span>
            ) : (
              <StarRow rating={rating} />
            )}
            <Badge variant="secondary">{groupImages.length}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {groupImages.map((image) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setSelected(image)}
                className={cn(
                  'overflow-hidden rounded-lg text-left transition-transform active:scale-95',
                  image.archived && 'opacity-50',
                )}
              >
                <SmartImage image={image} className="aspect-square w-full" />
              </button>
            ))}
          </div>
        </section>
      ))}

      <ImageDetailDialog image={selected} onClose={() => setSelected(null)} />
    </main>
  )
}
