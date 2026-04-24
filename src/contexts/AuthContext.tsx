/* eslint-disable react-refresh/only-export-components --
 * Provider + useAuth hook co-located. Splitting for Fast Refresh fidelity
 * isn't worth three files for a rarely-edited auth module. */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {
  initAuth,
  signIn as authSignIn,
  signOut as authSignOut,
  getAccessToken,
  onTokenChange,
  isConfigured,
} from '@/services/google-auth';
import { clearSessionExpired } from '@/services/session-expiry';
import { resetLayout } from '@/services/google-drive';
import { queryClient, clearCache } from '@/lib/queryClient';

interface AuthState {
  isSignedIn: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthState>({
  isSignedIn: false,
  isLoading: true,
  isConfigured: false,
  signIn: () => {},
  signOut: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const configured = isConfigured();
  const isLoading = configured && !initialized;

  useEffect(() => {
    if (!configured) return;

    initAuth().then(() => {
      setIsSignedIn(!!getAccessToken());
      setInitialized(true);
    });

    return onTokenChange((token) => {
      setIsSignedIn(!!token);
      if (token) {
        clearSessionExpired();
        queryClient.invalidateQueries();
      }
    });
  }, [configured]);

  const signIn = useCallback(() => authSignIn(), []);
  const signOut = useCallback(() => {
    authSignOut();
    clearCache();
    resetLayout();
    clearSessionExpired();
  }, []);

  return (
    <AuthContext.Provider
      value={{ isSignedIn, isLoading, isConfigured: configured, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
