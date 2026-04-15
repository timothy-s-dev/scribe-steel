import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from '@/App'
import { AuthProvider } from '@/contexts/AuthContext'
import { StorageProvider } from '@/contexts/StorageContext'
import { Toaster } from '@/components/ui/sonner'
import { StorageNotice } from '@/components/StorageNotice'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <StorageProvider>
        <App />
        <Toaster position="bottom-center" />
        <StorageNotice />
      </StorageProvider>
    </AuthProvider>
  </StrictMode>,
)
