import { useState, useMemo, useCallback, useEffect } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { ChevronRight, ChevronDown, Skull } from 'lucide-react';

type MobileTab = 'select' | 'preview';
import { Preview } from '@/components/Preview';
import { PreviewToolbar } from '@/components/PreviewToolbar';
import { PageHeader } from '@/components/PageHeader';
import { useZoom } from '@/hooks/useZoom';
import { useSettings } from '@/hooks/queries/useSettings';
import { useIndex } from '@/hooks/queries/useIndex';
import { useDocuments } from '@/hooks/queries/useDocument';
import type { IndexItem, MonsterGroup } from '@/data/types';
import type { MonsterSummary } from '@/data/bestiary';
import { compilePdf, type VirtualFile } from '@/typst/compiler';
import type { Monster } from '@/data/types';
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

function monstersOf(item: IndexItem): MonsterSummary[] {
  return (item.monsters as MonsterSummary[] | undefined) ?? [];
}

// Role buckets within a level: Minion (0) → Other (1) → Leader (2).
function roleRank(monster: MonsterSummary): number {
  const roles = monster.roles.map((r) => r.toLowerCase());
  if (roles.some((r) => r.startsWith('minion'))) return 0;
  if (roles.includes('leader')) return 2;
  return 1;
}

function sortedMonsters(monsters: MonsterSummary[]): MonsterSummary[] {
  return [...monsters].sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    const ar = roleRank(a);
    const br = roleRank(b);
    if (ar !== br) return ar - br;
    return a.name.localeCompare(b.name);
  });
}

export function MonsterCardsPage() {
  usePageTitle('Monster Cards');
  const { settings } = useSettings();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [printMode, setPrintMode] = useState(settings.printFriendly);
  const zoom = useZoom(settings.defaultZoom);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [mobileTab, setMobileTab] = useState<MobileTab>('select');

  const { data: index, isLoading: groupsLoading } = useIndex('monsters');
  const groups = index?.items ?? [];

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
        const allSelected = monstersOf(group).every((m) => prev.has(monsterKey(groupName, m.name)));
        for (const m of monstersOf(group)) {
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

  // Derive which groups have selected monsters
  const selectedByGroup = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const key of selected) {
      const [groupName, monsterName] = key.split('\0');
      if (!map.has(groupName)) map.set(groupName, []);
      map.get(groupName)!.push(monsterName);
    }
    return map;
  }, [selected]);

  // Resolve group identifiers (name or fileId) for selected groups
  const selectedGroupIds = useMemo(() => {
    const ids: string[] = [];
    for (const groupName of selectedByGroup.keys()) {
      const entry = groups.find((g) => g.name === groupName);
      if (entry) ids.push(entry.fileId);
    }
    return ids;
  }, [selectedByGroup, groups]);

  const groupQueries = useDocuments<MonsterGroup>('monsters', selectedGroupIds);

  // Derive loaded monsters from query results
  const loadedMonsters = useMemo(() => {
    const monsters: Monster[] = [];
    const groupMap = new Map(
      selectedGroupIds.map((id, i) => [id, groupQueries[i]?.data]),
    );
    for (const [groupName, monsterNames] of selectedByGroup) {
      const entry = groups.find((g) => g.name === groupName);
      const group = entry ? groupMap.get(entry.fileId) : null;
      if (group) {
        for (const name of monsterNames) {
          const m = group.monsters.find((mon) => mon.name === name);
          if (m) monsters.push(m);
        }
      }
    }
    return monsters;
  }, [selectedByGroup, groups, selectedGroupIds, groupQueries]);

  const hasSelection = selected.size > 0;

  // Reset sheet count when selection is cleared
  const [sheetCount, setSheetCount] = useState<number | null>(null);
  useEffect(() => {
    if (!hasSelection) setSheetCount(null);
  }, [hasSelection]);

  const files = useMemo<VirtualFile[]>(
    () => [
      TEMPLATE_FILE,
      ...(loadedMonsters.length > 0
        ? [
            {
              path: '/data/selected-monsters.json',
              content: JSON.stringify(loadedMonsters),
            },
          ]
        : []),
    ],
    [loadedMonsters],
  );

  const source = CARD_SOURCE;

  const inputs = useMemo(
    () => ({ print: printMode ? 'true' : 'false' }),
    [printMode],
  );

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

  const pickerPanel = (
    <div className="flex-1 min-w-0 md:w-80 md:flex-none flex flex-col overflow-hidden md:border-r border-outline-variant/20">
      <div className="hidden md:flex items-center h-11 px-4 py-2 bg-surface-container flex-shrink-0">
        <span className="text-sm font-semibold font-body text-on-surface">
          Monsters
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
        {groupsLoading && (
          <p className="text-xs font-label text-on-surface-variant text-center py-2">
            Loading custom groups...
          </p>
        )}
      </div>

      {/* Selection summary */}
      <div className="px-4 py-3 bg-surface-container flex-shrink-0">
        <div className="text-xs font-label text-on-surface-variant">
          {selected.size} monster
          {selected.size !== 1 ? 's' : ''} selected
          {sheetCount != null && (
            <>
              {' '}
              · {sheetCount} sheet{sheetCount !== 1 ? 's' : ''}
            </>
          )}
        </div>
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
        exportDisabled={!hasSelection}
      />
      <div className="flex-1 min-h-0 overflow-hidden">
        {hasSelection && loadedMonsters.length > 0 ? (
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
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader icon={Skull} title="Monster Cards" />
      {/* Mobile tab toggle */}
      <div className="md:hidden flex bg-surface-container flex-shrink-0 border-b border-outline-variant/20">
        <button
          onClick={() => setMobileTab('select')}
          className={`flex-1 py-2 text-xs font-label font-bold tracking-wide text-center transition-colors ${
            mobileTab === 'select'
              ? 'text-primary border-b-2 border-primary'
              : 'text-on-surface-variant'
          }`}
        >
          Select Monsters
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

      {/* Desktop: side by side */}
      <div className="hidden md:flex flex-1 min-h-0 overflow-hidden">
        {pickerPanel}
        {previewPanel}
      </div>

      {/* Mobile: tab-switched */}
      <div className="md:hidden flex-1 min-h-0 overflow-hidden flex flex-col">
        {mobileTab === 'select' ? pickerPanel : previewPanel}
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
  group: IndexItem;
  selected: Set<string>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onToggleGroup: () => void;
  onToggleMonster: (groupName: string, name: string) => void;
}) {
  const monsters = useMemo(() => sortedMonsters(monstersOf(group)), [group]);
  const allChecked = monsters.every((m) => selected.has(monsterKey(group.name, m.name)));
  const someChecked = monsters.some((m) => selected.has(monsterKey(group.name, m.name)));

  return (
    <div>
      <div className="flex items-center gap-0.5 mb-1">
        <button
          onClick={onToggleCollapse}
          className="flex items-center justify-center w-5 h-5 text-on-surface-variant/50 hover:text-on-surface-variant transition-colors cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label={isCollapsed ? `Expand ${group.name}` : `Collapse ${group.name}`}
        >
          {isCollapsed ? <ChevronRight size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
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
          {!!group.custom && (
            <span className="text-[9px] font-label text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded-sm">
              Custom
            </span>
          )}
        </label>
      </div>

      {!isCollapsed && (
        <div className="space-y-0.5 ml-6">
          {monsters.map((monster) => (
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
          {monsters.length === 0 && (
            <p className="text-xs font-label text-on-surface-variant/50 px-2 py-1">
              No monsters in this group
            </p>
          )}
        </div>
      )}
    </div>
  );
}
