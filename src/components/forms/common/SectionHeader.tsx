export function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-label font-bold tracking-wide uppercase text-on-surface-variant">
      {children}
    </h3>
  );
}
