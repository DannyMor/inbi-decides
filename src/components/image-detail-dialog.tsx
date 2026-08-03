import { Archive, ArchiveRestore, ExternalLink, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { SmartImage } from '@/components/smart-image'
import { StarRating } from '@/components/star-rating'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/lib/auth'
import type { InspirationImage, Rating } from '@/lib/types'
import {
  useDeleteImage,
  useRateFromGallery,
  useUpdateImage,
  useUpdateNotes,
} from '@/hooks/queries'

interface ImageDetailDialogProps {
  image: InspirationImage | null
  onClose: () => void
}

export function ImageDetailDialog({ image, onClose }: ImageDetailDialogProps) {
  const { isAdmin } = useAuth()
  const rate = useRateFromGallery()
  const updateNotes = useUpdateNotes()
  const updateImage = useUpdateImage()
  const deleteImage = useDeleteImage()
  const [notes, setNotes] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Reset local edit state only when a DIFFERENT image is opened — the image
  // object itself gets replaced on every optimistic cache update.
  const imageId = image?.id
  useEffect(() => {
    setNotes(image?.notes ?? '')
    setConfirmDelete(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageId])

  if (!image) return null

  const saveNotes = () => {
    if (notes !== image.notes)
      updateNotes.mutate({ id: image.id, categoryId: image.categoryId, notes })
  }

  return (
    <Dialog open onClose={onClose}>
      <div className="flex flex-col gap-4">
        <DialogTitle>{image.title || 'Untitled'}</DialogTitle>
        <SmartImage image={image} fit="contain" className="max-h-[50dvh] w-full" />
        <StarRating
          value={image.rating}
          onRate={(rating: Rating) =>
            rate.mutate({ id: image.id, categoryId: image.categoryId, rating })
          }
          size="lg"
        />
        <div className="flex flex-col gap-2">
          <Label htmlFor="image-notes">Notes</Label>
          <Textarea
            id="image-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            onBlur={saveNotes}
            placeholder="Anything worth remembering…"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={image.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: 'outline' })}
          >
            <ExternalLink /> Source
          </a>
          <Button
            variant="outline"
            onClick={() => {
              updateImage.mutate({
                id: image.id,
                categoryId: image.categoryId,
                patch: { archived: !image.archived },
              })
              onClose()
            }}
          >
            {image.archived ? <ArchiveRestore /> : <Archive />}
            {image.archived ? 'Unarchive' : 'Archive'}
          </Button>
          {isAdmin && (
            <Button
              variant="destructive"
              onClick={() => {
                if (!confirmDelete) {
                  setConfirmDelete(true)
                  return
                }
                deleteImage.mutate({ id: image.id, categoryId: image.categoryId })
                onClose()
              }}
            >
              <Trash2 /> {confirmDelete ? 'Tap again to delete' : 'Delete'}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  )
}
