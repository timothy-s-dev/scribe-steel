import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { useMirroredInputValue } from './useMirroredInputValue';
import { inputBaseClass } from './formStyles';

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const mirrored = useMirroredInputValue(value, onChange);
    return (
      <input
        ref={ref}
        className={cn('w-full', inputBaseClass, className)}
        {...props}
        value={mirrored.value}
        onChange={mirrored.onChange}
      />
    );
  },
);
Input.displayName = 'Input';
