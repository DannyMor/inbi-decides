import { Archive, ArchiveRestore, ExternalLink, Pencil, Star, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useCategories, useDeleteImage, useGallery, useUpdateImage } from '@/hooks/queries'
import type { InspirationImage } from '@/lib/types'
import { cn } from '@/lib/utils'

function Thumb({ image }: { image: InspirationImage }) {
  const [broken, setBroken] = useState(false)
  useEffect(() => setBroken(false), [image.imageUrl])
  if (broken) {
    return (
      <div className="flex size-14 shrink-0 items-center justify-center rounded-md bg-muted text-lg">
        🚫
      </div>
    )
  }
  return (
    <img
      src={image.imageUrl}
      alt=""
      loading="lazy"
      onError={() => setBroken(true)}
      className="size-14 shrink-0 rounded-md object-cover"
    />
  )
}

function EditImageDialog({
  image,
  onClose,
}: {
  image: InspirationImage | null
  onClose: () => void
}) {
  const updateImage = useUpdateImage(image?.categoryId ?? '')
  const [title, setTitle] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')

  useEffect(() => {
    setTitle(image?.title ?? '')
    setImageUrl(image?.imageUrl ?? '')
    setSourceUrl(image?.sourceUrl ?? '')
  }, [image])

  if (!image) return null

  const save = () => {
    updateImage.mutate({ id: image.id, patch: { title, imageUrl, sourceUrl } })
    onClose()
  }

  return (
    <Dialog open onClose={onClose}>
      <div className="flex flex-col gap-4">
        <DialogTitle>Edit image</DialogTitle>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-title">Title</Label>
          <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-image-url">Image URL (direct link to the picture)</Label>
          <Input
            id="edit-image-url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://i.pinimg.com/…jpg"
          />
        </div>
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Preview"
            className="max-h-48 w-full rounded-md object-contain bg-muted"
            onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
            onLoad={(e) => ((e.target as HTMLImageElement).style.display = '')}
          />
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-source-url">Source URL (page that opens on tap)</Label>
          <Input
            id="edit-source-url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://www.pinterest.com/pin/…"
          />
        </div>
        <Button onClick={save} disabled={updateImage.isPending}>
          Save
        </Button>
      </div>
    </Dialog>
  )
}

export function ManageImagesSection() {
  const { data: categories } = useCategories()
  const [categoryId, setCategoryId] = useState('')
  const { data: images, isLoading } = useGallery(categoryId)
  const deleteImage = useDeleteImage(categoryId)
  const updateImage = useUpdateImage(categoryId)
  const [editing, setEditing] = useState<InspirationImage | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const allCategories = categories ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Images</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Pick a category…</option>
          {allCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {`${category.emoji} ${category.name}`.trim()}
            </option>
          ))}
        </Select>

        {categoryId && isLoading && (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}

        {categoryId && !isLoading && (images ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No images in this category yet.</p>
        )}

        {(images ?? []).map((image) => (
          <div
            key={image.id}
            className={cn(
              'flex items-center gap-3 rounded-md border p-2',
              image.archived && 'opacity-50',
            )}
          >
            <Thumb image={image} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{image.title || 'Untitled'}</p>
              <a
                href={image.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex max-w-full items-center gap-1 truncate text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                <span className="truncate">{image.sourceUrl}</span>
                <ExternalLink className="size-3 shrink-0" />
              </a>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                {image.rating ? (
                  <>
                    {image.rating} <Star className="size-3 fill-star text-star" />
                  </>
                ) : (
                  'not voted'
                )}
                {image.archived && ' · archived'}
              </p>
            </div>
            <div className="flex shrink-0 gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Edit image"
                onClick={() => setEditing(image)}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={image.archived ? 'Unarchive image' : 'Archive image'}
                onClick={() =>
                  updateImage.mutate({ id: image.id, patch: { archived: !image.archived } })
                }
              >
                {image.archived ? <ArchiveRestore /> : <Archive />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={confirmDeleteId === image.id ? 'Confirm delete' : 'Delete image'}
                className={cn('text-destructive', confirmDeleteId === image.id && 'bg-destructive/10')}
                onClick={() => {
                  if (confirmDeleteId !== image.id) {
                    setConfirmDeleteId(image.id)
                    return
                  }
                  deleteImage.mutate(image.id)
                  setConfirmDeleteId(null)
                }}
              >
                <Trash2 />
              </Button>
            </div>
          </div>
        ))}

        <EditImageDialog image={editing} onClose={() => setEditing(null)} />
      </CardContent>
    </Card>
  )
}
