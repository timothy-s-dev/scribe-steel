import type { TokenClient } from './gis';
import { reportSessionExpired } from './session-expiry';

const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
const TOKEN_KEY = 'scribe-steel-auth-token';

type Listener = (token: string | null) => void;

interface StoredToken {
  accessToken: string;
  expiresAt: number; // unix ms
}

let accessToken: string | null = null;
let tokenClient: TokenClient | null = null;
let listeners: Listener[] = [];
let expiryTimer: ReturnType<typeof setTimeout> | undefined;

function notify() {
  for (const fn of listeners) fn(accessToken);
}

// Dev-only knob. Set localStorage["scribe-steel-dev-token-ttl-seconds"] to a
// number (e.g. "120") to clamp how long we treat a newly-issued token as
// valid, so the scheduleExpiry → silent-refresh cycle happens in minutes
// instead of an hour. The token on Google's side still lives its full
// lifetime; we just pretend it doesn't. Below ~90s stops being useful —
// loadPersistedToken's 60s grace window starts dropping tokens on reload.
function effectiveExpiresIn(serverExpiresIn: number): number {
  if (!import.meta.env.DEV) return serverExpiresIn;
  const raw = localStorage.getItem('scribe-steel-dev-token-ttl-seconds');
  if (!raw) return serverExpiresIn;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return serverExpiresIn;
  return Math.min(n, serverExpiresIn);
}

function persistToken(token: string, expiresIn: number) {
  const data: StoredToken = {
    accessToken: token,
    expiresAt: Date.now() + expiresIn * 1000,
  };
  localStorage.setItem(TOKEN_KEY, JSON.stringify(data));
}

function loadPersistedToken(): string | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const data: StoredToken = JSON.parse(raw);
    // Consider expired if less than 60s remaining
    if (data.expiresAt - Date.now() < 60_000) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return data.accessToken;
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
}

function clearPersistedToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function waitForGis(): Promise<void> {
  if (typeof google !== 'undefined') return Promise.resolve();
  return new Promise((resolve) => {
    const check = () => {
      if (typeof google !== 'undefined') resolve();
      else setTimeout(check, 100);
    };
    check();
  });
}

function scheduleExpiry(expiresIn: number) {
  clearTimeout(expiryTimer);
  // Refresh 60s before actual expiry
  const ms = (expiresIn - 60) * 1000;
  if (ms > 0) {
    expiryTimer = setTimeout(() => {
      tokenClient?.requestAccessToken({ prompt: 'none' });
    }, ms);
  }
}

export async function initAuth(): Promise<void> {
  if (!CLIENT_ID) return;
  await waitForGis();
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (response) => {
      if (response.error) {
        // If we had a token a moment ago and a silent refresh just failed,
        // surface the session-expired modal. First-time sign-in cancels
        // (no prior token) stay quiet.
        const wasSignedIn = !!accessToken;
        accessToken = null;
        clearPersistedToken();
        if (wasSignedIn) reportSessionExpired();
        notify();
        return;
      }
      accessToken = response.access_token;
      const ttl = effectiveExpiresIn(response.expires_in);
      persistToken(response.access_token, ttl);
      scheduleExpiry(ttl);
      notify();
    },
    error_callback: () => {
      const wasSignedIn = !!accessToken;
      accessToken = null;
      clearPersistedToken();
      if (wasSignedIn) reportSessionExpired();
      notify();
    },
  });

  // Restore token from localStorage if still valid
  const restored = loadPersistedToken();
  if (restored) {
    accessToken = restored;
    // Schedule refresh based on remaining time
    const raw = localStorage.getItem(TOKEN_KEY);
    if (raw) {
      const data: StoredToken = JSON.parse(raw);
      const remainingSec = Math.floor((data.expiresAt - Date.now()) / 1000);
      scheduleExpiry(effectiveExpiresIn(remainingSec));
    }
    notify();
  }
}

export function signIn(): void {
  tokenClient?.requestAccessToken({ prompt: 'consent' });
}

export function signOut(): void {
  if (accessToken) {
    google.accounts.oauth2.revoke(accessToken);
  }
  clearTimeout(expiryTimer);
  accessToken = null;
  clearPersistedToken();
  notify();
}

// Drop the local token without revoking it — for the case where Drive has
// rejected our token server-side (e.g. 401 on save). Lets the sign-in flow
// transition isSignedIn false → true so retries fire.
export function invalidateToken(): void {
  clearTimeout(expiryTimer);
  accessToken = null;
  clearPersistedToken();
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
  return !!CLIENT_ID;
}

// Dev-only: open the console and run `__scribeExpireSession()` to simulate
// a silent-refresh failure. Mirrors the error_callback path exactly so
// you can reproduce the session-expired modal on demand.
declare global {
  interface Window {
    __scribeExpireSession?: () => void;
  }
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__scribeExpireSession = () => {
    const wasSignedIn = !!accessToken;
    clearTimeout(expiryTimer);
    accessToken = null;
    clearPersistedToken();
    if (wasSignedIn) reportSessionExpired();
    notify();
  };
}
