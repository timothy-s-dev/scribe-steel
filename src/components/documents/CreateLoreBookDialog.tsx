import { loreBooksDocument } from '@/documents/lore-books';
import type { SavedTemplateDocument } from '@/documents';
import { NameOnlyCreateDialog, type CreateDialogProps } from './NameOnlyCreateDialog';

export function CreateLoreBookDialog(props: CreateDialogProps<SavedTemplateDocument>) {
  return (
    <NameOnlyCreateDialog
      {...props}
      noun={loreBooksDocument.noun}
      createDefault={loreBooksDocument.createDefault}
    />
  );
}
