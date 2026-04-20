import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Preview } from '@/components/Preview';
import { PreviewToolbar } from '@/components/PreviewToolbar';
import { useZoom } from '@/hooks/useZoom';
import { useSettings } from '@/hooks/queries/useSettings';
import { compilePdf } from '@/typst/compiler';
import type { Document } from '@/documents';

interface DocumentPreviewProps<T> {
  document: Document<T>;
}

// Renders the preview pane for any previewable document: toolbar with
// zoom/print/export + the compiled output. Source and files are derived from
// the document's metadata, so the component is type-agnostic.
export function DocumentPreview<T>({ document }: DocumentPreviewProps<T>) {
  const { settings } = useSettings();
  const [printMode, setPrintMode] = useState(settings.printFriendly);
  const [exporting, setExporting] = useState(false);
  const zoom = useZoom(settings.defaultZoom);

  const buildSource = document.metadata.buildSource;
  const built = useMemo(
    () => (buildSource ? buildSource(document.data) : { source: '', files: [] }),
    [buildSource, document.data],
  );

  const inputs = useMemo(
    () => ({ print: printMode ? 'true' : 'false' }),
    [printMode],
  );

  async function handleExportPdf() {
    setExporting(true);
    try {
      const pdfBytes = await compilePdf(built.source, built.files, inputs);
      if (!pdfBytes) return;
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      const name = (document.data as { name?: string })?.name ?? '';
      a.download = `${name || 'document'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('PDF export failed:', e);
      toast.error('PDF export failed', {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
      <PreviewToolbar
        zoom={zoom}
        printMode={printMode}
        onPrintModeChange={setPrintMode}
        onExportPdf={handleExportPdf}
        exporting={exporting}
      />
      <div className="flex-1 min-h-0 overflow-hidden">
        <Preview content={built.source} template="" files={built.files} zoom={zoom} inputs={inputs} />
      </div>
    </div>
  );
}
