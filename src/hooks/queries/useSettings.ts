import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { loadSettings, saveSettings } from '@/services/google-drive';
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

async function loadFromDrive(): Promise<{ settings: AppSettings; driveFileId: string | null }> {
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

async function saveToDrive(settings: AppSettings, driveFileId: string | null): Promise<string> {
  return saveSettings(settings, driveFileId);
}

export function useSettings() {
  const { isSignedIn } = useAuth();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn: loadFromDrive,
    enabled: isSignedIn,
    initialData: { settings: loadLocal(), driveFileId: null },
    staleTime: Infinity,
  });

  const settings = data.settings;

  const { mutate } = useMutation({
    mutationFn: (next: AppSettings) => saveToDrive(next, data.driveFileId),
    onSuccess: (newFileId, next) => {
      queryClient.setQueryData(['settings'], { settings: next, driveFileId: newFileId });
    },
  });

  const setSettings = useCallback(
    (update: Partial<AppSettings>) => {
      const next = { ...settings, ...update };
      saveLocal(next);
      queryClient.setQueryData(['settings'], { settings: next, driveFileId: data.driveFileId });
      if (isSignedIn) mutate(next);
    },
    [settings, isSignedIn, data.driveFileId, queryClient, mutate],
  );

  return { settings, setSettings };
}
