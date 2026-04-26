import { reportSessionExpired } from './session-expiry';

const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
const CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET as string;

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke';

const TOKEN_KEY = 'scribe-steel-auth-token';
// PKCE verifier + state are stashed in sessionStorage between the
// authorization request and the token exchange. sessionStorage is
// per-tab and clears on tab close, which is the right scope: the
// verifier is single-use, never needs to outlive the popup round-trip,
// and we don't want it lingering across browser sessions.
const PKCE_KEY = 'scribe-steel-pkce-flow';
// BroadcastChannel name used by the popup's /auth/callback page to
// deliver the authorization code back to the opener. We use a channel
// instead of window.opener.postMessage because COOP on accounts.google.com
// severs the popup-opener relationship during the auth round-trip — once
// the popup navigates back to /auth/callback, window.opener is null in
// production. BroadcastChannel is same-origin-only by spec and survives
// COOP severance.
const CHANNEL_NAME = 'scribe-steel-oauth';

// Fire the session-expired modal this many seconds before the token's
// actual expiry, so the user is alerted before any save would have hit
// a 401. Bigger buffer = friendlier proactive notification at the cost
// of a slightly shorter usable window per token.
const EXPIRY_BUFFER_SECONDS = 30;

type Listener = (token: string | null) => void;

interface StoredToken {
  accessToken: string;
  expiresAt: number; // unix ms
}

interface PkceFlow {
  verifier: string;
  state: string;
}

interface CallbackPayload {
  code: string | null;
  state: string | null;
  error: string | null;
}

let accessToken: string | null = null;
let listeners: Listener[] = [];
let expiryTimer: ReturnType<typeof setTimeout> | undefined;

function notify() {
  for (const fn of listeners) fn(accessToken);
}

// Dev-only knob. Set localStorage["scribe-steel-dev-token-ttl-seconds"] to a
// number (e.g. "120") to clamp how long we treat a newly-issued token as
// valid, so the proactive-expiry modal fires in minutes instead of an hour.
// The token on Google's side still lives its full lifetime; we just pretend
// it doesn't. Below ~90s stops being useful — loadPersistedToken's grace
// window starts dropping tokens on reload.
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

function loadPersistedToken(): { token: string; remainingSec: number } | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const data: StoredToken = JSON.parse(raw);
    const remainingMs = data.expiresAt - Date.now();
    // Drop anything within the buffer window — too close to expiry to be
    // worth using; the proactive-expiry timer would fire immediately.
    if (remainingMs < EXPIRY_BUFFER_SECONDS * 1000) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return { token: data.accessToken, remainingSec: Math.floor(remainingMs / 1000) };
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
}

function clearPersistedToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function scheduleExpiry(expiresIn: number) {
  clearTimeout(expiryTimer);
  // Fire the modal `EXPIRY_BUFFER_SECONDS` before actual expiry. Without
  // a backend we can't silently refresh (X-Frame-Options blocks
  // accounts.google.com from being iframed), so the timer's job is to
  // proactively prompt the user — not to renew silently.
  const ms = (expiresIn - EXPIRY_BUFFER_SECONDS) * 1000;
  if (ms > 0) {
    expiryTimer = setTimeout(() => {
      const wasSignedIn = !!accessToken;
      accessToken = null;
      clearPersistedToken();
      if (wasSignedIn) reportSessionExpired();
      notify();
    }, ms);
  }
}

// ── PKCE helpers ────────────────────────────────────────────────────────────

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomString(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function generatePkce(): Promise<{ verifier: string; challenge: string }> {
  // RFC 7636 says the verifier should be 43-128 unreserved chars; 32 random
  // bytes base64url-encoded is 43 chars, the minimum that still gives a
  // healthy 256 bits of entropy.
  const verifier = randomString(32);
  const challengeBytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier),
  );
  const challenge = base64UrlEncode(new Uint8Array(challengeBytes));
  return { verifier, challenge };
}

function redirectUri(): string {
  return `${window.location.origin}/auth/callback`;
}

function savePkceFlow(flow: PkceFlow): void {
  sessionStorage.setItem(PKCE_KEY, JSON.stringify(flow));
}

function loadPkceFlow(): PkceFlow | null {
  try {
    const raw = sessionStorage.getItem(PKCE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PkceFlow;
  } catch {
    return null;
  }
}

function clearPkceFlow(): void {
  sessionStorage.removeItem(PKCE_KEY);
}

// ── Popup lifecycle ─────────────────────────────────────────────────────────

// Cancellation hook for the in-flight sign-in flow, if any. Calling it
// tears down the previous flow's listener + timer and closes its popup.
// We set this on every signIn so that a second click (whether a true
// double-click or the user clicking again after walking away from an
// abandoned popup) replaces the old flow cleanly instead of stacking
// listeners.
let cancelCurrentFlow: (() => void) | null = null;

// How long we wait for a postMessage from the callback before treating
// the flow as abandoned. Generous because users sometimes pause mid-flow
// (consent screen, account picker, password manager). Shorter than this
// just leaks the listener and the PKCE verifier in sessionStorage; both
// are cheap, so erring long is fine.
const POPUP_TIMEOUT_MS = 5 * 60 * 1000;

function isCallbackPayload(data: unknown): data is CallbackPayload {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  return ('code' in d) && ('state' in d) && ('error' in d);
}

// Best-effort popup close. Cross-Origin-Opener-Policy on accounts.google.com
// can make `popup.close()` throw or silently no-op while the popup is on
// Google's pages; once it's redirected back to our /auth/callback the page
// closes itself anyway, so this is just for the abandon path.
function tryClosePopup(popup: Window): void {
  try { popup.close(); } catch { /* COOP-blocked or already-closed */ }
}

async function openSignInPopup(): Promise<void> {
  // Replace any in-flight flow. The user clicking Sign In is a clear
  // "open a fresh popup" intent — we can't reliably detect whether an
  // earlier popup was abandoned (COOP makes `popup.closed` polling
  // unreliable on cross-origin pages), so we just always start clean.
  if (cancelCurrentFlow) cancelCurrentFlow();

  const { verifier, challenge } = await generatePkce();
  const state = randomString(32);
  savePkceFlow({ verifier, state });

  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('redirect_uri', redirectUri());
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  // include_granted_scopes lets returning users consent incrementally
  // rather than re-confirming everything; harmless when only drive.file
  // is ever requested.
  url.searchParams.set('include_granted_scopes', 'true');

  const width = 480;
  const height = 640;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;
  const features = `width=${width},height=${height},left=${left},top=${top}`;

  const popup = window.open(url.toString(), 'scribe-steel-google-auth', features);
  if (!popup) {
    clearPkceFlow();
    throw new Error('Sign-in popup was blocked. Please allow popups for this site.');
  }

  return new Promise<void>((resolve, reject) => {
    const channel = new BroadcastChannel(CHANNEL_NAME);

    const onMessage = async (event: MessageEvent) => {
      if (!isCallbackPayload(event.data)) return;
      const payload = event.data;

      // Filter by state — multiple tabs could be listening on the same
      // channel simultaneously, but only the tab whose flow this message
      // belongs to should consume it.
      const flow = loadPkceFlow();
      if (!flow || payload.state !== flow.state) return;

      cleanup();

      if (payload.error) {
        clearPkceFlow();
        reject(new Error(`OAuth error: ${payload.error}`));
        return;
      }

      clearPkceFlow();
      if (!payload.code) {
        reject(new Error('OAuth flow returned no code. Please try signing in again.'));
        return;
      }

      try {
        const tokenResponse = await exchangeCode(payload.code, flow.verifier);
        accessToken = tokenResponse.access_token;
        const ttl = effectiveExpiresIn(tokenResponse.expires_in);
        persistToken(tokenResponse.access_token, ttl);
        scheduleExpiry(ttl);
        notify();
        resolve();
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };

    // Backstop for the abandoned-popup case: if no message arrives within
    // POPUP_TIMEOUT_MS, give up silently. Treated as soft cancel — same
    // as the user closing the popup intentionally.
    const timeoutHandle = setTimeout(() => {
      cleanup();
      clearPkceFlow();
      tryClosePopup(popup);
      resolve();
    }, POPUP_TIMEOUT_MS);

    const cleanup = () => {
      channel.removeEventListener('message', onMessage);
      channel.close();
      clearTimeout(timeoutHandle);
      cancelCurrentFlow = null;
    };

    cancelCurrentFlow = () => {
      cleanup();
      clearPkceFlow();
      tryClosePopup(popup);
      resolve();
    };

    channel.addEventListener('message', onMessage);
  });
}

async function exchangeCode(code: string, verifier: string): Promise<{
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}> {
  const body = new URLSearchParams({
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code_verifier: verifier,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri(),
  });
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }
  return await res.json();
}

// ── Public API (interface unchanged from the prior GIS-based module) ────────

export async function initAuth(): Promise<void> {
  if (!CLIENT_ID || !CLIENT_SECRET) return;

  const restored = loadPersistedToken();
  if (restored) {
    accessToken = restored.token;
    scheduleExpiry(effectiveExpiresIn(restored.remainingSec));
    notify();
  }
}

export function signIn(): void {
  void openSignInPopup().catch((err) => {
    // Surface as a session-expired prompt (the modal that already exists)
    // so the user has a clear next action; the alternative would be a
    // toast or console error neither of which is wired up here.
    console.error('Sign-in failed:', err);
    if (accessToken) {
      // We had a token a moment ago and the renewal popup failed —
      // surface the modal so the user can retry from the standard place.
      const wasSignedIn = !!accessToken;
      accessToken = null;
      clearPersistedToken();
      if (wasSignedIn) reportSessionExpired();
      notify();
    }
  });
}

export function signOut(): void {
  // Best-effort revoke. We don't await because the user-facing sign-out
  // shouldn't block on a network call to Google; the local clear is what
  // matters for the session.
  if (accessToken) {
    const url = `${REVOKE_ENDPOINT}?token=${encodeURIComponent(accessToken)}`;
    void fetch(url, { method: 'POST' }).catch(() => {
      // Revoke failures are silent — token will expire naturally on
      // Google's side. Nothing useful to surface to the user.
    });
  }
  clearTimeout(expiryTimer);
  if (cancelCurrentFlow) cancelCurrentFlow();
  accessToken = null;
  clearPersistedToken();
  clearPkceFlow();
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
  return !!CLIENT_ID && !!CLIENT_SECRET;
}

// Dev-only: open the console and run `__scribeExpireSession()` to simulate
// the proactive-expiry path. Mirrors the timer fire exactly so you can
// reproduce the session-expired modal on demand without waiting an hour.
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
