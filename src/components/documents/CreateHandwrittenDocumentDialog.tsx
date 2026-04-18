import { handwrittenDocument } from '@/documents/handwritten';
import type { SavedTemplateDocument } from '@/documents';
import { NameOnlyCreateDialog, type CreateDialogProps } from './NameOnlyCreateDialog';

export function CreateHandwrittenDocumentDialog(props: CreateDialogProps<SavedTemplateDocument>) {
  return (
    <NameOnlyCreateDialog
      {...props}
      noun={handwrittenDocument.noun}
      createDefault={handwrittenDocument.createDefault}
    />
  );
}
