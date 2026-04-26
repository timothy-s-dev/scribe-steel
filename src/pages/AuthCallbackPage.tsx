import { useEffect, useState } from 'react';

// Landing page for Google's OAuth redirect. Runs in the popup window only.
// Reads the code/state/error from the URL, broadcasts them to the opener
// over a BroadcastChannel (same-origin only by spec), and tries to close
// itself.
//
// We use BroadcastChannel rather than window.opener.postMessage because
// COOP on accounts.google.com severs the popup-opener relationship during
// the auth round-trip — by the time the popup gets back to /auth/callback
// in production, window.opener is null and postMessage would be lost.
//
// Rendered without AppLayout chrome — the user only sees this for a few
// hundred milliseconds while window.close() runs. The "you can close this
// window" fallback only appears if the close fails (some browsers block
// programmatic close in certain contexts).
export function AuthCallbackPage() {
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');

    const channel = new BroadcastChannel('scribe-steel-oauth');
    channel.postMessage({ code, state, error });
    channel.close();

    window.close();

    // If we're still here after a short delay, window.close() didn't take
    // (Firefox in some configurations, popup-blocker rules, etc.). Show
    // a hint so the user knows it's safe to dismiss the popup manually.
    const fallbackTimer = setTimeout(() => setShowFallback(true), 500);
    return () => clearTimeout(fallbackTimer);
  }, []);

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-2 bg-surface text-on-surface text-sm font-body">
      <div>Signing you in&hellip;</div>
      {showFallback && (
        <div className="text-on-surface-variant text-xs">
          You can close this window now.
        </div>
      )}
    </div>
  );
}
