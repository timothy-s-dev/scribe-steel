export const inputBaseClass =
  'bg-surface-container-high text-on-surface text-sm font-body rounded-sm border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary';

export const inputSizeClass = {
  md: 'px-2 py-1.5',
  sm: 'px-1.5 py-1',
} as const;

export type InputSize = keyof typeof inputSizeClass;

export const compactLabelClass = 'text-[10px] font-label text-on-surface-variant/70';
