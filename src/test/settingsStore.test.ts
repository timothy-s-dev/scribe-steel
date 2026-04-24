import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadSettingsMock = vi.fn();
const saveSettingsMock = vi.fn();

vi.mock('@/services/google-drive', () => ({
  loadSettings: (...args: unknown[]) => loadSettingsMock(...args),
  saveSettings: (...args: unknown[]) => saveSettingsMock(...args),
}));

import {
  DEFAULTS,
  loadLocal,
  loadWithLocalFallback,
  saveLocal,
  saveRemote,
} from '@/lib/settingsStore';

const LOCAL_KEY = 'scribe-steel-settings';

beforeEach(() => {
  localStorage.clear();
  loadSettingsMock.mockReset();
  saveSettingsMock.mockReset();
});

describe('loadLocal', () => {
  it('returns defaults when no key is stored', () => {
    expect(loadLocal()).toEqual(DEFAULTS);
  });

  it('returns defaults when stored JSON is malformed', () => {
    localStorage.setItem(LOCAL_KEY, '{not valid json');
    expect(loadLocal()).toEqual(DEFAULTS);
  });

  it('merges partial stored data over defaults', () => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ printFriendly: true }));
    expect(loadLocal()).toEqual({ ...DEFAULTS, printFriendly: true });
  });

  it('returns full stored data when all fields present', () => {
    const stored = { printFriendly: true, defaultZoom: 'fit-page' as const };
    localStorage.setItem(LOCAL_KEY, JSON.stringify(stored));
    expect(loadLocal()).toEqual(stored);
  });
});

describe('saveLocal', () => {
  it('round-trips through loadLocal', () => {
    const settings = { printFriendly: true, defaultZoom: 'fit-page' as const };
    saveLocal(settings);
    expect(loadLocal()).toEqual(settings);
  });
});

describe('loadWithLocalFallback', () => {
  it('returns Drive data when load succeeds and writes through to local', async () => {
    const driveData = { printFriendly: true, defaultZoom: 'fit-page' as const };
    loadSettingsMock.mockResolvedValueOnce({ data: driveData, fileId: 'file-123' });

    const result = await loadWithLocalFallback();

    expect(result).toEqual({ settings: driveData, driveFileId: 'file-123' });
    expect(loadLocal()).toEqual(driveData);
  });

  it('merges partial Drive data over defaults', async () => {
    loadSettingsMock.mockResolvedValueOnce({ data: { printFriendly: true }, fileId: 'f' });

    const result = await loadWithLocalFallback();

    expect(result.settings).toEqual({ ...DEFAULTS, printFriendly: true });
  });

  it('falls back to local cache when Drive throws', async () => {
    const cached = { printFriendly: true, defaultZoom: 'fit-page' as const };
    saveLocal(cached);
    loadSettingsMock.mockRejectedValueOnce(new Error('network down'));

    const result = await loadWithLocalFallback();

    expect(result).toEqual({ settings: cached, driveFileId: null });
  });

  it('falls back to defaults when Drive throws and local is empty', async () => {
    loadSettingsMock.mockRejectedValueOnce(new Error('network down'));

    const result = await loadWithLocalFallback();

    expect(result).toEqual({ settings: DEFAULTS, driveFileId: null });
  });

  it('falls back to local when Drive returns no data', async () => {
    const cached = { printFriendly: true, defaultZoom: 'fit-width' as const };
    saveLocal(cached);
    loadSettingsMock.mockResolvedValueOnce({ data: null, fileId: null });

    const result = await loadWithLocalFallback();

    expect(result).toEqual({ settings: cached, driveFileId: null });
  });
});

describe('saveRemote', () => {
  it('delegates to the Drive client and returns the resulting file id', async () => {
    saveSettingsMock.mockResolvedValueOnce('new-file-id');
    const settings = { printFriendly: true, defaultZoom: 'fit-page' as const };

    const id = await saveRemote(settings, 'old-file-id');

    expect(saveSettingsMock).toHaveBeenCalledWith(settings, 'old-file-id');
    expect(id).toBe('new-file-id');
  });
});
