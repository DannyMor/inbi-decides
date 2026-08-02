import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminPage } from '@/pages/admin'
import { GalleryPage } from '@/pages/gallery'
import { HomePage } from '@/pages/home'
import { LoginPage } from '@/pages/login'
import { VotingPage } from '@/pages/voting'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/lib/auth'

function App() {
  const { user, role, loading, isAdmin } = useAuth()

  if (loading) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-4 p-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </main>
    )
  }

  if (!user) return <LoginPage />

  if (!role) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-4xl">🔒</p>
        <h1 className="text-xl font-semibold">Almost there</h1>
        <p className="max-w-sm text-muted-foreground">
          Your account has no role yet. Ask the admin to add a document for your user in the
          Firestore <code>users</code> collection with <code>role: "voter"</code>.
        </p>
      </main>
    )
  }

  // HashRouter keeps deep links working on GitHub Pages without a 404 hack.
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/vote/:categoryId" element={<VotingPage />} />
        <Route path="/gallery/:categoryId" element={<GalleryPage />} />
        <Route path="/admin" element={isAdmin ? <AdminPage /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}

export default App
