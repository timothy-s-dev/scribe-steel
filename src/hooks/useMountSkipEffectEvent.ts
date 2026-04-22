import { useEffect, useEffectEvent, useRef, type DependencyList } from 'react';

/**
 * Like `useEffect`, but:
 *   - The callback is wrapped with `useEffectEvent`, so it reads the latest
 *     closure on every run. Only list *value* deps that should trigger a run;
 *     callbacks and other "latest" references do not need to be listed.
 *   - Does not run on mount. The first invocation fires when `deps` next
 *     change, not at the initial commit.
 *
 * Useful for propagating state up to a parent without emitting the initial
 * value on mount, and without needing the parent to memoize its callback.
 */
export function useMountSkipEffectEvent(fn: () => void, deps: DependencyList) {
  const run = useEffectEvent(fn);
  const firstRef = useRef(true);

  // `deps` is forwarded to useEffect as-is; the linter can't statically
  // verify a variable deps list, but that's the caller's responsibility.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false;
      return;
    }
    run();
  }, deps);
  /* eslint-enable react-hooks/exhaustive-deps */
}
