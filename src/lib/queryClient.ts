import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

export function clearCache(): void {
  queryClient.clear();
}

// Expose for dev-time debugging / smoke tests (e.g., forcing refetches from
// the browser console). Only enabled in development builds.
if (import.meta.env.DEV) {
  (window as unknown as { __queryClient: QueryClient }).__queryClient = queryClient;
}
