import { Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Compass, ArrowLeft } from 'lucide-react';

export function NotFoundPage() {
  usePageTitle('Page Not Found');
  return (
    <div className="h-full flex flex-col items-center justify-center px-6 text-center">
      <Compass size={56} className="text-outline-variant mb-4" aria-hidden="true" />
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
        <ArrowLeft size={18} aria-hidden="true" />
        Back to home
      </Link>
    </div>
  );
}
