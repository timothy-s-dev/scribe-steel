import { useEffect, useRef } from 'react';

// `updatedAt` is a server-stamped field that changes on every save. We
// dedupe on content, so we exclude it from the canonical key.
const META_KEYS = new Set(['updatedAt']);

function canonicalize(value: unknown): string {
  return JSON.stringify(value, (key, v) => (META_KEYS.has(key) ? undefined : v));
}

/**
 * Fires `onChange(value)` whenever `value`'s content actually changes.
 * Content is compared via a canonical JSON form (ignoring `updatedAt`),
 * so spurious reference-equality mismatches — e.g. a new wrapper object
 * created each render in an emit memo — don't propagate redundant emits.
 *
 * `onChange` identity changes don't trigger emits on their own (if the
 * value's canonical form hasn't changed, we skip).
 *
 * The first emit always fires (no previous key to compare against); the
 * save pipeline's own content check skips the network call if it matches
 * the cached document.
 */
export function useEmitOnChange<T>(value: T, onChange: (value: T) => void) {
  const lastKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const key = canonicalize(value);
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    onChange(value);
  }, [value, onChange]);
}
