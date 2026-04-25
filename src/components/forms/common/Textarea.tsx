import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { inputBaseClass, inputSizeClass, type InputSize } from './formStyles';

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { inputSize?: InputSize };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, inputSize = 'md', ...props }, ref) => (
    <textarea ref={ref} className={cn('w-full', inputBaseClass, inputSizeClass[inputSize], className)} {...props} />
  ),
);
Textarea.displayName = 'Textarea';
