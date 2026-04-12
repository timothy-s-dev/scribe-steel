import { TypstEditor } from '@/components/TypstEditor';

const TEMPLATE = `\
#set page(paper: "us-letter", margin: 1in)
#set text(size: 11pt)

`;

const INITIAL_CONTENT = `= Hello, Typst!

This is a live editor with preview.

== Features

- Side-by-side editing
- Live preview
- PDF export
`;

function App() {
  return <TypstEditor template={TEMPLATE} initialContent={INITIAL_CONTENT} />;
}

export default App;
