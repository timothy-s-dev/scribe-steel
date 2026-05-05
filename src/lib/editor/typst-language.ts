import {
  defineLanguageFacet,
  Language,
  LanguageSupport,
} from '@codemirror/language';
import { StateField } from '@codemirror/state';
import { TypstParser, typstHighlight } from 'codemirror-lang-typst';

// codemirror-lang-typst@0.4.0 ships a `typst()` factory that wires up an
// incremental update listener. That listener calls into the typst-syntax
// WASM parser's `edit(...)` method on every document change. For some
// edits (notably backspacing inside an existing document) the underlying
// Rust crate panics with `unwrap()` on `None`, which traps the entire WASM
// instance and crashes the editor. The package has no try/catch and no way
// to disable incremental edits.
//
// We rebuild the LanguageSupport here using the package's exported
// primitives but swap the update listener for one that always clears the
// parser state on document change — forcing `createParse` to instantiate a
// fresh WASM parser on the next parse cycle. We pay a full reparse per
// keystroke, but typst's parser is fast enough on the document sizes this
// app handles, and the alternative is a hard crash.
//
// Drop this once codemirror-lang-typst either fixes the panic or exposes a
// way to opt out of incremental parsing.
const data = defineLanguageFacet({
  commentTokens: { block: { open: '/*', close: '*/' } },
});

function safeUpdateListener(parser: TypstParser): StateField<null> {
  return StateField.define<null>({
    create: () => null,
    update: (_value, tr) => {
      if (tr.docChanged) parser.clearParser();
      return null;
    },
  });
}

// codemirror-lang-typst's TypstParser constructor takes a `typstHighlight`
// NodePropSource, but its bundled `.d.ts` omits the constructor signature
// and falls back to the parent `Parser`'s 0-arg constructor — the cast
// papers over that gap.
type TypstParserCtor = new (highlight: typeof typstHighlight) => TypstParser;

export function typstLanguage(): LanguageSupport {
  const parser = new (TypstParser as unknown as TypstParserCtor)(typstHighlight);
  return new LanguageSupport(
    new Language(data, parser, [safeUpdateListener(parser)], 'typst'),
  );
}
