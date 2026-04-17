import { Switch } from '@/components/ui/switch';
import { ZoomControls } from '@/components/ZoomControls';
import type { ZoomState } from '@/hooks/useZoom';

interface PreviewToolbarProps {
  zoom: ZoomState;
  printMode: boolean;
  onPrintModeChange: (value: boolean) => void;
  onExportPdf: () => void;
  exporting: boolean;
  exportDisabled?: boolean;
}

export function PreviewToolbar({
  zoom,
  printMode,
  onPrintModeChange,
  onExportPdf,
  exporting,
  exportDisabled = false,
}: PreviewToolbarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-surface-container flex-shrink-0">
      <div className="flex-1">
        <label className="flex items-center gap-2 cursor-pointer w-fit">
          <Switch
            size="sm"
            checked={printMode}
            onCheckedChange={onPrintModeChange}
          />
          <span className="text-xs font-label text-on-surface-variant">
            Print-Friendly
          </span>
        </label>
      </div>

      <ZoomControls zoom={zoom} className="hidden sm:flex" />

      <div className="flex-1 flex justify-end">
        <button
          onClick={onExportPdf}
          disabled={exporting || exportDisabled}
          className="px-4 py-1.5 text-xs font-label font-bold tracking-wide uppercase bg-surface-container-high text-on-surface-variant rounded-sm hover:bg-surface-bright transition-colors disabled:opacity-50"
        >
          {exporting ? 'Exporting...' : 'Export PDF'}
        </button>
      </div>
    </div>
  );
}
