import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { inputBaseClass, inputSizeClass, type InputSize } from './formStyles';

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { inputSize?: InputSize };

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, inputSize = 'md', children, ...props }, ref) => (
    <select ref={ref} className={cn('w-full', inputBaseClass, inputSizeClass[inputSize], className)} {...props}>
      {children}
    </select>
  ),
);
Select.displayName = 'Select';
