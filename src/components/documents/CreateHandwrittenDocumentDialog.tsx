import { handwrittenMetadata, type HandwrittenDocument } from '@/documents/handwritten';
import { NameOnlyCreateDialog, type CreateDialogProps } from './NameOnlyCreateDialog';

export function CreateHandwrittenDocumentDialog(props: CreateDialogProps<HandwrittenDocument>) {
  return (
    <NameOnlyCreateDialog
      {...props}
      noun={handwrittenMetadata.noun}
      createDefault={handwrittenMetadata.createDefault}
    />
  );
}
