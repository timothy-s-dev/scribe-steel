import { useState, useMemo, useCallback, useEffect } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Preview } from '@/components/Preview';
import { useZoom } from '@/hooks/useZoom';
import { useSettings } from '@/hooks/useSettings';
import { useAllGroups, type TaggedGroup } from '@/hooks/useAllGroups';
import { Switch } from '@/components/ui/switch';
import { compilePdf, type VirtualFile } from '@/typst/compiler';
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

function monsterKey(groupName: string, monsterName: string) {
  return `${groupName}\0${monsterName}`;
}

export function MonsterCardsPage() {
  usePageTitle('Monster Cards');
  const { settings } = useSettings();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [printMode, setPrintMode] = useState(settings.printFriendly);
  const zoom = useZoom(settings.defaultZoom);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const groups = useAllGroups();

  const toggleMonster = useCallback((groupName: string, name: string) => {
    const key = monsterKey(groupName, name);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleGroup = useCallback(
    (groupName: string) => {
      const group = groups.find((g) => g.name === groupName);
      if (!group) return;
      setSelected((prev) => {
        const next = new Set(prev);
        const allSelected = group.monsters.every((m) => prev.has(monsterKey(groupName, m.name)));
        for (const m of group.monsters) {
          const key = monsterKey(groupName, m.name);
          if (allSelected) next.delete(key);
          else next.add(key);
        }
        return next;
      });
    },
    [groups],
  );

  const toggleExpanded = useCallback((groupName: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName);
      else next.add(groupName);
      return next;
    });
  }, []);

  const selectedMonsters = useMemo(
    () =>
      groups.flatMap((g) =>
        g.monsters.filter((m) => selected.has(monsterKey(g.name, m.name))),
      ),
    [selected, groups],
  );

  const hasSelection = selectedMonsters.length > 0;

  // Reset sheet count when selection is cleared
  useEffect(() => {
    if (!hasSelection) setSheetCount(null);
  }, [hasSelection]);

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

  const [sheetCount, setSheetCount] = useState<number | null>(null);
  const handlePageCount = useCallback((count: number) => {
    // Each sheet = 2 pages (front + back)
    setSheetCount(Math.ceil(count / 2));
  }, []);

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
          {groups.map((group) => (
            <GroupPicker
              key={group.name}
              group={group}
              selected={selected}
              isCollapsed={!expanded.has(group.name)}
              onToggleCollapse={() => toggleExpanded(group.name)}
              onToggleGroup={() => toggleGroup(group.name)}
              onToggleMonster={toggleMonster}
            />
          ))}
        </div>

        {/* Selection summary */}
        <div className="px-4 py-3 bg-surface-container flex-shrink-0">
          <div className="text-xs font-label text-on-surface-variant">
            {selectedMonsters.length} monster
            {selectedMonsters.length !== 1 ? 's' : ''} selected
            {sheetCount != null && (
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
              className="p-1 text-on-surface-variant hover:text-primary transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              aria-label="Zoom out"
              title="Zoom out"
            >
              <span className="material-symbols-outlined text-lg" aria-hidden="true">remove</span>
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
              <span className="material-symbols-outlined text-lg" aria-hidden="true">add</span>
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
              onPageCount={handlePageCount}
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

// ── Group picker sub-component ───────────────────────────────────────────────

function GroupPicker({
  group,
  selected,
  isCollapsed,
  onToggleCollapse,
  onToggleGroup,
  onToggleMonster,
}: {
  group: TaggedGroup;
  selected: Set<string>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onToggleGroup: () => void;
  onToggleMonster: (groupName: string, name: string) => void;
}) {
  const allChecked = group.monsters.every((m) => selected.has(monsterKey(group.name, m.name)));
  const someChecked = group.monsters.some((m) => selected.has(monsterKey(group.name, m.name)));

  return (
    <div>
      <div className="flex items-center gap-0.5 mb-1">
        <button
          onClick={onToggleCollapse}
          className="flex items-center justify-center w-5 h-5 text-on-surface-variant/50 hover:text-on-surface-variant transition-colors cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label={isCollapsed ? `Expand ${group.name}` : `Collapse ${group.name}`}
        >
          <span className="material-symbols-outlined text-base leading-none" aria-hidden="true">
            {isCollapsed ? 'chevron_right' : 'expand_more'}
          </span>
        </button>
        <label className="flex items-center gap-2 cursor-pointer flex-1">
          <input
            type="checkbox"
            checked={allChecked}
            ref={(el) => {
              if (el) el.indeterminate = someChecked && !allChecked;
            }}
            onChange={onToggleGroup}
            className="accent-primary -mt-px"
          />
          <span className="text-xs font-label font-bold tracking-wide uppercase text-on-surface-variant">
            {group.name}
          </span>
          {group.custom && (
            <span className="text-[9px] font-label text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded-sm">
              Custom
            </span>
          )}
        </label>
      </div>

      {!isCollapsed && (
        <div className="space-y-0.5 ml-6">
          {group.monsters.map((monster) => (
            <label
              key={monster.name}
              className="flex items-start gap-2 cursor-pointer py-1 px-2 rounded-sm hover:bg-surface-container-low transition-colors"
            >
              <input
                type="checkbox"
                checked={selected.has(monsterKey(group.name, monster.name))}
                onChange={() => onToggleMonster(group.name, monster.name)}
                className="accent-primary mt-0.5"
              />
              <div className="min-w-0">
                <div className="text-sm font-body text-on-surface leading-tight">
                  {monster.name}
                </div>
                <div className="text-xs font-label text-on-surface-variant">
                  L{monster.level} {monster.roles.join(', ')} · EV {monster.ev ?? '-'}
                </div>
              </div>
            </label>
          ))}
          {group.monsters.length === 0 && (
            <p className="text-xs font-label text-on-surface-variant/50 px-2 py-1">
              No monsters in this group
            </p>
          )}
        </div>
      )}
    </div>
  );
}
