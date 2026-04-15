import { Loader2 } from 'lucide-react';

export function CreatingOverlay({ label = 'Creating...' }: { label?: string }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-surface/70 backdrop-blur-xs">
      <Loader2 size={28} className="text-primary animate-spin" aria-hidden="true" />
      <p className="text-sm font-label text-on-surface-variant">{label}</p>
    </div>
  );
}
