import { useAuth } from '@/contexts/AuthContext';
import { CloudCheck, CloudOff } from 'lucide-react';

export function SignInButton() {
  const { isSignedIn, isLoading, isConfigured, signIn, signOut } = useAuth();

  if (!isConfigured) {
    return (
      <div className="px-4 py-2 text-xs font-label text-on-surface-variant/50">
        Drive storage not configured
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="px-4 py-2 text-xs font-label text-on-surface-variant/50">
        Connecting...
      </div>
    );
  }

  if (isSignedIn) {
    return (
      <button
        onClick={signOut}
        className="flex items-center gap-2 px-4 py-2 text-xs font-label text-on-surface-variant hover:text-primary transition-colors w-full cursor-pointer"
      >
        <CloudCheck size={18} aria-hidden="true" />
        <span className="font-body">Sign Out</span>
      </button>
    );
  }

  return (
    <button
      onClick={signIn}
      className="flex items-center gap-2 px-4 py-2 text-xs font-label text-on-surface-variant hover:text-primary transition-colors w-full cursor-pointer"
    >
      <CloudOff size={18} aria-hidden="true" />
      <span className="font-body">Sign in with Google</span>
    </button>
  );
}
