/** Minimal type declarations for Google Identity Services (GIS) */

interface TokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  error?: string;
  error_description?: string;
}

interface TokenClientConfig {
  client_id: string;
  scope: string;
  callback: (response: TokenResponse) => void;
  error_callback?: (error: { type: string; message: string }) => void;
  prompt?: '' | 'none' | 'consent' | 'select_account';
}

interface TokenClient {
  requestAccessToken(overrides?: { prompt?: string }): void;
}

interface Google {
  accounts: {
    oauth2: {
      initTokenClient(config: TokenClientConfig): TokenClient;
      revoke(token: string, callback?: () => void): void;
      hasGrantedAllScopes(response: TokenResponse, ...scopes: string[]): boolean;
    };
  };
}

declare const google: Google;
