import { usePageTitle } from '@/hooks/usePageTitle';
import { Shield } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

export function PrivacyPolicyPage() {
  usePageTitle('Privacy & Legal');
  return (
    <div className="h-full flex flex-col">
      <PageHeader icon={Shield} title="Privacy & Legal" />

      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6">
        <div className="max-w-2xl space-y-6 text-sm font-body text-on-surface-variant leading-relaxed">
          <p className="text-xs font-label text-on-surface-variant/50">
            Last updated: April 25, 2026
          </p>

          <section className="space-y-2">
            <h2 className="text-base font-headline font-semibold text-on-surface">
              What Scribe Steel Is
            </h2>
            <p>
              Scribe Steel is a free, open-source web application that generates
              printable play aids for the Draw Steel tabletop roleplaying game.
              It runs entirely in your browser — there is no backend server.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-headline font-semibold text-on-surface">
              Draw Steel Attribution
            </h2>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <img
                src="/draw-steel/powered-by-draw-steel-vertical.webp"
                alt="Powered by Draw Steel"
                className="h-20 w-auto flex-shrink-0 invert"
              />
              <p>
                Scribe Steel is an independent product published under the DRAW
                STEEL Creator License and is not affiliated with MCDM
                Productions, LLC. DRAW STEEL © 2026 MCDM Productions, LLC.
              </p>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-headline font-semibold text-on-surface">
              Google Account Access
            </h2>
            <p>
              You can optionally sign in with your Google account to save
              documents to Google Drive. Scribe Steel requests the{' '}
              <code className="text-xs bg-surface-container-high px-1 py-0.5 rounded">
                drive.file
              </code>{' '}
              scope, which only allows access to files created by the app. Scribe
              Steel cannot read, modify, or delete any other files in your Google
              Drive.
            </p>
            <p>
              The app does not access your Google profile, contacts, email, or
              any other Google services.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-headline font-semibold text-on-surface">
              Limited Use of Google User Data
            </h2>
            <p>
              Scribe Steel's use and transfer to any other app of information
              received from Google APIs will adhere to the{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:text-primary/80"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements. Document content (the
              bodies of files you save through Scribe Steel) is stored only in
              your own Google Drive and is not transmitted to any third party.
              Diagnostic telemetry sent to Sentry (described under "Error
              Monitoring" below) consists of error metadata and request URLs,
              not document content.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-headline font-semibold text-on-surface">
              Data Stored in Your Browser
            </h2>
            <p>
              Scribe Steel stores a small amount of data in your browser's local
              storage to improve your experience:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                <strong className="text-on-surface">OAuth token</strong> — a
                short-lived access token for Google Drive, so you stay signed in
                across page reloads. It expires automatically and is cleared when
                you sign out.
              </li>
              <li>
                <strong className="text-on-surface">Document index cache</strong>{' '}
                — a cached list of your document names and IDs, so pages load
                faster. No document content is cached.
              </li>
              <li>
                <strong className="text-on-surface">App settings</strong> — your
                preferences (default zoom, print-friendly mode).
              </li>
            </ul>
            <p>
              This locally stored data is never sent to any server controlled
              by Scribe Steel.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-headline font-semibold text-on-surface">
              Error Monitoring
            </h2>
            <p>
              Scribe Steel uses{' '}
              <a
                href="https://sentry.io/privacy/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:text-primary/80"
              >
                Sentry
              </a>{' '}
              for error monitoring and a small amount of performance
              diagnostics. When an error occurs, Sentry receives the stack
              trace, the page URL, browser/device information, and a
              breadcrumb trail of recent activity (clicks, navigation, and
              outgoing API request URLs with status codes). On a small sampled
              fraction of normal page loads, Sentry also records timing data
              for navigations and fetches.
            </p>
            <p>
              Sentry does not store your IP address, cookies, document
              content, or any user account information. Drive API request URLs
              recorded in breadcrumbs may contain fileIds, but never document
              bodies. No advertising or third-party analytics tracking is used.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-headline font-semibold text-on-surface">
              Third-Party Services
            </h2>
            <p>The app loads resources from these third-party services:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                <strong className="text-on-surface">Google Fonts</strong> — for
                typefaces used in the interface and generated documents
              </li>
              <li>
                <strong className="text-on-surface">Google Identity Services</strong>{' '}
                — for the sign-in flow
              </li>
              <li>
                <strong className="text-on-surface">Google Drive API</strong> —
                for saving and loading your documents
              </li>
              <li>
                <strong className="text-on-surface">Sentry</strong> — for error
                monitoring and diagnostics
              </li>
            </ul>
            <p>
              These services are subject to{' '}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:text-primary/80"
              >
                Google's Privacy Policy
              </a>
              .
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-headline font-semibold text-on-surface">
              Revoking Access
            </h2>
            <p>
              You can disconnect Scribe Steel from your Google account at any
              time:
            </p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>
                Go to your{' '}
                <a
                  href="https://myaccount.google.com/connections"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  Google account connections
                </a>
              </li>
              <li>Find Scribe Steel and click Remove Access</li>
            </ol>
            <p>
              Files already saved to your Google Drive will remain there — they
              are your files and are not affected by revoking the app's access.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-headline font-semibold text-on-surface">
              Contact
            </h2>
            <p>
              If you have questions about this policy, you can open an issue on{' '}
              <a
                href="https://github.com/timothy-s-dev/scribe-steel"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:text-primary/80"
              >
                GitHub
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
