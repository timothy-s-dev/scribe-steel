import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { useMirroredInputValue } from './useMirroredInputValue';
import { inputBaseClass } from './formStyles';

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const mirrored = useMirroredInputValue<HTMLTextAreaElement>(value, onChange);
    return (
      <textarea
        ref={ref}
        className={cn('w-full', inputBaseClass, className)}
        {...props}
        value={mirrored.value}
        onChange={mirrored.onChange}
      />
    );
  },
);
Textarea.displayName = 'Textarea';
