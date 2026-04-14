import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ensureRootFolder } from '@/services/storage';
import { findFile, readFile, createFile, updateFile } from '@/services/google-drive';
import type { ZoomMode } from '@/hooks/useZoom';

export interface AppSettings {
  printFriendly: boolean;
  defaultZoom: ZoomMode;
}

const DEFAULTS: AppSettings = {
  printFriendly: false,
  defaultZoom: 'fit-width',
};

const LOCAL_KEY = 'scribe-steel-settings';

function loadLocal(): AppSettings {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULTS };
}

function saveLocal(settings: AppSettings) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(settings));
}

let driveFileId: string | null = null;

async function loadFromDrive(): Promise<AppSettings | null> {
  try {
    const rootId = await ensureRootFolder();
    const fid = await findFile('settings.json', rootId);
    if (fid) {
      driveFileId = fid;
      return await readFile<AppSettings>(fid);
    }
  } catch { /* ignore */ }
  return null;
}

async function saveToDrive(settings: AppSettings) {
  try {
    const rootId = await ensureRootFolder();
    if (!driveFileId) {
      driveFileId = await findFile('settings.json', rootId);
    }
    if (driveFileId) {
      await updateFile(driveFileId, settings);
    } else {
      driveFileId = await createFile(rootId, 'settings.json', settings);
    }
  } catch { /* ignore */ }
}

export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(loadLocal);
  const { isSignedIn } = useAuth();
  const loadedFromDrive = useRef(false);

  // Load from Drive on sign-in
  useEffect(() => {
    if (!isSignedIn || loadedFromDrive.current) return;
    loadedFromDrive.current = true;

    loadFromDrive().then((remote) => {
      if (remote) {
        const merged = { ...DEFAULTS, ...remote };
        setSettingsState(merged);
        saveLocal(merged);
      }
    });
  }, [isSignedIn]);

  const setSettings = useCallback(
    (update: Partial<AppSettings>) => {
      setSettingsState((prev) => {
        const next = { ...prev, ...update };
        saveLocal(next);
        if (isSignedIn) saveToDrive(next);
        return next;
      });
    },
    [isSignedIn],
  );

  return { settings, setSettings };
}
