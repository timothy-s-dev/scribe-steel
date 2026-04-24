import { useAuth } from '@/contexts/AuthContext';

// Primary "Sign in with Google" call-to-action used on empty/error states
// (list pages when signed out, editor pages when the doc can't be loaded
// without auth). The NavBarSignInButton and SessionExpiryDialog have their
// own styling tuned to their chrome — use this one for in-body prompts.
export function SignInButton() {
  const { signIn } = useAuth();
  return (
    <button
      onClick={signIn}
      className="flex items-center gap-1.5 px-4 py-2 text-sm font-label font-bold tracking-wide bg-primary/20 text-primary rounded-sm hover:bg-primary/30 transition-colors cursor-pointer"
    >
      Sign in with Google
    </button>
  );
}
