import { encountersMetadata, type EncounterDocument } from '@/documents/encounters';
import { NameOnlyCreateDialog, type CreateDialogProps } from './NameOnlyCreateDialog';

export function CreateEncounterDialog(props: CreateDialogProps<EncounterDocument>) {
  return (
    <NameOnlyCreateDialog
      {...props}
      noun={encountersMetadata.noun}
      createDefault={encountersMetadata.createDefault}
    />
  );
}
