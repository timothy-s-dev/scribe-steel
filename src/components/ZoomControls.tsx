import { Minus, Plus } from 'lucide-react';
import type { ZoomState } from '@/hooks/useZoom';

interface ZoomControlsProps {
  zoom: ZoomState;
  className?: string;
}

export function ZoomControls({ zoom, className = '' }: ZoomControlsProps) {
  return (
    <div className={`items-center gap-1.5 ${className}`}>
      <button
        onClick={zoom.zoomOut}
        className="p-1 text-on-surface-variant hover:text-primary transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        aria-label="Zoom out"
        title="Zoom out"
      >
        <Minus size={18} aria-hidden="true" />
      </button>
      <span className="text-xs font-label text-on-surface-variant w-10 text-center tabular-nums">
        {zoom.zoomPercent}%
      </span>
      <button
        onClick={zoom.zoomIn}
        className="p-1 text-on-surface-variant hover:text-primary transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        aria-label="Zoom in"
        title="Zoom in"
      >
        <Plus size={18} aria-hidden="true" />
      </button>
      <div className="w-px h-4 bg-outline-variant/30 mx-1" />
      <button
        onClick={() => zoom.setMode('fit-width')}
        className={`px-2 py-0.5 text-xs font-label rounded-sm transition-colors ${
          zoom.mode === 'fit-width'
            ? 'text-primary bg-surface-container-high'
            : 'text-on-surface-variant hover:text-primary'
        }`}
      >
        Fit Width
      </button>
      <button
        onClick={() => zoom.setMode('fit-page')}
        className={`px-2 py-0.5 text-xs font-label rounded-sm transition-colors ${
          zoom.mode === 'fit-page'
            ? 'text-primary bg-surface-container-high'
            : 'text-on-surface-variant hover:text-primary'
        }`}
      >
        Fit Page
      </button>
    </div>
  );
}
