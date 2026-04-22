import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Toolbar } from './Toolbar';
import { SvgPage } from './SvgPage';
import { useTypstCompiler } from '@/hooks/useTypstCompiler';
import { useZoom } from '@/hooks/useZoom';
import { useSettings } from '@/hooks/queries/useSettings';
import { compilePdf } from '@/typst/compiler';
import type { Document } from '@/documents';

interface DocumentPreviewProps<T> {
  document: Document<T>;
}

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

  const { pages, error, loading } = useTypstCompiler(built.source, built.files, inputs);

  const { setPageDimensions } = zoom;
  const firstPageWidth = pages.length > 0 ? pages[0].width : 0;
  const firstPageHeight = pages.length > 0 ? pages[0].height : 0;
  useEffect(() => {
    if (firstPageWidth > 0 && firstPageHeight > 0) {
      setPageDimensions(firstPageWidth, firstPageHeight);
    }
  }, [firstPageWidth, firstPageHeight, setPageDimensions]);

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
      <Toolbar
        zoom={zoom}
        printMode={printMode}
        onPrintModeChange={setPrintMode}
        onExportPdf={handleExportPdf}
        exporting={exporting}
      />
      <div className="flex-1 min-h-0 overflow-hidden">
        {loading && pages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-outline">
            Loading Typst compiler...
          </div>
        ) : (
          <div
            ref={zoom.setContainerEl}
            className="h-full overflow-auto custom-scrollbar bg-surface-container-low"
          >
            {error && (
              <div className="mx-6 mt-4 rounded-sm bg-tertiary-container/20 p-3 font-label text-xs text-tertiary whitespace-pre-wrap">
                {error}
              </div>
            )}
            {pages.length > 0 && (
              <div className="flex flex-col items-center gap-4 py-6">
                {pages.map((page, i) => (
                  <SvgPage key={i} page={page} zoom={zoom.effectiveZoom} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
