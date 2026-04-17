import { useState, useMemo, type ComponentType } from 'react';
import { toast } from 'sonner';
import { Editor } from '@/components/Editor';
import { Preview } from '@/components/Preview';
import { PreviewToolbar } from '@/components/PreviewToolbar';
import { TemplateParamsForm } from '@/components/TemplateParamsForm';
import { useZoom } from '@/hooks/useZoom';
import { useSettings } from '@/hooks/queries/useSettings';
import { compilePdf } from '@/typst/compiler';
import {
  generatePreamble,
  type TemplateSchema,
  type ParamsFormProps,
} from '@/typst/templateSchema';

interface TypstEditorProps {
  schema: TemplateSchema;
  content: string;
  params: Record<string, string>;
  onContentChange: (content: string) => void;
  onParamsChange: (params: Record<string, string>) => void;
  paramsForm?: ComponentType<ParamsFormProps>;
  hideEditor?: boolean;
}

type MobileTab = 'edit' | 'preview';

export function TypstEditor({
  schema,
  content,
  params,
  onContentChange,
  onParamsChange,
  paramsForm: ParamsForm,
  hideEditor = false,
}: TypstEditorProps) {
  const { settings } = useSettings();
  const [printMode, setPrintMode] = useState(settings.printFriendly);
  const [mobileTab, setMobileTab] = useState<MobileTab>('edit');
  const [exporting, setExporting] = useState(false);
  const zoom = useZoom(settings.defaultZoom);

  const preamble = useMemo(
    () => generatePreamble(schema, params),
    [schema, params],
  );

  const fullSource = preamble + content;

  const inputs = useMemo(
    () => (printMode ? { print: 'true' } : { print: 'false' }),
    [printMode],
  );

  const handleParamChange = (key: string, value: string) => {
    onParamsChange({ ...params, [key]: value });
  };

  const handleEditorChange = (newFullSource: string) => {
    onContentChange(newFullSource.slice(preamble.length));
  };

  async function handleExportPdf() {
    setExporting(true);
    try {
      const pdfBytes = await compilePdf(fullSource, schema.files, inputs);
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
      toast.error('PDF export failed', {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setExporting(false);
    }
  }

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
          values={params}
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
        onExportPdf={handleExportPdf}
        exporting={exporting}
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
