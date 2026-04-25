import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { usePageTitle } from '@/hooks/usePageTitle';
import { listTitle, pageTitle } from '@/data/documents/titles';
import type { DocumentMetadata } from '@/data/documents';
import type { DocumentMetaFields } from '@/data/documents/types';
import { DocumentEditor } from './DocumentEditor';

interface EditorPageProps<T extends DocumentMetaFields & { name: string }> {
  type: DocumentMetadata<T>;
  forceDemo?: boolean;
  hideBackButton?: boolean;
}

// Outer shell: routes the URL param through to a DocumentEditor keyed on
// the file identity, so switching docs cleanly drops any internal state.
export function EditorPage<T extends DocumentMetaFields & { name: string }>({
  type,
  forceDemo = false,
  hideBackButton = false,
}: EditorPageProps<T>) {
  usePageTitle(pageTitle(type));
  const navigate = useNavigate();
  const { fileId } = useParams<{ fileId: string }>();
  const effectiveId = forceDemo ? 'demo' : (fileId ?? 'demo');

  const handleNavigateBack = useCallback(
    () => navigate('..', { relative: 'path' }),
    [navigate],
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader icon={type.icon} title={type.sectionTitle ?? listTitle(type)} />
      <DocumentEditor
        key={effectiveId}
        type={type}
        fileId={effectiveId}
        hideBackButton={hideBackButton}
        onNavigateBack={handleNavigateBack}
      />
    </div>
  );
}
