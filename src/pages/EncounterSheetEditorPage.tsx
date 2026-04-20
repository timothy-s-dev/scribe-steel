import { useCallback, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { toast } from 'sonner';
import { Preview } from '@/components/Preview';
import { PreviewToolbar } from '@/components/PreviewToolbar';
import { useZoom } from '@/hooks/useZoom';
import { useSettings } from '@/hooks/queries/useSettings';
import { useDocument } from '@/hooks/queries/useDocument';
import { useIndex } from '@/hooks/queries/useIndex';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useDocumentSync } from '@/hooks/useDocumentSync';
import { EditorPage } from '@/components/EditorPage';
import { EncounterForm } from '@/components/forms/EncounterForm';
import { compilePdf, type VirtualFile } from '@/typst/compiler';
import { encountersMetadata, type EncounterDocument } from '@/documents/encounters';
import encounterTyp from '@/typst/templates/encounter.typ?raw';

type MobileTab = 'edit' | 'preview';

const TEMPLATE_FILE: VirtualFile = {
  path: '/templates/encounter.typ',
  content: encounterTyp,
};

function stripMetadata(saved: EncounterDocument): Omit<EncounterDocument, 'updatedAt'> {
  const { updatedAt: _ignored, ...rest } = saved;
  return rest;
}

export function EncounterSheetEditorPage() {
  usePageTitle('Encounter Sheet');
  const { fileId } = useParams<{ fileId: string }>();
  const isDemo = fileId === 'demo';
  const { data: loaded, isLoading: loading, error: loadError } = useDocument<EncounterDocument>(
    'encounters',
    isDemo ? undefined : fileId,
    { enabled: !isDemo },
  );
  const error = loadError ? 'Failed to load encounter' : null;

  const { data: indexData } = useIndex('encounters');

  const [saved, setSaved] = useState<EncounterDocument | null>(() =>
    isDemo ? encountersMetadata.createDefault('') : null,
  );
  const [resetKey, setResetKey] = useState(0);

  const { settings } = useSettings();
  const [printMode, setPrintMode] = useState(settings.printFriendly);
  const [mobileTab, setMobileTab] = useState<MobileTab>('edit');
  const zoom = useZoom(settings.defaultZoom);

  const docName = isDemo
    ? 'Demo'
    : (saved?.encounter || indexData?.items.find((i) => i.fileId === fileId)?.name || '');

  const { triggerSave, flush, saveStatus } = useAutoSave({
    category: 'encounters',
    name: docName,
    fileId: isDemo ? null : (fileId ?? null),
    onSaved: (result) => sync.markSaved(result.data),
  });

  const sync = useDocumentSync<EncounterDocument>({
    loaded: isDemo ? undefined : loaded,
    currentLocal: saved,
    initialize: (next) => {
      setSaved(next);
      setResetKey((k) => k + 1);
    },
    isEqualToLocal: (next) => {
      if (!saved) return false;
      return JSON.stringify(stripMetadata(next)) === JSON.stringify(stripMetadata(saved));
    },
    getUpdatedAt: (s) => s.updatedAt,
    triggerSave,
    flush,
  });

  const handleChange = useCallback(
    (next: EncounterDocument) => {
      setSaved(next);
      if (isDemo || sync.conflict) return;
      triggerSave(next);
    },
    [isDemo, sync.conflict, triggerSave],
  );

  const encounterData = useMemo(
    () => (saved ? stripMetadata(saved) : null),
    [saved],
  );

  const source = useMemo(() => {
    const lines = [
      '#import "/templates/encounter.typ": *',
      '#let _data = json("/data/encounter.json")',
      '#show: encounter-sheet.with(',
      '  encounter: _data.encounter,',
      '  objective: _data.objective,',
      '  victory: _data.victory,',
      '  failure: _data.failure,',
      '  malice: _data.malice,',
      '  groups: _data.groups,',
      ')',
      '',
    ];
    if (saved?.notes.trim()) lines.push(saved.notes);
    return lines.join('\n');
  }, [saved?.notes, encounterData]);

  const files = useMemo<VirtualFile[]>(
    () => [
      TEMPLATE_FILE,
      { path: '/data/encounter.json', content: JSON.stringify(encounterData ?? {}) },
    ],
    [encounterData],
  );

  const inputs = useMemo(
    () => ({ print: printMode ? 'true' : 'false' }),
    [printMode],
  );

  const [exporting, setExporting] = useState(false);
  async function handleExportPdf() {
    setExporting(true);
    try {
      const pdfBytes = await compilePdf(source, files, inputs);
      if (!pdfBytes) return;
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${saved?.encounter || 'encounter-sheet'}.pdf`;
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

  const formPanel = saved ? (
    <EncounterForm key={resetKey} initialSaved={saved} onChange={handleChange} />
  ) : null;

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
        <Preview content={source} template="" files={files} zoom={zoom} inputs={inputs} />
      </div>
    </div>
  );

  return (
    <EditorPage
      loading={loading}
      error={error}
      metadata={encountersMetadata}
      title={docName || 'Encounter Sheet'}
      saveStatus={isDemo ? undefined : saveStatus}
      sync={isDemo ? undefined : sync}
    >
      <div className="flex flex-col h-full overflow-hidden">
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

        <div className="hidden md:flex flex-1 min-h-0 overflow-hidden">
          {formPanel}
          {previewPanel}
        </div>

        <div className="md:hidden flex-1 min-h-0 overflow-hidden flex flex-col">
          {mobileTab === 'edit' ? formPanel : previewPanel}
        </div>
      </div>
    </EditorPage>
  );
}
