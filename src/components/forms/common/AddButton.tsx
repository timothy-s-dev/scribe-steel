import { Plus } from 'lucide-react';

export function AddButton({
  onClick,
  children,
  icon: Icon = Plus,
}: {
  onClick: () => void;
  children: React.ReactNode;
  icon?: typeof Plus;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 text-xs font-label text-primary hover:text-primary/80 transition-colors cursor-pointer"
    >
      <Icon size={14} aria-hidden="true" />
      {children}
    </button>
  );
}
