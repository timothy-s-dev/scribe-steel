import path from 'path'
import { execSync } from 'node:child_process'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'

function resolveVersion(): string {
  try {
    return execSync(
      "git describe --tags --match 'v[0-9]*' --always --dirty",
      { encoding: 'utf8' },
    )
      .trim()
      .replace(/^v/, '')
  } catch {
    return '0.0.0-dev'
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const useMockDrive = env.VITE_USE_MOCK_DRIVE === '1' || env.VITE_USE_MOCK_DRIVE === 'true'

  // Mock aliases must come before the '@' catch-all — Vite uses first match.
  const mockAliases: Record<string, string> = useMockDrive
    ? {
        '@/services/google-auth': path.resolve(__dirname, './src/services/google-auth.mock.ts'),
        '@/services/google-drive': path.resolve(__dirname, './src/services/google-drive.mock.ts'),
      }
    : {}

  const version = resolveVersion()

  const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN
  const sentryOrg = process.env.SENTRY_ORG
  const sentryProject = process.env.SENTRY_PROJECT
  const sentryEnabled = Boolean(sentryAuthToken && sentryOrg && sentryProject)

  return {
    define: {
      __APP_VERSION__: JSON.stringify(version),
    },
    build: {
      // Only emit source maps when we're uploading them to Sentry — otherwise
      // they'd ship to Firebase Hosting as dead weight.
      sourcemap: sentryEnabled,
    },
    plugins: [
      react(),
      tailwindcss(),
      sentryVitePlugin({
        org: sentryOrg,
        project: sentryProject,
        authToken: sentryAuthToken,
        disable: !sentryEnabled,
        release: { name: `scribe-steel@${version}` },
        sourcemaps: {
          filesToDeleteAfterUpload: ['./dist/**/*.map'],
        },
      }),
    ],
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
