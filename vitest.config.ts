import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify('test'),
    __APP_COMMIT__: JSON.stringify('test'),
    __APP_BUILD_TIME__: JSON.stringify('1970-01-01T00:00:00Z'),
    __APP_COMMITS_SINCE_TAG__: JSON.stringify(0),
    __APP_DIRTY__: JSON.stringify(false),
    __APP_REPO_URL__: JSON.stringify(''),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    // Playwright E2E specs live in e2e/ and run via `npm run test:e2e`.
    exclude: ['node_modules', 'dist', 'e2e'],
  },
});
