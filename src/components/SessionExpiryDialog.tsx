import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { isSessionExpired, onSessionExpiryChange } from '@/services/session-expiry';

export function SessionExpiryDialog() {
  const { signIn } = useAuth();
  const [expired, setExpired] = useState(isSessionExpired());

  useEffect(() => onSessionExpiryChange(setExpired), []);

  // Open purely on the expired flag. The flag is cleared on successful sign-in
  // (by AuthContext) and on manual sign-out, so there's no stale-open case.
  const open = expired;

  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Your session expired</DialogTitle>
          <DialogDescription>
            Your Google sign-in has expired, so recent changes aren't being saved
            to Drive. Sign in again to resume autosave — your local edits are still
            here.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => signIn()}>Sign in with Google</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
