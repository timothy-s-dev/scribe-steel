import type { TokenClient } from './gis';

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
        accessToken = null;
        clearPersistedToken();
        notify();
        return;
      }
      accessToken = response.access_token;
      persistToken(response.access_token, response.expires_in);
      scheduleExpiry(response.expires_in);
      notify();
    },
    error_callback: () => {
      accessToken = null;
      clearPersistedToken();
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
      scheduleExpiry(remainingSec);
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
