import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { inputBaseClass } from './formStyles';

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn('w-full', inputBaseClass, className)} {...props}>
      {children}
    </select>
  ),
);
Select.displayName = 'Select';
