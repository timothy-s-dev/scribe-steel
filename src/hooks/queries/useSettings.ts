import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  loadLocal,
  loadWithLocalFallback,
  saveLocal,
  saveRemote,
  type AppSettings,
} from '@/lib/settingsStore';

export type { AppSettings };

export function useSettings() {
  const { isSignedIn } = useAuth();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn: loadWithLocalFallback,
    enabled: isSignedIn,
    initialData: { settings: loadLocal(), driveFileId: null },
    staleTime: Infinity,
  });

  const settings = data.settings;

  const { mutate } = useMutation({
    mutationFn: (next: AppSettings) => saveRemote(next, data.driveFileId),
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
