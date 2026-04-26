import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { useMirroredInputValue } from './useMirroredInputValue';
import { inputBaseClass, inputSizeClass, type InputSize } from './formStyles';

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { inputSize?: InputSize };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, inputSize = 'md', value, onChange, ...props }, ref) => {
    const mirrored = useMirroredInputValue<HTMLTextAreaElement>(value, onChange);
    return (
      <textarea
        ref={ref}
        className={cn('w-full', inputBaseClass, inputSizeClass[inputSize], className)}
        {...props}
        value={mirrored.value}
        onChange={mirrored.onChange}
      />
    );
  },
);
Textarea.displayName = 'Textarea';
