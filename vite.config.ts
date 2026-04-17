import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import pkg from './package.json' with { type: 'json' }

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const useMockDrive = env.VITE_USE_MOCK_DRIVE === '1' || env.VITE_USE_MOCK_DRIVE === 'true'

  // Mock aliases must come before the '@' catch-all — Vite uses first match.
  const mockAliases = useMockDrive
    ? {
        '@/services/google-auth': path.resolve(__dirname, './src/services/google-auth.mock.ts'),
        '@/services/google-drive': path.resolve(__dirname, './src/services/google-drive.mock.ts'),
      }
    : {}

  return {
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      strictPort: true,
    },
    resolve: {
      alias: {
        ...mockAliases,
        '@': path.resolve(__dirname, './src'),
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', '@base-ui/react'],
      exclude: [
        '@myriaddreamin/typst-ts-web-compiler',
        '@myriaddreamin/typst-ts-renderer',
      ],
    },
  }
})
