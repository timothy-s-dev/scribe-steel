import './sentry'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/queryClient'
import './index.css'
import App from '@/App'
import { AuthProvider } from '@/contexts/AuthContext'
import { Toaster } from '@/components/ui/sonner'
import { StorageNotice } from '@/components/StorageNotice'

// In mock-drive builds only, expose the QueryClient so E2E tests can drive
// cache state (simulate a remote change arriving, force a refetch, etc.)
// without having to poke TanStack Query's internals through its real APIs.
if (import.meta.env.VITE_USE_MOCK_DRIVE) {
  (window as unknown as { __queryClient: typeof queryClient }).__queryClient = queryClient;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
        <Toaster position="bottom-center" />
        <StorageNotice />
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>,
)
