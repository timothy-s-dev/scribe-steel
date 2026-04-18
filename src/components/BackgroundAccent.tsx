// Decorative blur circles rendered behind page content. Meant to be placed
// inside a positioned container (the <main> in AppLayout) so the accent fills
// the visible main area without bleeding under the sidebar.
export function BackgroundAccent() {
  return (
    <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden opacity-20">
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary rounded-full blur-[120px]" />
      <div className="absolute top-1/2 left-1/4 w-[500px] h-[500px] bg-secondary-container rounded-full blur-[160px] opacity-10" />
    </div>
  );
}
