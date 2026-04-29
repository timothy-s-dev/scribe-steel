import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Toolbar } from './Toolbar';
import { SvgPage } from './SvgPage';
import type { ParsedPage } from '@/hooks/useTypstCompiler';
import { useZoom } from '@/hooks/useZoom';
import { useSettings } from '@/hooks/queries/useSettings';
import { compilePdf, resetCompiler, type VirtualFile } from '@/lib/typst/compiler';
import type { Document } from '@/data/documents';

interface DocumentPreviewProps<T> {
  document: Document<T>;
  // Compile state owned by the parent — see EditorBody. Lifting the compile
  // up keeps it running while the user is on the mobile "edit" tab so the
  // form's lint markers stay live.
  pages: ParsedPage[];
  error: string | null;
  loading: boolean;
  truncated: boolean;
  built: { source: string; files: VirtualFile[] };
  printMode: boolean;
  onPrintModeChange: (next: boolean) => void;
  pdfInputs: Record<string, string>;
}

export function DocumentPreview<T>({
  document,
  pages,
  error,
  loading,
  truncated,
  built,
  printMode,
  onPrintModeChange,
  pdfInputs,
}: DocumentPreviewProps<T>) {
  const { settings } = useSettings();
  const [exporting, setExporting] = useState(false);
  const zoom = useZoom(settings.defaultZoom);

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
      const result = await compilePdf(built.source, built.files, pdfInputs);
      const pdfBytes = result.pdf;
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
        onPrintModeChange={onPrintModeChange}
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
