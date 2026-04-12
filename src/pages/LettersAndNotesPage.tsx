import { TypstEditor } from '@/components/TypstEditor';

const TEMPLATE = `\
#set page(paper: "us-letter", margin: 1in)
#set text(size: 11pt)

`;

const INITIAL_CONTENT = `= A Letter from the Archives

#emph[To the esteemed members of the Council,]

I write to you with news from the southern frontier. The iron mines at Hollow Creek have ceased production, and the miners speak of tremors deep beneath the stone.

== Findings

- Strange markings found on the lower tunnel walls
- Equipment abandoned at the third sublevel
- No casualties reported, but morale is dire

#emph[Your faithful servant,] \\
Archivist Maren Voss
`;

export function LettersAndNotesPage() {
  return (
    <div className="h-screen">
      <TypstEditor template={TEMPLATE} initialContent={INITIAL_CONTENT} />
    </div>
  );
}
