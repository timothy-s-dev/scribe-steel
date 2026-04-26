import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { useMirroredInputValue } from './useMirroredInputValue';
import { inputBaseClass, inputSizeClass, type InputSize } from './formStyles';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { inputSize?: InputSize };

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, inputSize = 'md', value, onChange, ...props }, ref) => {
    const mirrored = useMirroredInputValue(value, onChange);
    return (
      <input
        ref={ref}
        className={cn('w-full', inputBaseClass, inputSizeClass[inputSize], className)}
        {...props}
        value={mirrored.value}
        onChange={mirrored.onChange}
      />
    );
  },
);
Input.displayName = 'Input';
