export function CreatingOverlay({ label = 'Creating...' }: { label?: string }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-surface/70 backdrop-blur-xs">
      <span className="material-symbols-outlined text-3xl text-primary animate-spin">
        progress_activity
      </span>
      <p className="text-sm font-label text-on-surface-variant">{label}</p>
    </div>
  );
}
