import { loadSettings, saveSettings } from '@/services/google-drive';
import type { ZoomMode } from '@/hooks/useZoom';

export interface AppSettings {
  printFriendly: boolean;
  defaultZoom: ZoomMode;
}

export const DEFAULTS: AppSettings = {
  printFriendly: false,
  defaultZoom: 'fit-width',
};

const LOCAL_KEY = 'scribe-steel-settings';

export function loadLocal(): AppSettings {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULTS };
}

export function saveLocal(settings: AppSettings) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(settings));
}

// Load settings preferring Drive, writing through to localStorage on success,
// falling back to the local cache (or defaults) if Drive is unavailable or
// the user isn't signed in. Never throws — all Drive errors are swallowed in
// favor of the local fallback.
export async function loadWithLocalFallback(): Promise<{
  settings: AppSettings;
  driveFileId: string | null;
}> {
  try {
    const { data, fileId } = await loadSettings<AppSettings>();
    if (data) {
      const merged = { ...DEFAULTS, ...data };
      saveLocal(merged);
      return { settings: merged, driveFileId: fileId };
    }
  } catch { /* ignore */ }
  return { settings: loadLocal(), driveFileId: null };
}

export async function saveRemote(
  settings: AppSettings,
  driveFileId: string | null,
): Promise<string> {
  return saveSettings(settings, driveFileId);
}
