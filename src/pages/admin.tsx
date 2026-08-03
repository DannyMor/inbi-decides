import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Images,
  Loader2,
  Pencil,
  Plus,
  Star,
  Trash2,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { importUrls, type ImportLineResult } from '@/components/import-urls'
import { QueryError } from '@/components/query-error'
import { Button } from '@/components/ui/button'
import { Dialog, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  useCategories,
  useCreateCategory,
  useCreateImage,
  useDeleteCategory,
  useDeleteImage,
  useGallery,
  useUpdateCategory,
  useUpdateImage,
} from '@/hooks/queries'
import { isDirectImageUrl, resolveUrl, splitUrlList } from '@/lib/url-processing'
import type { Category, InspirationImage } from '@/lib/types'
import { cn } from '@/lib/utils'

// --- small shared pieces ---

function ImportResults({ results }: { results: ImportLineResult[] }) {
  if (results.length === 0) return null
  return (
    <ul className="flex flex-col gap-1.5">
      {results.map((result) => (
        <li key={result.url} className="flex items-start gap-2 text-sm">
          {result.ok ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600" />
          ) : (
            <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          )}
          <span className="min-w-0">
            <span className="block truncate">{result.title || result.url}</span>
            {result.message && <span className="text-xs text-destructive">{result.message}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}

function UrlsField({
  value,
  onChange,
  autoFocus,
}: {
  value: string
  onChange: (value: string) => void
  autoFocus?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="urls-field">Image links — one per line</Label>
      <Textarea
        id="urls-field"
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={'https://www.pinterest.com/pin/…\nhttps://….jpg'}
        autoFocus={autoFocus}
      />
      <p className="text-xs text-muted-foreground">
        pinterest.com/pin links, direct images, or article pages. pin.it links: open in browser
        first, copy the full address.
      </p>
    </div>
  )
}

function Thumb({ image }: { image: InspirationImage }) {
  const [broken, setBroken] = useState(false)
  useEffect(() => setBroken(false), [image.imageUrl])
  if (broken || !/^https?:\/\//.test(image.imageUrl)) {
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

// --- create category (name + emoji + at least one image) ---

function CreateCategoryDialog({
  open,
  onClose,
  onCreated,
  nextOrder,
}: {
  open: boolean
  onClose: () => void
  onCreated: (id: string) => void
  nextOrder: number
}) {
  const createCategory = useCreateCategory()
  const createImage = useCreateImage()
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('')
  const [urls, setUrls] = useState('')
  const [results, setResults] = useState<ImportLineResult[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setName('')
      setEmoji('')
      setUrls('')
      setResults([])
      setError('')
    }
  }, [open])

  const submit = async () => {
    const urlList = splitUrlList(urls)
    if (!name.trim()) {
      setError('Give the category a name')
      return
    }
    if (urlList.length === 0) {
      setError('Add at least one image link')
      return
    }
    setError('')
    setBusy(true)
    try {
      const categoryId = await createCategory.mutateAsync({
        name: name.trim(),
        emoji: emoji.trim(),
        order: nextOrder,
      })
      const outcome = await importUrls(
        urlList,
        (input) => createImage.mutateAsync({ categoryId, ...input }),
        setResults,
      )
      if (outcome.every((line) => line.ok)) {
        onCreated(categoryId)
        onClose()
      } else {
        onCreated(categoryId)
        setError('Category created — some images failed, see below. Close and fix or retry.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <DialogTitle>New category</DialogTitle>
        <div className="flex gap-2">
          <div className="w-20">
            <Label htmlFor="new-emoji" className="sr-only">
              Emoji
            </Label>
            <Input
              id="new-emoji"
              value={emoji}
              onChange={(event) => setEmoji(event.target.value)}
              placeholder="🏠"
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="new-name" className="sr-only">
              Name
            </Label>
            <Input
              id="new-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Kitchen"
              autoFocus
            />
          </div>
        </div>
        <UrlsField value={urls} onChange={setUrls} />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <ImportResults results={results} />
        <Button onClick={() => void submit()} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Plus />}
          {busy ? 'Creating…' : 'Create'}
        </Button>
      </div>
    </Dialog>
  )
}

// --- edit category (rename / emoji) ---

function EditCategoryDialog({
  category,
  onClose,
}: {
  category: Category | null
  onClose: () => void
}) {
  const updateCategory = useUpdateCategory()
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('')

  useEffect(() => {
    setName(category?.name ?? '')
    setEmoji(category?.emoji ?? '')
  }, [category])

  if (!category) return null

  const save = () => {
    if (!name.trim()) return
    updateCategory.mutate({ id: category.id, patch: { name: name.trim(), emoji: emoji.trim() } })
    onClose()
  }

  return (
    <Dialog open onClose={onClose}>
      <div className="flex flex-col gap-4">
        <DialogTitle>Edit category</DialogTitle>
        <div className="flex gap-2">
          <div className="w-20">
            <Label htmlFor="edit-cat-emoji" className="sr-only">
              Emoji
            </Label>
            <Input
              id="edit-cat-emoji"
              value={emoji}
              onChange={(event) => setEmoji(event.target.value)}
              placeholder="🏠"
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="edit-cat-name" className="sr-only">
              Name
            </Label>
            <Input id="edit-cat-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
        </div>
        <Button onClick={save} disabled={updateCategory.isPending}>
          Save
        </Button>
      </div>
    </Dialog>
  )
}

// --- add images to existing category ---

function AddImagesDialog({
  categoryId,
  open,
  onClose,
}: {
  categoryId: string
  open: boolean
  onClose: () => void
}) {
  const createImage = useCreateImage()
  const [urls, setUrls] = useState('')
  const [results, setResults] = useState<ImportLineResult[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setUrls('')
      setResults([])
    }
  }, [open])

  const submit = async () => {
    const urlList = splitUrlList(urls)
    if (urlList.length === 0) return
    setBusy(true)
    try {
      const outcome = await importUrls(
        urlList,
        (input) => createImage.mutateAsync({ categoryId, ...input }),
        setResults,
      )
      if (outcome.every((line) => line.ok)) onClose()
      else setUrls(outcome.filter((line) => !line.ok).map((line) => line.url).join('\n'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <DialogTitle>Add images</DialogTitle>
        <UrlsField value={urls} onChange={setUrls} autoFocus />
        <ImportResults results={results} />
        <Button onClick={() => void submit()} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Plus />}
          {busy ? 'Adding…' : 'Add'}
        </Button>
      </div>
    </Dialog>
  )
}

// --- edit a single image ---

function EditImageDialog({
  image,
  onClose,
}: {
  image: InspirationImage | null
  onClose: () => void
}) {
  const updateImage = useUpdateImage()
  const [title, setTitle] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [resolving, setResolving] = useState(false)
  const [resolveError, setResolveError] = useState('')

  useEffect(() => {
    setTitle(image?.title ?? '')
    setImageUrl(image?.imageUrl ?? '')
    setSourceUrl(image?.sourceUrl ?? '')
    setResolveError('')
  }, [image])

  if (!image) return null

  // Paste any link — a pin page gets resolved to its actual image, like import does.
  const maybeResolve = async (value: string) => {
    const url = value.trim()
    if (!url || isDirectImageUrl(url) || url === image.imageUrl) return
    setResolving(true)
    setResolveError('')
    try {
      const resolved = await resolveUrl(url)
      if (!resolved.resolved) {
        setResolveError('Could not extract an image from that page — paste a direct image link.')
        return
      }
      setImageUrl(resolved.imageUrl)
      setSourceUrl(resolved.sourceUrl)
      if (!title.trim() && resolved.title) setTitle(resolved.title)
    } catch (cause) {
      setResolveError(cause instanceof Error ? cause.message : 'Could not resolve that link.')
    } finally {
      setResolving(false)
    }
  }

  const save = () => {
    updateImage.mutate({
      id: image.id,
      categoryId: image.categoryId,
      patch: { title, imageUrl, sourceUrl },
    })
    onClose()
  }

  return (
    <Dialog open onClose={onClose}>
      <div className="flex flex-col gap-4">
        <DialogTitle>Edit image</DialogTitle>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-title">Title</Label>
          <Input id="edit-title" value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-image-url">Image link — paste a pin page or a direct image</Label>
          <div className="relative">
            <Input
              id="edit-image-url"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              onBlur={(event) => void maybeResolve(event.target.value)}
              onPaste={(event) =>
                void maybeResolve(event.clipboardData.getData('text'))
              }
              placeholder="https://www.pinterest.com/pin/… or https://…jpg"
              className={cn(resolving && 'pr-9')}
            />
            {resolving && (
              <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
          {resolveError && <p className="text-xs text-destructive">{resolveError}</p>}
        </div>
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Preview"
            className="max-h-48 w-full rounded-md bg-muted object-contain"
            onError={(event) => ((event.target as HTMLImageElement).style.display = 'none')}
            onLoad={(event) => ((event.target as HTMLImageElement).style.display = '')}
          />
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-source-url">Source link (page that opens on tap)</Label>
          <Input
            id="edit-source-url"
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
          />
        </div>
        <Button onClick={save} disabled={updateImage.isPending}>
          Save
        </Button>
      </div>
    </Dialog>
  )
}

// --- selected category panel: category actions + image list ---

function CategoryPanel({
  category,
  onDeleted,
}: {
  category: Category
  onDeleted: () => void
}) {
  const { data: images, isLoading, error } = useGallery(category.id)
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()
  const updateImage = useUpdateImage()
  const deleteImage = useDeleteImage()
  const [editingCategory, setEditingCategory] = useState(false)
  const [editingImage, setEditingImage] = useState<InspirationImage | null>(null)
  const [addingImages, setAddingImages] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null) // 'category' or image id

  useEffect(() => setConfirmDelete(null), [category.id])

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 rounded-xl border p-3">
        <span className={cn('min-w-0 truncate font-semibold', category.archived && 'line-through')}>
          {`${category.emoji} ${category.name}`.trim()}
          {category.archived && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">archived</span>
          )}
        </span>
        <span className="flex shrink-0 gap-0.5">
          <Link to={`/gallery/${category.id}`} aria-label="Open gallery">
            <Button variant="ghost" size="icon">
              <Images />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Rename category"
            onClick={() => setEditingCategory(true)}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={category.archived ? 'Unarchive category' : 'Archive category'}
            onClick={() =>
              updateCategory.mutate({ id: category.id, patch: { archived: !category.archived } })
            }
          >
            {category.archived ? <ArchiveRestore /> : <Archive />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete category"
            className={cn('text-destructive', confirmDelete === 'category' && 'bg-destructive/10')}
            onClick={() => {
              if (confirmDelete !== 'category') {
                setConfirmDelete('category')
                return
              }
              deleteCategory.mutate(category.id)
              onDeleted()
            }}
          >
            <Trash2 />
          </Button>
        </span>
      </div>
      {confirmDelete === 'category' && (
        <p className="text-center text-xs text-destructive">
          Tap the trash icon again to delete "{category.name}" — its images stay in the database
          but become unreachable.
        </p>
      )}

      <Button variant="outline" onClick={() => setAddingImages(true)}>
        <Plus /> Add images
      </Button>

      {error && <QueryError error={error} />}
      {isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-[74px] w-full" />
          <Skeleton className="h-[74px] w-full" />
        </div>
      )}
      {!isLoading && !error && (images ?? []).length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No images yet — add some with the button above.
        </p>
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
              className="inline-flex max-w-full items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
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
              onClick={() => setEditingImage(image)}
            >
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={image.archived ? 'Unarchive image' : 'Archive image'}
              onClick={() =>
                updateImage.mutate({
                  id: image.id,
                  categoryId: image.categoryId,
                  patch: { archived: !image.archived },
                })
              }
            >
              {image.archived ? <ArchiveRestore /> : <Archive />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={confirmDelete === image.id ? 'Confirm delete' : 'Delete image'}
              className={cn('text-destructive', confirmDelete === image.id && 'bg-destructive/10')}
              onClick={() => {
                if (confirmDelete !== image.id) {
                  setConfirmDelete(image.id)
                  return
                }
                deleteImage.mutate({ id: image.id, categoryId: image.categoryId })
                setConfirmDelete(null)
              }}
            >
              <Trash2 />
            </Button>
          </div>
        </div>
      ))}

      <EditCategoryDialog
        category={editingCategory ? category : null}
        onClose={() => setEditingCategory(false)}
      />
      <EditImageDialog image={editingImage} onClose={() => setEditingImage(null)} />
      <AddImagesDialog
        categoryId={category.id}
        open={addingImages}
        onClose={() => setAddingImages(false)}
      />
    </section>
  )
}

// --- page ---

export function AdminPage() {
  const { data: categories } = useCategories()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const all = useMemo(() => categories ?? [], [categories])
  const selected = all.find((category) => category.id === selectedId) ?? null

  // Auto-select the first category once loaded.
  useEffect(() => {
    if (!selectedId && all.length > 0) setSelectedId(all[0].id)
  }, [all, selectedId])

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-4 p-4">
      <header className="flex items-center gap-2">
        <Link to="/" aria-label="Back">
          <Button variant="ghost" size="icon">
            <ArrowLeft />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">Admin</h1>
      </header>

      <div className="flex flex-wrap gap-2">
        {all.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setSelectedId(category.id)}
            className={cn(
              'rounded-full border px-3.5 py-2 text-sm font-medium transition-colors',
              category.id === selectedId
                ? 'border-primary bg-primary text-primary-foreground'
                : 'bg-background hover:bg-accent',
              category.archived && 'opacity-50',
            )}
          >
            {`${category.emoji} ${category.name}`.trim()}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCreating(true)}
          aria-label="New category"
          className="flex items-center gap-1 rounded-full border border-dashed px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Plus className="size-4" /> New
        </button>
      </div>

      {selected ? (
        <CategoryPanel
          key={selected.id}
          category={selected}
          onDeleted={() => setSelectedId(null)}
        />
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {all.length === 0 ? 'Create your first category with the New button.' : 'Pick a category.'}
        </p>
      )}

      <CreateCategoryDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={setSelectedId}
        nextOrder={all.length}
      />
    </main>
  )
}
