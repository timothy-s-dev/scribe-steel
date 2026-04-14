import { useState, useMemo, useCallback } from 'react';
import { Preview } from '@/components/Preview';
import { useZoom } from '@/hooks/useZoom';
import { Switch } from '@/components/ui/switch';
import { compilePdf, type VirtualFile } from '@/typst/compiler';
import { getFactions, getAllMonsters } from '@/data/bestiary';
import monsterCardTyp from '@/typst/templates/monster-card.typ?raw';

const TEMPLATE_FILE: VirtualFile = {
  path: '/templates/monster-card.typ',
  content: monsterCardTyp,
};

const CARD_SOURCE = [
  '#import "/templates/monster-card.typ": *',
  '#let _monsters = json("/data/selected-monsters.json")',
  '#show: monster-card-sheet.with(monsters: _monsters)',
].join('\n');

export function MonsterCardsPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [printMode, setPrintMode] = useState(false);
  const zoom = useZoom();

  const factions = getFactions();

  const toggleMonster = useCallback((name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const toggleFaction = useCallback(
    (factionName: string) => {
      const faction = factions.find((f) => f.name === factionName);
      if (!faction) return;
      setSelected((prev) => {
        const next = new Set(prev);
        const allSelected = faction.monsters.every((m) => prev.has(m.name));
        for (const m of faction.monsters) {
          if (allSelected) next.delete(m.name);
          else next.add(m.name);
        }
        return next;
      });
    },
    [factions],
  );

  const selectedMonsters = useMemo(
    () => getAllMonsters().filter((m) => selected.has(m.name)),
    [selected],
  );

  const hasSelection = selectedMonsters.length > 0;

  const files = useMemo<VirtualFile[]>(
    () => [
      TEMPLATE_FILE,
      ...(hasSelection
        ? [
            {
              path: '/data/selected-monsters.json',
              content: JSON.stringify(selectedMonsters),
            },
          ]
        : []),
    ],
    [selectedMonsters, hasSelection],
  );

  const source = CARD_SOURCE;

  const inputs = useMemo(
    () => ({ print: printMode ? 'true' : 'false' }),
    [printMode],
  );

  const sheetCount = Math.ceil(selectedMonsters.length / 3);

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
      a.download = 'monster-cards.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('PDF export failed:', e);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left column: monster picker */}
      <div className="w-80 flex-shrink-0 flex flex-col overflow-hidden border-r border-outline-variant/20">
        <div className="flex items-center px-4 py-2 bg-surface-container flex-shrink-0">
          <span className="text-sm font-semibold font-body text-on-surface">
            Monster Cards
          </span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 space-y-4">
          {factions.map((faction) => {
            const allChecked = faction.monsters.every((m) =>
              selected.has(m.name),
            );
            const someChecked = faction.monsters.some((m) =>
              selected.has(m.name),
            );

            return (
              <div key={faction.name}>
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={(el) => {
                      if (el) el.indeterminate = someChecked && !allChecked;
                    }}
                    onChange={() => toggleFaction(faction.name)}
                    className="accent-primary"
                  />
                  <span className="text-xs font-label font-bold tracking-wide uppercase text-on-surface-variant">
                    {faction.name}
                  </span>
                </label>

                <div className="space-y-0.5 ml-1">
                  {faction.monsters.map((monster) => (
                    <label
                      key={monster.name}
                      className="flex items-start gap-2 cursor-pointer py-1 px-2 rounded-sm hover:bg-surface-container-low transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(monster.name)}
                        onChange={() => toggleMonster(monster.name)}
                        className="accent-primary mt-0.5"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-body text-on-surface leading-tight">
                          {monster.name}
                        </div>
                        <div className="text-xs font-label text-on-surface-variant">
                          L{monster.level} {monster.role} · EV {monster.ev}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selection summary */}
        <div className="px-4 py-3 bg-surface-container flex-shrink-0">
          <div className="text-xs font-label text-on-surface-variant">
            {selectedMonsters.length} monster
            {selectedMonsters.length !== 1 ? 's' : ''} selected
            {hasSelection && (
              <>
                {' '}
                · {sheetCount} sheet{sheetCount !== 1 ? 's' : ''}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right column: preview */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-surface-container flex-shrink-0">
          <div className="flex-1">
            <label className="flex items-center gap-2 cursor-pointer w-fit">
              <Switch
                size="sm"
                checked={printMode}
                onCheckedChange={setPrintMode}
              />
              <span className="text-xs font-label text-on-surface-variant">
                Print-Friendly
              </span>
            </label>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={zoom.zoomOut}
              className="p-1 text-on-surface-variant hover:text-primary transition-colors"
              title="Zoom out"
            >
              <span className="material-symbols-outlined text-lg">remove</span>
            </button>
            <span className="text-xs font-label text-on-surface-variant w-10 text-center tabular-nums">
              {zoom.zoomPercent}%
            </span>
            <button
              onClick={zoom.zoomIn}
              className="p-1 text-on-surface-variant hover:text-primary transition-colors"
              title="Zoom in"
            >
              <span className="material-symbols-outlined text-lg">add</span>
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

          <div className="flex-1 flex justify-end">
            <button
              onClick={handleExportPdf}
              disabled={exporting || !hasSelection}
              className="px-4 py-1.5 text-xs font-label font-bold tracking-wide uppercase bg-surface-container-high text-on-surface-variant rounded-sm hover:bg-surface-bright transition-colors disabled:opacity-50"
            >
              {exporting ? 'Exporting...' : 'Export PDF'}
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {hasSelection ? (
            <Preview
              content={source}
              template=""
              files={files}
              zoom={zoom}
              inputs={inputs}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-surface-container-low">
              <p className="text-2xl font-body text-on-surface-variant/70">
                Select monsters to generate cards
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
