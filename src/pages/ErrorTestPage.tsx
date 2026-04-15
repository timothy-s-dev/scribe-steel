import { useState } from 'react';
import * as Sentry from '@sentry/react';

function RenderError() {
  throw new Error('Test render error — caught by ErrorBoundary');
  return null;
}

export function ErrorTestPage() {
  const [throwRender, setThrowRender] = useState(false);

  if (throwRender) return <RenderError />;

  return (
    <div className="h-screen flex flex-col items-center justify-center px-6 text-center">
      <span className="material-symbols-outlined text-6xl text-outline-variant mb-4">
        science
      </span>
      <h1 className="text-2xl font-headline font-bold text-on-surface mb-2">
        Error Testing
      </h1>
      <p className="text-sm font-body text-on-surface-variant mb-8">
        These buttons trigger errors to verify that Sentry and the error boundary are working.
      </p>
      <div className="flex flex-col gap-4">
        <button
          onClick={() => {
            Sentry.captureException(new Error('Test captured exception'));
          }}
          className="px-4 py-2 rounded-sm bg-surface-container-high text-on-surface text-sm font-label font-semibold hover:bg-surface-container-highest transition-colors cursor-pointer"
        >
          Send Sentry Exception
        </button>
        <button
          onClick={() => setThrowRender(true)}
          className="px-4 py-2 rounded-sm bg-tertiary-container text-on-tertiary-container text-sm font-label font-semibold hover:opacity-90 transition-colors cursor-pointer"
        >
          Trigger Error Boundary
        </button>
      </div>
    </div>
  );
}
