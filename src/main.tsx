import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './lib/auth.tsx'

// Share-target lands on index.html?title=…&text=…&url=… (real query params,
// because GitHub Pages can only serve real files). Move them into the hash
// route before the router boots.
const searchParams = new URLSearchParams(window.location.search)
if (searchParams.has('url') || searchParams.has('text') || searchParams.has('title')) {
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}#/share?${searchParams.toString()}`,
  )
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
