// Module-level observable for "the user's Drive auth expired mid-session."
// useAutoSave reports this when a save fails with a 401; the app-level
// SessionExpiryDialog subscribes so it can surface a modal across any
// editor without needing per-page wiring.

type Listener = (expired: boolean) => void;

let expired = false;
let listeners: Listener[] = [];

export function reportSessionExpired(): void {
  if (expired) return;
  expired = true;
  listeners.forEach((fn) => fn(true));
}

export function clearSessionExpired(): void {
  if (!expired) return;
  expired = false;
  listeners.forEach((fn) => fn(false));
}

export function isSessionExpired(): boolean {
  return expired;
}

export function onSessionExpiryChange(fn: Listener): () => void {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}
