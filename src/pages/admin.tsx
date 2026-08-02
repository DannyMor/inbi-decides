import { zodResolver } from '@hookform/resolvers/zod'
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  CheckCircle2,
  Images,
  Loader2,
  Plus,
  Trash2,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  useCategories,
  useCreateCategory,
  useCreateImage,
  useDeleteCategory,
  useUpdateCategory,
} from '@/hooks/queries'
import { resolveUrl, splitUrlList } from '@/lib/url-processing'
import {
  importFormSchema,
  newCategoryFormSchema,
  type ImportForm,
  type NewCategoryForm,
} from '@/lib/types'

interface ImportResult {
  url: string
  title: string
  resolved: boolean
  error?: string
}

function CreateCategorySection() {
  const { data: categories } = useCategories()
  const createCategory = useCreateCategory()
  const form = useForm<NewCategoryForm>({
    resolver: zodResolver(newCategoryFormSchema),
    defaultValues: { name: '', emoji: '' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    await createCategory.mutateAsync({
      name: values.name,
      emoji: values.emoji ?? '',
      order: categories?.length ?? 0,
    })
    form.reset()
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Category</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="w-20">
              <Label htmlFor="category-emoji" className="sr-only">
                Emoji
              </Label>
              <Input id="category-emoji" placeholder="🏠" {...form.register('emoji')} />
            </div>
            <div className="flex-1">
              <Label htmlFor="category-name" className="sr-only">
                Name
              </Label>
              <Input id="category-name" placeholder="Kitchen" {...form.register('name')} />
            </div>
            <Button type="submit" disabled={createCategory.isPending} aria-label="Add category">
              <Plus />
            </Button>
          </div>
          {form.formState.errors.name && (
            <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

function ImportSection() {
  const { data: categories } = useCategories()
  const createImage = useCreateImage()
  const [results, setResults] = useState<ImportResult[]>([])
  const [importing, setImporting] = useState(false)
  const form = useForm<ImportForm>({
    resolver: zodResolver(importFormSchema),
    defaultValues: { categoryId: '', urls: '' },
  })

  const activeCategories = (categories ?? []).filter((category) => !category.archived)

  const onSubmit = form.handleSubmit(async (values) => {
    const urls = splitUrlList(values.urls)
    if (urls.length === 0) {
      form.setError('urls', { message: 'No valid http(s) URLs found' })
      return
    }
    setImporting(true)
    setResults([])
    const nextResults: ImportResult[] = []
    for (const url of urls) {
      try {
        const resolved = await resolveUrl(url)
        await createImage.mutateAsync({
          categoryId: values.categoryId,
          imageUrl: resolved.imageUrl,
          sourceUrl: resolved.sourceUrl,
          title: resolved.title,
        })
        nextResults.push({ url, title: resolved.title, resolved: resolved.resolved })
      } catch (cause) {
        nextResults.push({
          url,
          title: '',
          resolved: false,
          error: cause instanceof Error ? cause.message : 'Failed to save',
        })
      }
      setResults([...nextResults])
    }
    setImporting(false)
    form.resetField('urls')
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="import-category">Category</Label>
            <Select id="import-category" {...form.register('categoryId')}>
              <option value="">Pick a category…</option>
              {activeCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {`${category.emoji} ${category.name}`.trim()}
                </option>
              ))}
            </Select>
            {form.formState.errors.categoryId && (
              <p className="text-sm text-destructive">{form.formState.errors.categoryId.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="import-urls">URLs — one per line</Label>
            <Textarea
              id="import-urls"
              rows={5}
              placeholder={'https://www.pinterest.com/pin/…\nhttps://i.pinimg.com/…jpg'}
              {...form.register('urls')}
            />
            {form.formState.errors.urls && (
              <p className="text-sm text-destructive">{form.formState.errors.urls.message}</p>
            )}
          </div>
          <Button type="submit" disabled={importing}>
            {importing ? <Loader2 className="animate-spin" /> : <Images />}
            {importing ? 'Importing…' : 'Save'}
          </Button>
        </form>

        {results.length > 0 && (
          <ul className="mt-4 flex flex-col gap-2">
            {results.map((result) => (
              <li key={result.url} className="flex items-start gap-2 text-sm">
                {result.error ? (
                  <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                ) : (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600" />
                )}
                <span className="min-w-0">
                  <span className="block truncate font-medium">{result.title || result.url}</span>
                  {result.error && <span className="text-destructive">{result.error}</span>}
                  {!result.error && !result.resolved && (
                    <span className="text-muted-foreground">
                      Could not extract an image — saved the page URL, edit it later.
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function ManageCategoriesSection() {
  const { data: categories } = useCategories()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Categories</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {(categories ?? []).map((category) => (
          <div key={category.id} className="flex items-center justify-between gap-2 rounded-md border p-3">
            <span className={category.archived ? 'text-muted-foreground line-through' : ''}>
              {`${category.emoji} ${category.name}`.trim()}
            </span>
            <span className="flex gap-1">
              <Link to={`/gallery/${category.id}`} aria-label={`${category.name} gallery`}>
                <Button variant="ghost" size="icon">
                  <Images />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                aria-label={category.archived ? 'Unarchive category' : 'Archive category'}
                onClick={() =>
                  updateCategory.mutate({
                    id: category.id,
                    patch: { archived: !category.archived },
                  })
                }
              >
                {category.archived ? <ArchiveRestore /> : <Archive />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Delete category"
                className="text-destructive"
                onClick={() => {
                  if (confirmDeleteId !== category.id) {
                    setConfirmDeleteId(category.id)
                    return
                  }
                  deleteCategory.mutate(category.id)
                  setConfirmDeleteId(null)
                }}
              >
                <Trash2 />
              </Button>
            </span>
            {confirmDeleteId === category.id && (
              <span className="text-xs text-destructive">Tap again to delete</span>
            )}
          </div>
        ))}
        {(categories ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No categories yet.</p>
        )}
      </CardContent>
    </Card>
  )
}

export function AdminPage() {
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
      <CreateCategorySection />
      <ImportSection />
      <ManageCategoriesSection />
      <p className="pb-4 text-center text-xs text-muted-foreground">
        Manage images from each category&apos;s gallery — tap an image to edit, archive, or delete.
      </p>
    </main>
  )
}
