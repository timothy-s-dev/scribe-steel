import { TypstEditor } from '@/components/TypstEditor';
import handwrittenTyp from '@/typst/templates/handwritten.typ?raw';
import type { TemplateSchema } from '@/typst/templateSchema';

const schema: TemplateSchema = {
  name: 'Handwritten Note',
  importPath: '/templates/handwritten.typ',
  functionName: 'handwritten',
  params: [
    { key: 'title', label: 'Title', type: 'string', optional: true },
  ],
  files: [
    { path: '/templates/handwritten.typ', content: handwrittenTyp },
  ],
};

const INITIAL_CONTENT = `_To the esteemed members of the Council,_

I write to you with news from the southern frontier. The iron mines at Hollow Creek have ceased production, and the miners speak of tremors deep beneath the stone.

The foreman, a dwarf named Korgan Deepdelve, insists the tunnels are structurally sound --- but his workers tell a different story. They speak of whispers in the dark, of tools found rearranged after the night shift, and of a cold draft that carries the scent of sulfur.

I have taken the liberty of posting a small guard at the mine entrance. I trust you will send further instruction.

_Your faithful servant,_ \\
_Archivist Maren Voss_
`;

export function LettersAndNotesPage() {
  return (
    <div className="h-screen">
      <TypstEditor
        schema={schema}
        initialContent={INITIAL_CONTENT}
        initialParams={{ title: 'A Letter from the Archives' }}
      />
    </div>
  );
}
