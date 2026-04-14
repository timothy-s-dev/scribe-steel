/// <reference path="./gis.d.ts" />

const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

type Listener = (token: string | null) => void;

let accessToken: string | null = null;
let tokenClient: TokenClient | null = null;
let listeners: Listener[] = [];
let expiryTimer: ReturnType<typeof setTimeout> | undefined;

function notify() {
  for (const fn of listeners) fn(accessToken);
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
      // Try silent refresh
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
        notify();
        return;
      }
      accessToken = response.access_token;
      scheduleExpiry(response.expires_in);
      notify();
    },
    error_callback: () => {
      accessToken = null;
      notify();
    },
  });
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
