import { TypstEditor } from '@/components/TypstEditor';
import lorebookTyp from '@/typst/templates/lorebook.typ?raw';
import type { TemplateSchema } from '@/typst/templateSchema';

const schema: TemplateSchema = {
  name: 'Lore Book',
  importPath: '/templates/lorebook.typ',
  functionName: 'lorebook',
  params: [
    { key: 'title', label: 'Title', type: 'string' },
    { key: 'category', label: 'Category', type: 'string', optional: true },
    { key: 'epigraph', label: 'Epigraph', type: 'content', optional: true },
    {
      key: 'epigraph-attribution',
      label: 'Epigraph Attribution',
      type: 'string',
      optional: true,
    },
    { key: 'description', label: 'Description', type: 'content', optional: true },
  ],
  files: [
    { path: '/templates/lorebook.typ', content: lorebookTyp },
  ],
};

const INITIAL_PARAMS = {
  title: 'Lore of the Demon Court',
  category: 'Chaos Lorebook',
  epigraph:
    'When the last seal cracked, the sky did not fall --- it _opened._',
  'epigraph-attribution': '--- Fragment recovered from the Ash Codex',
  description:
    'This slim volume, bound in cracked leather and clasped with tarnished bronze, was recovered from the ruins of the Athenaeum of Pale Fire. The pages are brittle and carry a faint scent of char. Several passages have been redacted with a thick black ink that resists all attempts at removal.',
};

const INITIAL_CONTENT = `= The First Incursion

The Demon Court's earliest known contact with the mortal plane occurred during the Third Age of the Sundered Realm. A coalition of warlocks, seeking power beyond the boundaries of conventional sorcery, performed a ritual described in the now-lost _Grimoire of Hollow Stars._

The results were catastrophic. The village of Thornhaven was consumed in a pillar of violet flame that burned for seven days. When the fire subsided, only a perfect circle of obsidian remained where the village had stood.

#divider

= The Hierarchy of the Court

The Demon Court operates under a strict hierarchy, though its structure bears little resemblance to mortal governance. At its apex sits the entity known only as the _Pale Sovereign_, whose true name --- if it possesses one --- has never been recorded in any surviving text.

Beneath the Sovereign are the Five Exarchs, each governing a domain of influence:

- *Malachar the Whisperer* --- Lord of secrets and forbidden knowledge
- *Vyrethra the Undying* --- Mistress of corruption and entropy
- *Kael Ashborn* --- Commander of the infernal legions
- *The Faceless One* --- Keeper of pacts and bargains
- *Seraphine of the Thorns* --- Weaver of dreams and madness
`;

export function LoreBooksPage() {
  return (
    <div className="h-screen">
      <TypstEditor
        schema={schema}
        initialContent={INITIAL_CONTENT}
        initialParams={INITIAL_PARAMS}
      />
    </div>
  );
}
