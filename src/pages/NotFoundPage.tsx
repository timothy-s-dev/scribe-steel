import { Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';

export function NotFoundPage() {
  usePageTitle('Page Not Found');
  return (
    <div className="h-screen flex flex-col items-center justify-center px-6 text-center">
      <span className="material-symbols-outlined text-6xl text-outline-variant mb-4" aria-hidden="true">
        explore_off
      </span>
      <h1 className="text-2xl font-headline font-bold text-on-surface mb-2">
        Page not found
      </h1>
      <p className="text-sm font-body text-on-surface-variant mb-6">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="text-sm font-label font-bold tracking-widest uppercase text-secondary hover:text-secondary/80 flex items-center gap-2 no-underline"
      >
        <span className="material-symbols-outlined text-lg" aria-hidden="true">arrow_back</span>
        Back to home
      </Link>
    </div>
  );
}
