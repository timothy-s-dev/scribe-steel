import { useMemo, useState, type ReactNode } from 'react';
import { DocumentPreview } from '@/components/preview';
import type { DocumentMetadata } from '@/data/documents';
import type { DocumentMetaFields } from '@/data/documents/types';
import { useTypstCompiler } from '@/hooks/useTypstCompiler';
import { useSettings } from '@/hooks/queries/useSettings';

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
  const { settings } = useSettings();
  const [mobileTab, setMobileTab] = useState<MobileTab>('edit');
  const [printMode, setPrintMode] = useState(settings.printFriendly);

  const hasPreview = !!type.buildSource;
  const FormComponent = type.FormComponent;

  // The compile pipeline lives here (rather than inside DocumentPreview) so
  // diagnostics keep flowing while the user is on the mobile "edit" tab —
  // otherwise the preview unmounts and the editor's lint markers freeze.
  const buildSource = type.buildSource;
  const built = useMemo(
    () =>
      data && buildSource
        ? buildSource(data)
        : { source: '', files: [], userContentLineOffset: 0 },
    [buildSource, data],
  );

  // Preview and PDF paths pass different `inputs` to Typst: the preview sets
  // `preview=true` so templates can cap output (we don't want the full
  // bestiary rendering into the DOM just to scroll past it). The PDF export
  // always gets the full document.
  const previewInputs = useMemo(
    () => ({ print: printMode ? 'true' : 'false', preview: 'true' }),
    [printMode],
  );
  const pdfInputs = useMemo(
    () => ({ print: printMode ? 'true' : 'false' }),
    [printMode],
  );

  const { pages, error, editorDiagnostics, loading, truncated } = useTypstCompiler(
    built.source,
    built.files,
    previewInputs,
    built.userContentLineOffset ?? 0,
  );

  // While loading, dim and disable the form. `contents` keeps the wrapper
  // transparent to the surrounding flex layout so the form's own flex
  // sizing still applies.
  const formPanelWrapperClass = isLoading
    ? 'contents [&>*]:pointer-events-none [&>*]:opacity-50'
    : 'contents';
  const formPanel = data ? (
    <div className={formPanelWrapperClass}>
      <FormComponent
        key={formResetToken}
        value={data}
        onChange={onEdit}
        editorDiagnostics={editorDiagnostics}
      />
    </div>
  ) : null;

  const previewPanel = hasPreview && data ? (
    <DocumentPreview
      document={{ metadata: type, data, fileId }}
      pages={pages}
      error={error}
      loading={loading}
      truncated={truncated}
      built={built}
      printMode={printMode}
      onPrintModeChange={setPrintMode}
      pdfInputs={pdfInputs}
    />
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
