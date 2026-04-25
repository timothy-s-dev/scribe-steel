import { useState, type ReactNode } from 'react';
import { DocumentPreview } from '@/components/preview';
import type { DocumentMetadata } from '@/data/documents';
import type { DocumentMetaFields } from '@/data/documents/types';

type MobileTab = 'edit' | 'preview';

interface EditorBodyProps<T extends DocumentMetaFields & { name: string }> {
  type: DocumentMetadata<T>;
  data: T | undefined;
  fileId: string;
  isLoading: boolean;
  formResetToken: number;
  onEdit: (next: T) => void;
}

export function EditorBody<T extends DocumentMetaFields & { name: string }>({
  type,
  data,
  fileId,
  isLoading,
  formResetToken,
  onEdit,
}: EditorBodyProps<T>) {
  const [mobileTab, setMobileTab] = useState<MobileTab>('edit');

  const hasPreview = !!type.buildSource;
  const FormComponent = type.FormComponent;

  // While loading, dim and disable the form. `contents` keeps the wrapper
  // transparent to the surrounding flex layout so the form's own flex
  // sizing still applies.
  const formPanelWrapperClass = isLoading
    ? 'contents [&>*]:pointer-events-none [&>*]:opacity-50'
    : 'contents';
  const formPanel = data ? (
    <div className={formPanelWrapperClass}>
      <FormComponent key={formResetToken} value={data} onChange={onEdit} />
    </div>
  ) : null;

  const previewPanel = hasPreview && data ? (
    <DocumentPreview document={{ metadata: type, data, fileId }} />
  ) : null;

  if (!hasPreview) return formPanel;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="md:hidden flex bg-surface-container flex-shrink-0 border-b border-outline-variant/20">
        <TabButton active={mobileTab === 'edit'} onClick={() => setMobileTab('edit')}>Edit</TabButton>
        <TabButton active={mobileTab === 'preview'} onClick={() => setMobileTab('preview')}>Preview</TabButton>
      </div>
      <div className="hidden md:flex flex-1 min-h-0 overflow-hidden">
        {formPanel}
        {previewPanel}
      </div>
      <div className="md:hidden flex-1 min-h-0 overflow-hidden flex flex-col">
        {mobileTab === 'edit' ? formPanel : previewPanel}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 text-xs font-label font-bold tracking-wide text-center transition-colors ${
        active ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant'
      }`}
    >
      {children}
    </button>
  );
}
