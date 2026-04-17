import { useState, useCallback, useMemo, type ComponentType } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Editor } from '@/components/Editor';
import { Preview } from '@/components/Preview';
import { TemplateParamsForm } from '@/components/TemplateParamsForm';
import { useZoom, type ZoomState } from '@/hooks/useZoom';
import { useSettings } from '@/hooks/queries/useSettings';
import { Switch } from '@/components/ui/switch';
import { compilePdf, type VirtualFile } from '@/typst/compiler';
import {
  generatePreamble,
  type TemplateSchema,
  type ParamsFormProps,
} from '@/typst/templateSchema';

export interface DocumentData {
  params: Record<string, string>;
  body: string;
}

interface TypstEditorProps {
  schema: TemplateSchema;
  initialContent?: string;
  initialParams?: Record<string, string>;
  paramsForm?: ComponentType<ParamsFormProps>;
  hideEditor?: boolean;
  onChange?: (data: DocumentData) => void;
}

function PreviewToolbar({
  zoom,
  printMode,
  onPrintModeChange,
  fullSource,
  files,
  inputs,
}: {
  zoom: ZoomState;
  printMode: boolean;
  onPrintModeChange: (value: boolean) => void;
  fullSource: string;
  files: VirtualFile[];
  inputs?: Record<string, string>;
}) {
  const [exporting, setExporting] = useState(false);

  async function handleExportPdf() {
    setExporting(true);
    try {
      const pdfBytes = await compilePdf(fullSource, files, inputs);
      if (!pdfBytes) return;
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'document.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('PDF export failed:', e);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-surface-container flex-shrink-0">
      {/* Print toggle — left */}
      <div className="flex-1">
        <label className="flex items-center gap-2 cursor-pointer w-fit">
          <Switch
            size="sm"
            checked={printMode}
            onCheckedChange={onPrintModeChange}
          />
          <span className="text-xs font-label text-on-surface-variant">
            Print-Friendly
          </span>
        </label>
      </div>

      {/* Zoom controls — centered (hidden on mobile) */}
      <div className="hidden sm:flex items-center gap-1.5">
        <button
          onClick={zoom.zoomOut}
          className="p-1 text-on-surface-variant hover:text-primary transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label="Zoom out"
          title="Zoom out"
        >
          <Minus size={18} aria-hidden="true" />
        </button>
        <span className="text-xs font-label text-on-surface-variant w-10 text-center tabular-nums">
          {zoom.zoomPercent}%
        </span>
        <button
          onClick={zoom.zoomIn}
          className="p-1 text-on-surface-variant hover:text-primary transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label="Zoom in"
          title="Zoom in"
        >
          <Plus size={18} aria-hidden="true" />
        </button>
        <div className="w-px h-4 bg-outline-variant/30 mx-1" />
        <button
          onClick={() => zoom.setMode('fit-width')}
          className={`px-2 py-0.5 text-xs font-label rounded-sm transition-colors ${
            zoom.mode === 'fit-width'
              ? 'text-primary bg-surface-container-high'
              : 'text-on-surface-variant hover:text-primary'
          }`}
        >
          Fit Width
        </button>
        <button
          onClick={() => zoom.setMode('fit-page')}
          className={`px-2 py-0.5 text-xs font-label rounded-sm transition-colors ${
            zoom.mode === 'fit-page'
              ? 'text-primary bg-surface-container-high'
              : 'text-on-surface-variant hover:text-primary'
          }`}
        >
          Fit Page
        </button>
      </div>

      {/* Export — right */}
      <div className="flex-1 flex justify-end">
        <button
          onClick={handleExportPdf}
          disabled={exporting}
          className="px-4 py-1.5 text-xs font-label font-bold tracking-wide uppercase bg-surface-container-high text-on-surface-variant rounded-sm hover:bg-surface-bright transition-colors disabled:opacity-50"
        >
          {exporting ? 'Exporting...' : 'Export PDF'}
        </button>
      </div>
    </div>
  );
}

type MobileTab = 'edit' | 'preview';

export function TypstEditor({
  schema,
  initialContent = '',
  initialParams = {},
  paramsForm: ParamsForm,
  hideEditor = false,
  onChange,
}: TypstEditorProps) {
  const { settings } = useSettings();
  const [content, setContent] = useState(initialContent);
  const [paramValues, setParamValues] = useState<Record<string, string>>(initialParams);
  const [printMode, setPrintMode] = useState(settings.printFriendly);
  const [mobileTab, setMobileTab] = useState<MobileTab>('edit');
  const zoom = useZoom(settings.defaultZoom);

  const preamble = useMemo(
    () => generatePreamble(schema, paramValues),
    [schema, paramValues],
  );

  const fullSource = preamble + content;

  const inputs = useMemo(
    () => (printMode ? { print: 'true' } : { print: 'false' }),
    [printMode],
  );

  const handleParamChange = useCallback((key: string, value: string) => {
    setParamValues((prev) => {
      const next = { ...prev, [key]: value };
      onChange?.({ params: next, body: content });
      return next;
    });
  }, [content, onChange]);

  const handleEditorChange = useCallback(
    (newFullSource: string) => {
      const newBody = newFullSource.slice(preamble.length);
      setContent(newBody);
      onChange?.({ params: paramValues, body: newBody });
    },
    [preamble, paramValues, onChange],
  );

  const hasParams = (schema.params?.length ?? 0) > 0;
  const FormComponent = ParamsForm ?? TemplateParamsForm;

  const editorPanel = !hideEditor && (
    <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
      <div className="flex items-center px-4 py-2 bg-surface-container flex-shrink-0">
        <span className="text-sm font-semibold font-body text-on-surface">
          {schema.name}
        </span>
      </div>
      {hasParams && (
        <FormComponent
          params={schema.params!}
          values={paramValues}
          onChange={handleParamChange}
        />
      )}
      <div className="flex-1 min-h-0 overflow-hidden">
        <Editor
          value={fullSource}
          onChange={handleEditorChange}
          readOnlyPrefix={preamble.length}
        />
      </div>
    </div>
  );

  const previewPanel = (
    <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
      <PreviewToolbar
        zoom={zoom}
        printMode={printMode}
        onPrintModeChange={setPrintMode}
        fullSource={fullSource}
        files={schema.files}
        inputs={inputs}
      />
      <div className="flex-1 min-h-0 overflow-hidden">
        <Preview
          content={fullSource}
          template=""
          files={schema.files}
          zoom={zoom}
          inputs={inputs}
        />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Mobile tab toggle */}
      {!hideEditor && (
        <div className="md:hidden flex bg-surface-container flex-shrink-0 border-b border-outline-variant/20">
          <button
            onClick={() => setMobileTab('edit')}
            className={`flex-1 py-2 text-xs font-label font-bold tracking-wide text-center transition-colors ${
              mobileTab === 'edit'
                ? 'text-primary border-b-2 border-primary'
                : 'text-on-surface-variant'
            }`}
          >
            Edit
          </button>
          <button
            onClick={() => setMobileTab('preview')}
            className={`flex-1 py-2 text-xs font-label font-bold tracking-wide text-center transition-colors ${
              mobileTab === 'preview'
                ? 'text-primary border-b-2 border-primary'
                : 'text-on-surface-variant'
            }`}
          >
            Preview
          </button>
        </div>
      )}

      {/* Desktop: side by side */}
      <div className="hidden md:flex flex-1 min-h-0 overflow-hidden">
        {editorPanel}
        {previewPanel}
      </div>

      {/* Mobile: tab-switched */}
      <div className="md:hidden flex-1 min-h-0 overflow-hidden">
        {hideEditor || mobileTab === 'preview' ? previewPanel : editorPanel}
      </div>
    </div>
  );
}
