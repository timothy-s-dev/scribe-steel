import { encountersDocument } from '@/documents/encounters';
import type { SavedEncounter } from '@/data/types';
import { NameOnlyCreateDialog, type CreateDialogProps } from './NameOnlyCreateDialog';

export function CreateEncounterDialog(props: CreateDialogProps<SavedEncounter>) {
  return (
    <NameOnlyCreateDialog
      {...props}
      noun={encountersDocument.noun}
      createDefault={encountersDocument.createDefault}
    />
  );
}
