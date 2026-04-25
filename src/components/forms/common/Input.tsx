import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { inputBaseClass, inputSizeClass, type InputSize } from './formStyles';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { inputSize?: InputSize };

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, inputSize = 'md', ...props }, ref) => (
    <input ref={ref} className={cn('w-full', inputBaseClass, inputSizeClass[inputSize], className)} {...props} />
  ),
);
Input.displayName = 'Input';
