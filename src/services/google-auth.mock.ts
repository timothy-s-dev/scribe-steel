// Mock replacement for google-auth.ts. Swapped in via Vite `resolve.alias` when
// VITE_USE_MOCK_DRIVE is set. The signed-in state is fully local — signIn()
// flips a flag in localStorage, no Google round-trip.

const STATE_KEY = 'scribe-steel-mock-signed-in';
const MOCK_TOKEN = 'mock-access-token';

type Listener = (token: string | null) => void;

let accessToken: string | null = null;
let listeners: Listener[] = [];

function notify() {
  for (const fn of listeners) fn(accessToken);
}

export async function initAuth(): Promise<void> {
  if (localStorage.getItem(STATE_KEY) === '1') {
    accessToken = MOCK_TOKEN;
    notify();
  }
}

export function signIn(): void {
  accessToken = MOCK_TOKEN;
  localStorage.setItem(STATE_KEY, '1');
  notify();
}

export function signOut(): void {
  accessToken = null;
  localStorage.removeItem(STATE_KEY);
  notify();
}

export function invalidateToken(): void {
  accessToken = null;
  localStorage.removeItem(STATE_KEY);
  notify();
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function onTokenChange(fn: Listener): () => void {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

export function isConfigured(): boolean {
  return true;
}
