import { useEffect } from 'react';

// Landing page for Google's OAuth redirect. Runs in the popup window only.
// Reads the code/state/error from the URL, posts them to the opener (the
// main app window), and closes itself. The opener does the actual token
// exchange (see signIn flow in google-auth.ts).
//
// Rendered without AppLayout chrome — the user only sees this for a few
// hundred milliseconds while the popup is closing. The fallback text is
// only visible if window.opener is somehow unavailable.
export function AuthCallbackPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');

    // Same-origin postMessage. The opener filters on `event.origin ===
    // window.location.origin` so we can target window.location.origin
    // safely (don't use '*').
    if (window.opener) {
      window.opener.postMessage(
        {
          type: 'scribe-steel-oauth-callback',
          code,
          state,
          error,
        },
        window.location.origin,
      );
      window.close();
    }
  }, []);

  return (
    <div className="h-screen flex items-center justify-center bg-surface text-on-surface text-sm font-body">
      Signing you in&hellip;
    </div>
  );
}
