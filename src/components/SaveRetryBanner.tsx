import { useEffect, useState } from 'react';
import type { RetryState } from '@/hooks/useDocumentMutation';

interface SaveRetryBannerProps {
  retry: RetryState | null;
}

// Persistent banner shown above the editor while a save is in backoff.
// Renders a live countdown by ticking once per second; the underlying
// retry timer is owned by useDocumentMutation, so this is purely cosmetic.
export function SaveRetryBanner({ retry }: SaveRetryBannerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!retry) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [retry]);

  if (!retry) return null;

  const secondsLeft = Math.max(0, Math.ceil((retry.nextRetryAt - now) / 1000));
  const countdown = secondsLeft <= 0 ? 'now' : `in ${secondsLeft}s`;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-tertiary-container/30 text-tertiary px-4 py-2 text-xs font-label flex items-center gap-2 border-b border-tertiary/20"
    >
      <span className="font-bold">Couldn't save to Drive</span>
      <span className="text-tertiary/80">
        — retrying {countdown} (attempt {retry.attempt + 1})
      </span>
      <span className="ml-auto text-tertiary/60 truncate" title={retry.lastError}>
        {retry.lastError}
      </span>
    </div>
  );
}
