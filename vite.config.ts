import path from 'path'
import { execSync } from 'node:child_process'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'

type BuildInfo = {
  tag: string
  commitsSinceTag: number
  commit: string
  buildTime: string
  dirty: boolean
  repoUrl: string
}

function parseGitHubRepoUrl(remote: string): string {
  // Accepts `git@github.com:owner/repo.git` or `https://github.com/owner/repo(.git)?`.
  const ssh = remote.match(/^git@github\.com:([^/]+\/[^/]+?)(?:\.git)?$/)
  if (ssh) return `https://github.com/${ssh[1]}`
  const https = remote.match(/^https:\/\/github\.com\/([^/]+\/[^/]+?)(?:\.git)?\/?$/)
  if (https) return `https://github.com/${https[1]}`
  return ''
}

function resolveBuildInfo(): BuildInfo {
  const run = (cmd: string) => execSync(cmd, { encoding: 'utf8' }).trim()
  const buildTime = new Date().toISOString()
  let tag = '0.0.0'
  let commitsSinceTag = 0
  let dirty = false
  try {
    // CI checkouts are inherently from a known commit; any working-tree
    // modifications during the build (npm install touching the lockfile,
    // semantic-release plugins writing files, etc.) aren't meaningful as
    // "the build doesn't match what's in git." The dirty marker is only
    // useful in local dev for catching "I rebuilt without committing."
    const inCI = process.env.CI === 'true'
    const describeCmd = inCI
      ? "git describe --tags --match 'v[0-9]*' --always"
      : "git describe --tags --match 'v[0-9]*' --always --dirty"
    const describe = run(describeCmd)
    dirty = describe.endsWith('-dirty')
    const trimmed = dirty ? describe.slice(0, -'-dirty'.length) : describe
    const match = trimmed.match(/^v?(\d+\.\d+\.\d+)(?:-(\d+)-g[0-9a-f]+)?$/)
    if (match) {
      tag = match[1]
      commitsSinceTag = match[2] ? Number(match[2]) : 0
    }
  } catch {
    /* no git — keep defaults */
  }
  let commit = ''
  try { commit = run('git rev-parse --short HEAD') } catch { /* no git */ }
  let repoUrl = ''
  try { repoUrl = parseGitHubRepoUrl(run('git config --get remote.origin.url')) } catch { /* no git */ }
  return { tag, commitsSinceTag, commit, buildTime, dirty, repoUrl }
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

  const build = resolveBuildInfo()

  const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN
  const sentryOrg = process.env.SENTRY_ORG
  const sentryProject = process.env.SENTRY_PROJECT
  const sentryEnabled = Boolean(sentryAuthToken && sentryOrg && sentryProject)

  return {
    define: {
      __APP_VERSION__: JSON.stringify(build.tag),
      __APP_COMMIT__: JSON.stringify(build.commit),
      __APP_BUILD_TIME__: JSON.stringify(build.buildTime),
      __APP_COMMITS_SINCE_TAG__: JSON.stringify(build.commitsSinceTag),
      __APP_DIRTY__: JSON.stringify(build.dirty),
      __APP_REPO_URL__: JSON.stringify(build.repoUrl),
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
        release: { name: `scribe-steel@${build.tag}` },
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
