import { useSettings } from '@/hooks/useSettings';
import { Switch } from '@/components/ui/switch';
import type { ZoomMode } from '@/hooks/useZoom';

export function SettingsPage() {
  const { settings, setSettings } = useSettings();

  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center px-6 py-4 bg-surface-container flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-xl text-on-surface-variant" aria-hidden="true">
            settings
          </span>
          <h1 className="text-lg font-headline font-semibold text-on-surface">
            Settings
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6">
        <div className="max-w-lg space-y-8">
          <section>
            <h2 className="text-xs font-label font-bold tracking-widest uppercase text-on-surface-variant/50 mb-4">
              Editor Defaults
            </h2>

            <div className="space-y-5">
              {/* Print-Friendly */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-body font-semibold text-on-surface">
                    Print-Friendly
                  </div>
                  <div className="text-xs font-label text-on-surface-variant mt-0.5">
                    Default new editors to print-friendly mode
                  </div>
                </div>
                <Switch
                  checked={settings.printFriendly}
                  onCheckedChange={(checked) =>
                    setSettings({ printFriendly: checked })
                  }
                />
              </div>

              {/* Default Zoom */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-body font-semibold text-on-surface">
                    Default Zoom
                  </div>
                  <div className="text-xs font-label text-on-surface-variant mt-0.5">
                    Initial zoom mode when opening an editor
                  </div>
                </div>
                <ZoomToggle
                  value={settings.defaultZoom}
                  onChange={(zoom) => setSettings({ defaultZoom: zoom })}
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ZoomToggle({
  value,
  onChange,
}: {
  value: ZoomMode;
  onChange: (value: ZoomMode) => void;
}) {
  const options: { label: string; mode: ZoomMode }[] = [
    { label: 'Fit Width', mode: 'fit-width' },
    { label: 'Fit Page', mode: 'fit-page' },
  ];

  return (
    <div className="flex rounded-sm overflow-hidden border border-outline-variant/30">
      {options.map((opt) => (
        <button
          key={opt.mode}
          onClick={() => onChange(opt.mode)}
          className={`px-3 py-1.5 text-xs font-label transition-colors cursor-pointer ${
            value === opt.mode
              ? 'bg-primary/20 text-primary font-bold'
              : 'bg-surface-container-high text-on-surface-variant hover:text-primary'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
