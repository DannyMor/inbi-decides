import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Rating } from '@/lib/types'

const RATINGS: Rating[] = [1, 2, 3, 4, 5]

interface StarRatingProps {
  value: Rating | null
  onRate: (rating: Rating) => void
  /** 'lg' = 56px touch targets for the voting screen, 'sm' = compact gallery display */
  size?: 'lg' | 'sm'
  disabled?: boolean
  className?: string
}

export function StarRating({ value, onRate, size = 'lg', disabled, className }: StarRatingProps) {
  return (
    <div className={cn('flex items-center justify-center', size === 'lg' ? 'gap-1' : 'gap-0.5', className)}>
      {RATINGS.map((rating) => {
        const filled = value !== null && rating <= value
        return (
          <button
            key={rating}
            type="button"
            disabled={disabled}
            onClick={() => onRate(rating)}
            aria-label={`Rate ${rating} star${rating > 1 ? 's' : ''}`}
            className={cn(
              'flex items-center justify-center rounded-full transition-transform active:scale-90 disabled:opacity-50',
              size === 'lg' ? 'size-14' : 'size-8',
            )}
          >
            <Star
              className={cn(
                size === 'lg' ? 'size-11' : 'size-6',
                filled ? 'fill-star text-star' : 'text-muted-foreground/40',
              )}
            />
          </button>
        )
      })}
    </div>
  )
}

export function StarRow({ rating, className }: { rating: Rating; className?: string }) {
  return (
    <div className={cn('flex items-center gap-0.5', className)} aria-label={`${rating} stars`}>
      {RATINGS.map((star) => (
        <Star
          key={star}
          className={cn('size-5', star <= rating ? 'fill-star text-star' : 'text-muted-foreground/30')}
        />
      ))}
    </div>
  )
}
