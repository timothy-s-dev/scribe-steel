import { loreBooksMetadata, type LoreBookDocument } from '@/documents/lore-books';
import { NameOnlyCreateDialog, type CreateDialogProps } from './NameOnlyCreateDialog';

export function CreateLoreBookDialog(props: CreateDialogProps<LoreBookDocument>) {
  return (
    <NameOnlyCreateDialog
      {...props}
      noun={loreBooksMetadata.noun}
      createDefault={loreBooksMetadata.createDefault}
    />
  );
}
