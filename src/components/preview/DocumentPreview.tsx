import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Toolbar } from './Toolbar';
import { SvgPage } from './SvgPage';
import { useTypstCompiler } from '@/hooks/useTypstCompiler';
import { useZoom } from '@/hooks/useZoom';
import { useSettings } from '@/hooks/queries/useSettings';
import { compilePdf, resetCompiler } from '@/typst/compiler';
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

  // Preview and PDF paths pass different `inputs` to Typst: the preview
  // sets `preview=true` so templates can cap output (we don't want the
  // full bestiary rendering into the DOM just to scroll past it). The
  // PDF export always gets the full document.
  const previewInputs = useMemo(
    () => ({ print: printMode ? 'true' : 'false', preview: 'true' }),
    [printMode],
  );
  const pdfInputs = useMemo(
    () => ({ print: printMode ? 'true' : 'false' }),
    [printMode],
  );

  const { pages, error, loading, truncated } = useTypstCompiler(
    built.source,
    built.files,
    previewInputs,
  );

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
      const pdfBytes = await compilePdf(built.source, built.files, pdfInputs);
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
      // PDF compiles are the largest single allocation the worker makes;
      // reclaim its WASM memory before the user comes back for another
      // edit. The next preview compile will pay the worker-startup cost
      // (WASM init + font preload) but that window is idle anyway.
      resetCompiler();
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
      <div className="flex-1 min-h-0 overflow-hidden relative">
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
        {truncated && pages.length > 0 && (
          <div
            className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 text-xs font-label text-on-surface-variant bg-surface-container px-3 py-2 rounded-sm border border-outline-variant/30 shadow-sm"
            role="status"
          >
            Preview truncated. Export PDF to see the full document.
          </div>
        )}
      </div>
    </div>
  );
}
