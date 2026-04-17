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
  const [isLoading, setIsLoading] = useState(true);
  const configured = isConfigured();

  useEffect(() => {
    if (!configured) {
      setIsLoading(false);
      return;
    }

    initAuth().then(() => {
      setIsSignedIn(!!getAccessToken());
      setIsLoading(false);
    });

    return onTokenChange((token) => {
      setIsSignedIn(!!token);
      if (token) queryClient.invalidateQueries();
    });
  }, [configured]);

  const signIn = useCallback(() => authSignIn(), []);
  const signOut = useCallback(() => {
    authSignOut();
    clearCache();
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
