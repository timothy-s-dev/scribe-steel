import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

const DISMISSED_KEY = 'scribe-steel-storage-notice-dismissed';

export function StorageNotice() {
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current || localStorage.getItem(DISMISSED_KEY)) return;
    shown.current = true;

    toast('This app stores data locally in your browser', {
      description:
        'Preferences and cached indexes are kept in local storage. Documents are saved to your Google Drive when signed in.',
      duration: Infinity,
      className: 'storage-notice',
      action: {
        label: 'Privacy Policy',
        onClick: () => {
          window.location.href = '/privacy';
        },
      },
      onDismiss: () => {
        localStorage.setItem(DISMISSED_KEY, '1');
      },
    });
  }, []);

  return null;
}
