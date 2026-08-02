import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { isFirebaseConfigured } from '@/lib/firebase'

export function LoginPage() {
  const { signIn } = useAuth()
  const [error, setError] = useState<string | null>(null)

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 p-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <Sparkles className="size-12 text-star" />
        <h1 className="text-3xl font-bold">Inbi Decides</h1>
        <p className="text-muted-foreground">Collect inspiration. Rate it. Decide together.</p>
      </div>
      {isFirebaseConfigured ? (
        <Button
          size="lg"
          onClick={() => {
            setError(null)
            signIn().catch((cause: unknown) => {
              setError(cause instanceof Error ? cause.message : 'Sign-in failed')
            })
          }}
        >
          Sign in with Google
        </Button>
      ) : (
        <p className="max-w-sm text-sm text-muted-foreground">
          Firebase is not configured. Copy <code>.env.example</code> to <code>.env.local</code> and
          fill in your Firebase project settings.
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </main>
  )
}
