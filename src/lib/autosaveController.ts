import { DriveError, DriveConflictError } from '@/services/google-drive';

// Plain-TS autosave state machine. Owns debounce, serialization, no-op
// suppression, transient-error backoff, conflict arbitration, and the
// auth-expiry recovery flag. Deliberately React-free so the interaction
// between these concerns is testable with fake timers and a stub save;
// useDocumentMutation is a thin adapter that wires the controller into
// the TanStack cache and component state.

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'retrying' | 'error';

export interface AutosaveConflict {
  remoteData: unknown;
  remoteMd5: string;
  remoteModifiedTime: string;
}

export interface AutosaveRetry {
  // 1-based count of failed attempts so far. The pending retry is attempt
  // `attempt + 1`.
  attempt: number;
  // Wall-clock ms (Date.now()) when the timer fires.
  nextRetryAt: number;
  lastError: string;
}

export interface AutosaveSnapshot {
  status: AutosaveStatus;
  conflict: AutosaveConflict | null;
  retry: AutosaveRetry | null;
  lastSavedAt: number | null;
  error: string | null;
}

export interface AutosaveCallbacks<T> {
  // Performs the actual save. Throws DriveError / DriveConflictError
  // on failure. Controller doesn't know or care what "save" means beyond
  // that contract.
  save: (data: T) => Promise<void>;
  // Returns the latest data the adapter wants to save. Consulted when a
  // retry timer fires or when the user signs back in after a 401, so
  // edits made during the wait window are honored.
  getLatestData: () => T | null;
  // Called on 401. Adapter uses it to clear the stored token and surface
  // the session-expiry UI. Idempotent — may be called on every 401.
  onAuthExpired: () => void;
}

export interface AutosaveControllerOptions<T> {
  debounceMs?: number;
  retryBaseMs?: number;
  retryMaxMs?: number;
  callbacks?: AutosaveCallbacks<T>;
}

const DEFAULT_DEBOUNCE_MS = 2000;
// Exponential backoff for transient (non-401, non-conflict) save failures.
// Starts at 2s and doubles up to a 60s ceiling — kept indefinite so a
// user's edits never silently sit unsaved when Drive is flaky.
const DEFAULT_RETRY_BASE_MS = 2000;
const DEFAULT_RETRY_MAX_MS = 60_000;

function canonicalize(data: unknown): string {
  return JSON.stringify(data);
}

const IDLE_SNAPSHOT: AutosaveSnapshot = {
  status: 'idle',
  conflict: null,
  retry: null,
  lastSavedAt: null,
  error: null,
};

export class AutosaveController<T extends { name: string }> {
  private callbacks: AutosaveCallbacks<T> | null;
  private readonly debounceMs: number;
  private readonly retryBaseMs: number;
  private readonly retryMaxMs: number;

  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private pending: T | null = null;
  // Guards against firing a second save while one is in flight. Concurrent
  // saves would both read the same pre-save md5 from the cache, and whichever
  // hits Drive second would see a mismatch and raise DriveConflictError.
  private saveInFlight = false;
  // Canonical form of the data we last successfully persisted (or of the
  // server-authoritative state the cache was populated with). Used to skip
  // no-op saves — we can't compare against the cache because the optimistic
  // update in the adapter has already overwritten it by the time runSave fires.
  private lastSyncedCanonical: string | null = null;
  // Set by the 401 branch; consumed by notifyAuthResumed once the user has
  // signed back in. Kept separate from `status === 'error'` so conflicts and
  // 5xxs don't trip the auth-recovery path.
  private authRetryPending = false;

  // Observable state. Cached as a stable object reference so the adapter
  // can hand it to useSyncExternalStore without triggering infinite-render
  // warnings.
  private status: AutosaveStatus = 'idle';
  private conflict: AutosaveConflict | null = null;
  private retry: AutosaveRetry | null = null;
  private lastSavedAt: number | null = null;
  private lastError: string | null = null;
  private cachedSnapshot: AutosaveSnapshot = IDLE_SNAPSHOT;

  private readonly listeners = new Set<(s: AutosaveSnapshot) => void>();

  constructor(options: AutosaveControllerOptions<T> = {}) {
    this.callbacks = options.callbacks ?? null;
    this.debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
    this.retryBaseMs = options.retryBaseMs ?? DEFAULT_RETRY_BASE_MS;
    this.retryMaxMs = options.retryMaxMs ?? DEFAULT_RETRY_MAX_MS;
  }

  // React adapters construct the controller during render (stable identity
  // via useState) but can only wire up callbacks that close over the latest
  // props from useEffect. The controller is inert (no saves can fire) until
  // setCallbacks is called, so this split is safe as long as callbacks are
  // installed before any schedule / notifyAuthResumed.
  setCallbacks(callbacks: AutosaveCallbacks<T>): void {
    this.callbacks = callbacks;
  }

  snapshot(): AutosaveSnapshot {
    return this.cachedSnapshot;
  }

  subscribe(listener: (s: AutosaveSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Seed the "last synced" canonical from the pre-edit authoritative data.
  // Adapter calls this before the optimistic cache write so we capture
  // server-authoritative state — after the write, that information is no
  // longer recoverable from the cache alone. No-op after the first seed
  // (subsequent syncs bump the canonical via runSave success).
  primeSyncedSnapshot(current: T): void {
    if (this.lastSyncedCanonical === null) {
      this.lastSyncedCanonical = canonicalize(current);
    }
  }

  schedule(data: T): void {
    // Don't schedule during a conflict — the user must resolve it first.
    if (this.conflict) return;
    this.pending = data;
    clearTimeout(this.debounceTimer);
    // A fresh user edit takes priority over any pending backoff retry —
    // cancel the retry so we don't end up with two concurrent saves racing.
    this.cancelRetry({ emit: true });
    this.debounceTimer = setTimeout(() => this.debounceFire(), this.debounceMs);
  }

  // Fire any pending save immediately, bypassing the debounce. Also cancels
  // any armed retry. The save runs async — callers shouldn't rely on it
  // having completed by the time this returns.
  flush(): void {
    clearTimeout(this.debounceTimer);
    this.cancelRetry({ emit: true });
    const pending = this.pending;
    if (pending === null) return;
    this.pending = null;
    void this.runSave(pending);
  }

  // Adapter calls this after sign-in flips back to true. If we parked a
  // save on 401, pull the latest cache data and fire it — the user may
  // have edited more while signed out (optimistic writes still land).
  notifyAuthResumed(): void {
    if (!this.authRetryPending) return;
    this.authRetryPending = false;
    const latest = this.callbacks?.getLatestData() ?? null;
    if (latest) void this.runSave(latest);
  }

  // "Use remote" path: adapter invalidates the cache so the next read pulls
  // fresh authoritative state. We just drop the conflict and arm the canonical
  // for re-seeding on the next edit.
  resolveUseRemote(): void {
    if (!this.conflict) return;
    this.conflict = null;
    this.lastSyncedCanonical = null;
    this.refreshStatus();
    this.emit();
  }

  // "Keep local" path: adapter has already bumped the cached md5 to the
  // remote's so the next save's expectedMd5 is current. We re-schedule with
  // the latest cache data.
  resolveKeepLocal(): void {
    if (!this.conflict) return;
    this.conflict = null;
    this.refreshStatus();
    this.emit();
    const latest = this.callbacks?.getLatestData() ?? null;
    if (latest) this.schedule(latest);
  }

  private debounceFire(): void {
    const pending = this.pending;
    if (pending === null) return;
    this.pending = null;
    void this.runSave(pending);
  }

  private async runSave(data: T): Promise<void> {
    // Serialize: if another save is mid-flight, queue this attempt so it
    // fires once the current one resolves. Without this, two saves would
    // both read the pre-save md5 from the cache and the second would hit
    // DriveConflictError when Drive's md5 has already moved on.
    if (this.saveInFlight) {
      this.pending = data;
      return;
    }
    // Skip no-op saves: outgoing data matches what we last synced with the
    // server. Catches reverts and Strict-Mode double invocations.
    const canonical = canonicalize(data);
    if (canonical === this.lastSyncedCanonical) return;

    this.saveInFlight = true;
    this.status = 'saving';
    this.emit();

    if (!this.callbacks) {
      // Defensive: adapters must install callbacks before any save path
      // can run. If we got here with none, fail loud rather than silently
      // dropping edits.
      this.saveInFlight = false;
      throw new Error('AutosaveController: callbacks not installed');
    }
    const { save, onAuthExpired } = this.callbacks;

    let succeeded = false;
    try {
      await save(data);
      this.lastSyncedCanonical = canonical;
      this.cancelRetry({ emit: false });
      this.lastSavedAt = Date.now();
      this.status = 'saved';
      this.lastError = null;
      succeeded = true;
    } catch (err) {
      if (err instanceof DriveConflictError) {
        this.conflict = {
          remoteData: err.remoteData,
          remoteMd5: err.remoteMd5,
          remoteModifiedTime: err.remoteModifiedTime,
        };
        this.status = 'error';
        this.lastError = err.message;
        // Conflict has its own resolution UI; don't keep retrying.
        this.cancelRetry({ emit: false });
      } else if (err instanceof DriveError && err.status === 401) {
        // Sign-out flips isSignedIn false; re-auth flips it true and the
        // adapter calls notifyAuthResumed to re-fire the save. Backoff
        // retry isn't appropriate here — the user has to act.
        this.authRetryPending = true;
        this.status = 'error';
        this.lastError = err.message;
        this.cancelRetry({ emit: false });
        onAuthExpired();
      } else {
        const message = err instanceof Error ? err.message : String(err);
        const attempt = (this.retry?.attempt ?? 0) + 1;
        const delay = this.nextDelay(attempt);
        clearTimeout(this.retryTimer);
        this.retryTimer = setTimeout(() => {
          // Pull fresh data from the adapter so any edits made during the
          // wait window are honored. Re-read through `this.callbacks` so
          // we pick up any swap the adapter has installed in the interim.
          const latest = this.callbacks?.getLatestData() ?? null;
          if (latest) void this.runSave(latest);
        }, delay);
        this.retry = { attempt, nextRetryAt: Date.now() + delay, lastError: message };
        this.status = 'retrying';
        this.lastError = message;
      }
    } finally {
      this.saveInFlight = false;
      this.emit();
    }

    // Drain a save that was queued during the in-flight window. Only on
    // success — conflict / 401 / transient-retry each have their own
    // follow-up path that reads from getLatestData (which already has the
    // latest edits in the cache).
    if (succeeded) {
      const queued = this.pending;
      if (queued !== null) {
        this.pending = null;
        clearTimeout(this.debounceTimer);
        void this.runSave(queued);
      }
    }
  }

  private cancelRetry({ emit }: { emit: boolean }): void {
    clearTimeout(this.retryTimer);
    this.retryTimer = undefined;
    if (this.retry !== null) {
      this.retry = null;
      if (emit) {
        this.refreshStatus();
        this.emit();
      }
    }
  }

  // Re-derive status from the current flags after a state change that
  // doesn't happen inside runSave (e.g. conflict resolution).
  private refreshStatus(): void {
    if (this.saveInFlight) {
      this.status = 'saving';
    } else if (this.retry) {
      this.status = 'retrying';
    } else if (this.conflict) {
      this.status = 'error';
    }
    // Otherwise leave the status alone — 'saved' / 'error' / 'idle' from
    // the last runSave remains sticky until the next save.
  }

  private nextDelay(attempt: number): number {
    return Math.min(this.retryBaseMs * 2 ** (attempt - 1), this.retryMaxMs);
  }

  private emit(): void {
    this.cachedSnapshot = {
      status: this.status,
      conflict: this.conflict,
      retry: this.retry,
      lastSavedAt: this.lastSavedAt,
      error: this.lastError,
    };
    for (const listener of this.listeners) listener(this.cachedSnapshot);
  }
}
