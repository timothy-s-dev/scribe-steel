import { CloudOff } from 'lucide-react';
import { SignInButton } from '@/components/auth/SignInButton';
import { signInToViewLabel } from '@/data/documents/titles';
import type { DocumentMetadata } from '@/data/documents';
import type { DocumentMetaFields } from '@/data/documents/types';

interface SignInGateProps<T extends DocumentMetaFields & { name: string }> {
  type: DocumentMetadata<T>;
}

export function SignInGate<T extends DocumentMetaFields & { name: string }>({
  type,
}: SignInGateProps<T>) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-4">
      <CloudOff size={48} className="text-on-surface-variant/30" aria-hidden="true" />
      <p className="text-sm font-body text-on-surface-variant">
        {signInToViewLabel(type)}
      </p>
      <SignInButton />
    </div>
  );
}
