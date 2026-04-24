import { useEffect, useState } from 'react';
import { CheckIcon } from 'lucide-react';
import { Badge } from '@/components/shadcn/badge';
import { Spinner } from '@/components/shadcn/spinner';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/shadcn/hover-card';
import type { SaveStatus } from '@/hooks/useDocumentMutation';

interface SaveStatusBadgeProps {
  status: SaveStatus;
  lastSavedAt: number | null;
}

function formatRelative(from: number, to: number): string {
  const diff = Math.max(0, to - from);
  const s = Math.round(diff / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s} seconds ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

function formatAbsolute(ms: number): string {
  return new Date(ms).toLocaleString();
}

// Rendered inside HoverCardContent, which Base UI unmounts on close —
// so the Date.now() initializer runs fresh each time the card opens, and
// the interval (scoped to this component's lifetime) ticks only while open.
function LastSavedInfo({ lastSavedAt }: { lastSavedAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);
  return (
    <>
      <div className="font-medium text-on-surface">
        Last saved {formatRelative(lastSavedAt, now)}
      </div>
      <div className="text-on-surface-variant/70">{formatAbsolute(lastSavedAt)}</div>
    </>
  );
}

export function SaveStatusBadge({ status, lastSavedAt }: SaveStatusBadgeProps) {
  if (status === 'idle') return null;

  const isErrorLike = status === 'error' || status === 'retrying';

  const badge = isErrorLike ? (
    <Badge variant="destructive">
      <Spinner aria-hidden="true" role={undefined} />
      Retrying...
    </Badge>
  ) : status === 'saving' ? (
    <Badge variant="outline">
      <Spinner aria-hidden="true" role={undefined} className="text-secondary" />
      Saving...
    </Badge>
  ) : (
    <Badge variant="outline">
      <CheckIcon className="text-green-500" aria-hidden="true" />
      Saved
    </Badge>
  );

  if (lastSavedAt === null) return badge;

  return (
    <HoverCard openDelay={150}>
      <HoverCardTrigger render={badge} />
      <HoverCardContent className="w-auto text-xs font-label" side="bottom" align="end">
        <LastSavedInfo lastSavedAt={lastSavedAt} />
      </HoverCardContent>
    </HoverCard>
  );
}
