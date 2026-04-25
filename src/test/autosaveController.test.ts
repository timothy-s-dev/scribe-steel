import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the service so we don't pull in Drive's fetch-layer side effects
// at import time. The controller only needs the error classes.
vi.mock('@/services/google-drive', () => {
  class DriveError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.name = 'DriveError';
      this.status = status;
    }
  }
  class DriveConflictError extends Error {
    remoteData: unknown;
    remoteMd5: string;
    remoteModifiedTime: string;
    constructor(remoteData: unknown, remoteMd5: string, remoteModifiedTime: string) {
      super('Remote content has changed since load');
      this.name = 'DriveConflictError';
      this.remoteData = remoteData;
      this.remoteMd5 = remoteMd5;
      this.remoteModifiedTime = remoteModifiedTime;
    }
  }
  return { DriveError, DriveConflictError };
});

import { DriveConflictError, DriveError } from '@/services/google-drive';
import { AutosaveController } from '@/lib/autosaveController';

interface Doc {
  name: string;
  body: string;
}

interface Harness {
  controller: AutosaveController<Doc>;
  save: ReturnType<typeof vi.fn>;
  onAuthExpired: ReturnType<typeof vi.fn>;
  latestRef: { current: Doc | null };
  setLatest: (d: Doc | null) => void;
}

function makeHarness(overrides?: {
  save?: (data: Doc) => Promise<void>;
  debounceMs?: number;
  retryBaseMs?: number;
  retryMaxMs?: number;
}): Harness {
  const latestRef: { current: Doc | null } = { current: null };
  const save = vi.fn<(data: Doc) => Promise<void>>(
    overrides?.save ?? (() => Promise.resolve()),
  );
  const onAuthExpired = vi.fn();
  const controller = new AutosaveController<Doc>({
    debounceMs: overrides?.debounceMs ?? 2000,
    retryBaseMs: overrides?.retryBaseMs ?? 2000,
    retryMaxMs: overrides?.retryMaxMs ?? 60_000,
  });
  controller.setCallbacks({
    save: (data) => save(data),
    getLatestData: () => latestRef.current,
    onAuthExpired,
  });
  return {
    controller,
    save,
    onAuthExpired,
    latestRef,
    setLatest: (d) => { latestRef.current = d; },
  };
}

// vitest's fake timers don't auto-flush microtasks between timer ticks.
// Many controller paths schedule a setTimeout whose callback awaits a
// Promise; after advancing the clock we need to yield the microtask queue
// so awaits resolve before asserting.
async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('AutosaveController', () => {
  describe('debounce', () => {
    it('coalesces rapid edits into a single save', async () => {
      const h = makeHarness();
      h.controller.schedule({ name: 'n', body: 'a' });
      vi.advanceTimersByTime(500);
      h.controller.schedule({ name: 'n', body: 'ab' });
      vi.advanceTimersByTime(500);
      h.controller.schedule({ name: 'n', body: 'abc' });
      expect(h.save).not.toHaveBeenCalled();
      vi.advanceTimersByTime(2000);
      await flushMicrotasks();
      expect(h.save).toHaveBeenCalledTimes(1);
      expect(h.save).toHaveBeenCalledWith({ name: 'n', body: 'abc' });
    });

    it('flush fires pending save immediately', async () => {
      const h = makeHarness();
      h.controller.schedule({ name: 'n', body: 'draft' });
      expect(h.save).not.toHaveBeenCalled();
      h.controller.flush();
      await flushMicrotasks();
      expect(h.save).toHaveBeenCalledTimes(1);
      expect(h.save).toHaveBeenCalledWith({ name: 'n', body: 'draft' });
    });

    it('flush with no pending is a no-op', () => {
      const h = makeHarness();
      h.controller.flush();
      expect(h.save).not.toHaveBeenCalled();
    });
  });

  describe('serialization', () => {
    it('queues an edit that arrives while a save is in flight, then drains on success', async () => {
      let resolveFirst: (() => void) | null = null;
      const save = vi.fn<(d: Doc) => Promise<void>>()
        .mockImplementationOnce(() => new Promise<void>((resolve) => { resolveFirst = resolve; }))
        .mockImplementationOnce(() => Promise.resolve());
      const h = makeHarness({ save });

      h.controller.schedule({ name: 'n', body: 'one' });
      vi.advanceTimersByTime(2000);
      await flushMicrotasks();
      expect(save).toHaveBeenCalledTimes(1);
      expect(save).toHaveBeenCalledWith({ name: 'n', body: 'one' });

      // Edit arrives while first save is still pending.
      h.controller.schedule({ name: 'n', body: 'two' });
      vi.advanceTimersByTime(2000);
      await flushMicrotasks();
      // Second save must not fire yet — serialized behind the first.
      expect(save).toHaveBeenCalledTimes(1);

      // First save resolves → drain should fire the queued one.
      resolveFirst!();
      await flushMicrotasks();
      expect(save).toHaveBeenCalledTimes(2);
      expect(save).toHaveBeenNthCalledWith(2, { name: 'n', body: 'two' });
    });
  });

  describe('no-op suppression', () => {
    it('skips a save when data matches the last synced canonical', async () => {
      const h = makeHarness();
      const doc = { name: 'n', body: 'same' };
      h.controller.primeSyncedSnapshot(doc);
      h.controller.schedule(doc);
      vi.advanceTimersByTime(2000);
      await flushMicrotasks();
      expect(h.save).not.toHaveBeenCalled();
    });

    it('saves when data differs from last synced, then suppresses re-saves of the same value', async () => {
      const h = makeHarness();
      h.controller.primeSyncedSnapshot({ name: 'n', body: 'v1' });
      h.controller.schedule({ name: 'n', body: 'v2' });
      vi.advanceTimersByTime(2000);
      await flushMicrotasks();
      expect(h.save).toHaveBeenCalledTimes(1);

      h.controller.schedule({ name: 'n', body: 'v2' });
      vi.advanceTimersByTime(2000);
      await flushMicrotasks();
      expect(h.save).toHaveBeenCalledTimes(1);
    });

    it('primeSyncedSnapshot only seeds on first call', async () => {
      const h = makeHarness();
      h.controller.primeSyncedSnapshot({ name: 'n', body: 'original' });
      h.controller.primeSyncedSnapshot({ name: 'n', body: 'different' });
      // If the second prime had overwritten, scheduling "original" would save.
      h.controller.schedule({ name: 'n', body: 'original' });
      vi.advanceTimersByTime(2000);
      await flushMicrotasks();
      expect(h.save).not.toHaveBeenCalled();
    });
  });

  describe('transient error retry', () => {
    it('schedules exponential backoff on transient failure', async () => {
      const save = vi.fn<(d: Doc) => Promise<void>>()
        .mockRejectedValueOnce(new DriveError('boom', 500))
        .mockRejectedValueOnce(new DriveError('boom', 500))
        .mockResolvedValueOnce(undefined);
      const h = makeHarness({ save });
      h.setLatest({ name: 'n', body: 'v' });

      h.controller.schedule({ name: 'n', body: 'v' });
      vi.advanceTimersByTime(2000);
      await flushMicrotasks();
      expect(save).toHaveBeenCalledTimes(1);
      expect(h.controller.snapshot().retry?.attempt).toBe(1);
      expect(h.controller.snapshot().status).toBe('retrying');

      // First retry after ~2s.
      vi.advanceTimersByTime(2000);
      await flushMicrotasks();
      expect(save).toHaveBeenCalledTimes(2);
      expect(h.controller.snapshot().retry?.attempt).toBe(2);

      // Second retry delay doubles to 4s.
      vi.advanceTimersByTime(2000);
      await flushMicrotasks();
      expect(save).toHaveBeenCalledTimes(2);
      vi.advanceTimersByTime(2000);
      await flushMicrotasks();
      expect(save).toHaveBeenCalledTimes(3);
      // Success clears retry.
      expect(h.controller.snapshot().retry).toBeNull();
      expect(h.controller.snapshot().status).toBe('saved');
    });

    it('caps backoff delay at retryMaxMs', async () => {
      const save = vi.fn<(d: Doc) => Promise<void>>()
        .mockRejectedValue(new DriveError('boom', 500));
      const h = makeHarness({ save, retryBaseMs: 10, retryMaxMs: 40 });
      h.setLatest({ name: 'n', body: 'v' });

      h.controller.schedule({ name: 'n', body: 'v' });
      vi.advanceTimersByTime(2000);
      await flushMicrotasks();
      // attempt 1 failed, next delay = 10
      expect(h.controller.snapshot().retry?.attempt).toBe(1);

      vi.advanceTimersByTime(10);
      await flushMicrotasks();
      // attempt 2 failed, next delay = 20
      expect(h.controller.snapshot().retry?.attempt).toBe(2);

      vi.advanceTimersByTime(20);
      await flushMicrotasks();
      // attempt 3 failed, next delay = 40 (cap)
      expect(h.controller.snapshot().retry?.attempt).toBe(3);

      vi.advanceTimersByTime(40);
      await flushMicrotasks();
      // attempt 4 failed, next delay capped at 40
      expect(h.controller.snapshot().retry?.attempt).toBe(4);
      const nextRetryAt = h.controller.snapshot().retry!.nextRetryAt;
      expect(nextRetryAt - Date.now()).toBeLessThanOrEqual(40);
    });

    it('retry timer picks up latest data from getLatestData', async () => {
      const save = vi.fn<(d: Doc) => Promise<void>>()
        .mockRejectedValueOnce(new DriveError('boom', 500))
        .mockResolvedValueOnce(undefined);
      const h = makeHarness({ save });
      h.setLatest({ name: 'n', body: 'v1' });

      h.controller.schedule({ name: 'n', body: 'v1' });
      vi.advanceTimersByTime(2000);
      await flushMicrotasks();
      expect(save).toHaveBeenNthCalledWith(1, { name: 'n', body: 'v1' });

      // User edited during the wait window; getLatestData returns the new value.
      h.setLatest({ name: 'n', body: 'v2' });
      vi.advanceTimersByTime(2000);
      await flushMicrotasks();
      expect(save).toHaveBeenNthCalledWith(2, { name: 'n', body: 'v2' });
    });

    it('a fresh edit cancels the pending retry', async () => {
      const save = vi.fn<(d: Doc) => Promise<void>>()
        .mockRejectedValueOnce(new DriveError('boom', 500))
        .mockResolvedValueOnce(undefined);
      const h = makeHarness({ save });

      h.controller.schedule({ name: 'n', body: 'v1' });
      vi.advanceTimersByTime(2000);
      await flushMicrotasks();
      expect(h.controller.snapshot().retry).not.toBeNull();

      // Fresh edit arrives before the retry timer fires.
      h.controller.schedule({ name: 'n', body: 'v2' });
      expect(h.controller.snapshot().retry).toBeNull();

      // If the retry had not been cancelled, save would fire with v1 at t+2s.
      vi.advanceTimersByTime(2000);
      await flushMicrotasks();
      expect(save).toHaveBeenCalledTimes(2);
      expect(save).toHaveBeenNthCalledWith(2, { name: 'n', body: 'v2' });
    });
  });

  describe('conflict', () => {
    it('halts retries and surfaces conflict state', async () => {
      const conflictErr = new DriveConflictError(
        { body: 'remote' },
        'remote-md5',
        '2025-01-01T00:00:00Z',
      );
      const save = vi.fn<(d: Doc) => Promise<void>>().mockRejectedValue(conflictErr);
      const h = makeHarness({ save });

      h.controller.schedule({ name: 'n', body: 'local' });
      vi.advanceTimersByTime(2000);
      await flushMicrotasks();
      expect(save).toHaveBeenCalledTimes(1);
      expect(h.controller.snapshot().conflict).toEqual({
        remoteData: { body: 'remote' },
        remoteMd5: 'remote-md5',
        remoteModifiedTime: '2025-01-01T00:00:00Z',
      });
      expect(h.controller.snapshot().status).toBe('error');
      expect(h.controller.snapshot().retry).toBeNull();

      // Advancing time must not fire another save — conflict is terminal
      // until resolved.
      vi.advanceTimersByTime(60_000);
      await flushMicrotasks();
      expect(save).toHaveBeenCalledTimes(1);
    });

    it('schedule during conflict is ignored', async () => {
      const save = vi.fn<(d: Doc) => Promise<void>>()
        .mockRejectedValueOnce(new DriveConflictError({}, 'rm', 't'));
      const h = makeHarness({ save });

      h.controller.schedule({ name: 'n', body: 'v1' });
      vi.advanceTimersByTime(2000);
      await flushMicrotasks();
      expect(h.controller.snapshot().conflict).not.toBeNull();

      h.controller.schedule({ name: 'n', body: 'v2' });
      vi.advanceTimersByTime(10_000);
      await flushMicrotasks();
      expect(save).toHaveBeenCalledTimes(1);
    });

    it('resolveUseRemote clears conflict and arms re-seed on next edit', async () => {
      const save = vi.fn<(d: Doc) => Promise<void>>()
        .mockRejectedValueOnce(new DriveConflictError({}, 'rm', 't'))
        .mockResolvedValueOnce(undefined);
      const h = makeHarness({ save });

      h.controller.primeSyncedSnapshot({ name: 'n', body: 'v1' });
      h.controller.schedule({ name: 'n', body: 'v2' });
      vi.advanceTimersByTime(2000);
      await flushMicrotasks();
      expect(h.controller.snapshot().conflict).not.toBeNull();

      h.controller.resolveUseRemote();
      expect(h.controller.snapshot().conflict).toBeNull();

      // Canonical was cleared; scheduling the pre-conflict value now saves
      // (it's not seen as a no-op).
      h.controller.schedule({ name: 'n', body: 'v1' });
      vi.advanceTimersByTime(2000);
      await flushMicrotasks();
      expect(save).toHaveBeenCalledTimes(2);
      expect(save).toHaveBeenNthCalledWith(2, { name: 'n', body: 'v1' });
    });

    it('resolveKeepLocal re-schedules a save with the latest data', async () => {
      const save = vi.fn<(d: Doc) => Promise<void>>()
        .mockRejectedValueOnce(new DriveConflictError({}, 'rm', 't'))
        .mockResolvedValueOnce(undefined);
      const h = makeHarness({ save });

      h.setLatest({ name: 'n', body: 'local' });
      h.controller.schedule({ name: 'n', body: 'local' });
      vi.advanceTimersByTime(2000);
      await flushMicrotasks();
      expect(h.controller.snapshot().conflict).not.toBeNull();

      h.controller.resolveKeepLocal();
      expect(h.controller.snapshot().conflict).toBeNull();

      vi.advanceTimersByTime(2000);
      await flushMicrotasks();
      expect(save).toHaveBeenCalledTimes(2);
      expect(save).toHaveBeenNthCalledWith(2, { name: 'n', body: 'local' });
    });
  });

  describe('auth expiry', () => {
    it('401 sets authRetryPending, does not retry automatically, and fires onAuthExpired', async () => {
      const save = vi.fn<(d: Doc) => Promise<void>>()
        .mockRejectedValueOnce(new DriveError('expired', 401));
      const h = makeHarness({ save });

      h.controller.schedule({ name: 'n', body: 'v' });
      vi.advanceTimersByTime(2000);
      await flushMicrotasks();
      expect(save).toHaveBeenCalledTimes(1);
      expect(h.onAuthExpired).toHaveBeenCalledTimes(1);
      expect(h.controller.snapshot().status).toBe('error');
      expect(h.controller.snapshot().retry).toBeNull();

      vi.advanceTimersByTime(60_000);
      await flushMicrotasks();
      expect(save).toHaveBeenCalledTimes(1);
    });

    it('notifyAuthResumed replays the save with latest data', async () => {
      const save = vi.fn<(d: Doc) => Promise<void>>()
        .mockRejectedValueOnce(new DriveError('expired', 401))
        .mockResolvedValueOnce(undefined);
      const h = makeHarness({ save });

      h.setLatest({ name: 'n', body: 'v1' });
      h.controller.schedule({ name: 'n', body: 'v1' });
      vi.advanceTimersByTime(2000);
      await flushMicrotasks();
      expect(save).toHaveBeenCalledTimes(1);

      // User "edits" while signed out — optimistic cache write is the
      // adapter's responsibility; we just update the latest ref.
      h.setLatest({ name: 'n', body: 'v2' });
      h.controller.notifyAuthResumed();
      await flushMicrotasks();
      expect(save).toHaveBeenCalledTimes(2);
      expect(save).toHaveBeenNthCalledWith(2, { name: 'n', body: 'v2' });
    });

    it('notifyAuthResumed is a no-op when no 401 is pending', async () => {
      const h = makeHarness();
      h.setLatest({ name: 'n', body: 'v' });
      h.controller.notifyAuthResumed();
      await flushMicrotasks();
      expect(h.save).not.toHaveBeenCalled();
    });
  });

  describe('subscribe', () => {
    it('notifies subscribers on state transitions', async () => {
      const h = makeHarness();
      const listener = vi.fn();
      const unsubscribe = h.controller.subscribe(listener);

      h.controller.schedule({ name: 'n', body: 'v' });
      vi.advanceTimersByTime(2000);
      await flushMicrotasks();
      // At least: saving → saved
      const statuses = listener.mock.calls.map((c) => (c[0] as { status: string }).status);
      expect(statuses).toContain('saving');
      expect(statuses).toContain('saved');

      unsubscribe();
      listener.mockClear();
      h.controller.schedule({ name: 'n', body: 'v2' });
      vi.advanceTimersByTime(2000);
      await flushMicrotasks();
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
