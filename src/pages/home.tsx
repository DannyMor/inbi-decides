import { Check, LogOut, Plus, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/lib/auth'
import { useCategories, useNewCount } from '@/hooks/queries'
import type { Category } from '@/lib/types'

function CategoryRow({ category }: { category: Category }) {
  const { data: newCount, isLoading } = useNewCount(category.id)

  return (
    <Link to={`/vote/${category.id}`}>
      <Card className="transition-colors hover:bg-accent">
        <CardContent className="flex items-center justify-between p-5">
          <span className="text-lg font-medium">
            {category.emoji && <span className="mr-2">{category.emoji}</span>}
            {category.name}
          </span>
          {isLoading ? (
            <Skeleton className="h-6 w-16" />
          ) : newCount && newCount > 0 ? (
            <Badge>{newCount} new</Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              0 <Check className="size-3" />
            </Badge>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

export function HomePage() {
  const { isAdmin, signOut } = useAuth()
  const { data: categories, isLoading } = useCategories()
  const visible = (categories ?? []).filter((category) => !category.archived)

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-4 p-4">
      <header className="flex items-center justify-between py-2">
        <h1 className="text-2xl font-bold">Inbi Decides</h1>
        <div className="flex gap-1">
          {isAdmin && (
            <Link to="/admin" aria-label="Admin">
              <Button variant="ghost" size="icon">
                <Settings />
              </Button>
            </Link>
          )}
          <Button variant="ghost" size="icon" aria-label="Sign out" onClick={() => void signOut()}>
            <LogOut />
          </Button>
        </div>
      </header>

      {isLoading && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {!isLoading && visible.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="text-4xl">🗂️</p>
          <p className="text-muted-foreground">No categories yet.</p>
          {isAdmin && (
            <Link to="/admin">
              <Button>Create the first category</Button>
            </Link>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {visible.map((category) => (
          <CategoryRow key={category.id} category={category} />
        ))}
      </div>

      {isAdmin && (
        <Link
          to="/share"
          aria-label="Add an image"
          className="fixed bottom-6 right-6 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-90"
        >
          <Plus className="size-7" />
        </Link>
      )}
    </main>
  )
}
