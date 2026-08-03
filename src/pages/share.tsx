import { ArrowLeft, Check, ClipboardPaste, ExternalLink, Loader2, Plus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCategories, useCreateCategory, useCreateImage } from '@/hooks/queries'
import {
  extractFirstUrl,
  isPinterestShortLink,
  resolveUrl,
  testImageReachable,
  type ResolvedImage,
} from '@/lib/url-processing'
import { cn } from '@/lib/utils'

type Status =
  | { kind: 'idle' }
  | { kind: 'resolving' }
  | { kind: 'resolved'; image: ResolvedImage }
  | { kind: 'shortlink'; url: string }
  | { kind: 'error'; message: string }
  | { kind: 'saved'; categoryName: string; categoryId: string }

export function SharePage() {
  const [params] = useSearchParams()
  const { data: categories } = useCategories()
  const createImage = useCreateImage()
  const createCategory = useCreateCategory()

  const sharedText = [params.get('url'), params.get('text'), params.get('title')]
    .filter(Boolean)
    .join(' ')
  const initialUrl = extractFirstUrl(sharedText) ?? ''

  const [url, setUrl] = useState(initialUrl)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [categoryId, setCategoryId] = useState('')
  const [creatingNew, setCreatingNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('')
  const [saving, setSaving] = useState(false)

  const activeCategories = (categories ?? []).filter((category) => !category.archived)

  const resolve = useCallback(async (candidate: string) => {
    const trimmed = extractFirstUrl(candidate) ?? candidate.trim()
    if (!trimmed) return
    setUrl(trimmed)
    if (isPinterestShortLink(trimmed)) {
      setStatus({ kind: 'shortlink', url: trimmed })
      return
    }
    setStatus({ kind: 'resolving' })
    try {
      const resolved = await resolveUrl(trimmed)
      if (!resolved.resolved || !(await testImageReachable(resolved.imageUrl))) {
        setStatus({
          kind: 'error',
          message: 'Could not extract a working image from that link.',
        })
        return
      }
      setStatus({ kind: 'resolved', image: resolved })
    } catch (cause) {
      setStatus({
        kind: 'error',
        message: cause instanceof Error ? cause.message : 'Could not resolve that link.',
      })
    }
  }, [])

  // Auto-resolve whatever the share sheet handed us.
  useEffect(() => {
    if (initialUrl) void resolve(initialUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) void resolve(text)
    } catch {
      // Clipboard permission denied — user can paste into the input manually.
    }
  }

  const canSave =
    status.kind === 'resolved' && (creatingNew ? newName.trim().length > 0 : categoryId !== '')

  const save = async () => {
    if (status.kind !== 'resolved' || saving) return
    setSaving(true)
    try {
      let targetId = categoryId
      let targetName = activeCategories.find((entry) => entry.id === categoryId)?.name ?? ''
      if (creatingNew) {
        targetId = await createCategory.mutateAsync({
          name: newName.trim(),
          emoji: newEmoji.trim(),
          order: categories?.length ?? 0,
        })
        targetName = newName.trim()
      }
      await createImage.mutateAsync({
        categoryId: targetId,
        imageUrl: status.image.imageUrl,
        sourceUrl: status.image.sourceUrl,
        title: status.image.title,
      })
      setStatus({ kind: 'saved', categoryName: targetName, categoryId: targetId })
    } catch (cause) {
      setStatus({
        kind: 'error',
        message: cause instanceof Error ? cause.message : 'Saving failed.',
      })
    } finally {
      setSaving(false)
    }
  }

  if (status.kind === 'saved') {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center gap-6 p-6 text-center">
        <p className="text-6xl">✅</p>
        <p className="text-lg">
          Saved to <span className="font-semibold">{status.categoryName}</span>
        </p>
        <div className="flex flex-col gap-3">
          <Button
            size="lg"
            onClick={() => {
              setUrl('')
              setStatus({ kind: 'idle' })
              setCategoryId(status.categoryId)
              setCreatingNew(false)
            }}
          >
            <Plus /> Add another
          </Button>
          <Link to="/" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            Done
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
        <h1 className="text-xl font-semibold">Add to Inbi Decides</h1>
      </header>

      <div className="flex flex-col gap-2">
        <Label htmlFor="share-url">Link</Label>
        <div className="flex gap-2">
          <Input
            id="share-url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onBlur={() => void resolve(url)}
            onPaste={(event) => void resolve(event.clipboardData.getData('text'))}
            placeholder="https://www.pinterest.com/pin/…"
            autoFocus={!initialUrl}
          />
          <Button
            variant="outline"
            size="icon"
            aria-label="Paste from clipboard"
            onClick={() => void pasteFromClipboard()}
          >
            <ClipboardPaste />
          </Button>
        </div>
      </div>

      {status.kind === 'resolving' && (
        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" /> Fetching image…
        </div>
      )}

      {status.kind === 'shortlink' && (
        <div className="flex flex-col gap-3 rounded-xl border p-4 text-sm">
          <p>
            That's a Pinterest share link, which hides the actual pin. One extra hop needed:
          </p>
          <a
            href={status.url}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: 'outline' })}
          >
            <ExternalLink /> Open the pin in the browser
          </a>
          <p className="text-muted-foreground">
            …then share it again from the browser (or copy the address and paste it here).
          </p>
        </div>
      )}

      {status.kind === 'error' && <p className="text-sm text-destructive">{status.message}</p>}

      {status.kind === 'resolved' && (
        <>
          <img
            src={status.image.imageUrl}
            alt={status.image.title}
            className="max-h-[40dvh] w-full rounded-xl bg-muted object-contain"
          />
          {status.image.title && (
            <p className="truncate text-center text-sm text-muted-foreground">
              {status.image.title}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <Label>Category</Label>
            <div className="flex flex-wrap gap-2">
              {activeCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    setCategoryId(category.id)
                    setCreatingNew(false)
                  }}
                  className={cn(
                    'rounded-full border px-3.5 py-2 text-sm font-medium transition-colors',
                    categoryId === category.id && !creatingNew
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'bg-background hover:bg-accent',
                  )}
                >
                  {`${category.emoji} ${category.name}`.trim()}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCreatingNew(true)}
                className={cn(
                  'flex items-center gap-1 rounded-full border border-dashed px-3.5 py-2 text-sm font-medium transition-colors',
                  creatingNew
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <Plus className="size-4" /> New
              </button>
            </div>
          </div>

          {creatingNew && (
            <div className="flex gap-2">
              <div className="w-20">
                <Label htmlFor="share-new-emoji" className="sr-only">
                  Emoji
                </Label>
                <Input
                  id="share-new-emoji"
                  value={newEmoji}
                  onChange={(event) => setNewEmoji(event.target.value)}
                  placeholder="🏠"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="share-new-name" className="sr-only">
                  Name
                </Label>
                <Input
                  id="share-new-name"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="New category name"
                  autoFocus
                />
              </div>
            </div>
          )}

          <Button size="lg" disabled={!canSave || saving} onClick={() => void save()}>
            {saving ? <Loader2 className="animate-spin" /> : <Check />}
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </>
      )}
    </main>
  )
}
