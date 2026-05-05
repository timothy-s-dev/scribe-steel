import { describe, expect, it } from 'vitest';
import { EditorState, EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import {
  insertAtCursor,
  setHeadingLevel,
  togglePrefixOnSelectedLines,
  toggleWrap,
} from '@/lib/editor/typst-commands';

function makeView(doc: string, selection?: { anchor: number; head?: number }): EditorView {
  const state = EditorState.create({
    doc,
    selection: selection
      ? EditorSelection.create([
          EditorSelection.range(selection.anchor, selection.head ?? selection.anchor),
        ])
      : undefined,
  });
  return new EditorView({ state });
}

describe('toggleWrap', () => {
  it('wraps an empty selection and places the cursor between markers', () => {
    const view = makeView('', { anchor: 0 });
    toggleWrap(view, '*', '*');
    expect(view.state.doc.toString()).toBe('**');
    expect(view.state.selection.main.from).toBe(1);
    expect(view.state.selection.main.empty).toBe(true);
  });

  it('wraps a selection in the given markers', () => {
    const view = makeView('hello world', { anchor: 0, head: 5 });
    toggleWrap(view, '*', '*');
    expect(view.state.doc.toString()).toBe('*hello* world');
  });

  it('unwraps a selection that is already wrapped', () => {
    const view = makeView('*hello* world', { anchor: 0, head: 7 });
    toggleWrap(view, '*', '*');
    expect(view.state.doc.toString()).toBe('hello world');
  });

  it('preserves leading and trailing whitespace inside the selection', () => {
    const view = makeView('  hello  ', { anchor: 0, head: 9 });
    toggleWrap(view, '*', '*');
    expect(view.state.doc.toString()).toBe('  *hello*  ');
  });

  it('does nothing when the selection is inside the read-only preamble', () => {
    const view = makeView('PREAMBLE\nbody', { anchor: 0, head: 4 });
    toggleWrap(view, '*', '*', 9);
    expect(view.state.doc.toString()).toBe('PREAMBLE\nbody');
  });

  it('supports asymmetric markers', () => {
    const view = makeView('text', { anchor: 0, head: 4 });
    toggleWrap(view, '#link("url")[', ']');
    expect(view.state.doc.toString()).toBe('#link("url")[text]');
  });
});

describe('setHeadingLevel', () => {
  it('prepends a heading marker to a plain line', () => {
    const view = makeView('hello', { anchor: 0 });
    setHeadingLevel(view, 1);
    expect(view.state.doc.toString()).toBe('= hello');
  });

  it('changes the level of an existing heading', () => {
    const view = makeView('= hello', { anchor: 0 });
    setHeadingLevel(view, 2);
    expect(view.state.doc.toString()).toBe('== hello');
  });

  it('removes the heading when toggled to the same level', () => {
    const view = makeView('== hello', { anchor: 0 });
    setHeadingLevel(view, 2);
    expect(view.state.doc.toString()).toBe('hello');
  });

  it('applies to every line in a multi-line selection', () => {
    const view = makeView('one\ntwo\nthree', { anchor: 0, head: 13 });
    setHeadingLevel(view, 1);
    expect(view.state.doc.toString()).toBe('= one\n= two\n= three');
  });

  it('toggles off only when every selected line already has the marker', () => {
    // Mixed: one line already has `= `, the other does not. The marker should
    // be added to the missing line and left alone where it's already present —
    // the toggle-off branch only runs when *every* line matches.
    const view = makeView('= one\ntwo', { anchor: 0, head: 9 });
    setHeadingLevel(view, 1);
    expect(view.state.doc.toString()).toBe('= one\n= two');
  });

  it('respects the read-only preamble', () => {
    const view = makeView('PREAMBLE\nbody', { anchor: 0 });
    setHeadingLevel(view, 1, 9);
    expect(view.state.doc.toString()).toBe('PREAMBLE\nbody');
  });
});

describe('togglePrefixOnSelectedLines', () => {
  it('adds a bullet prefix to a single line', () => {
    const view = makeView('hello', { anchor: 0 });
    togglePrefixOnSelectedLines(view, '- ');
    expect(view.state.doc.toString()).toBe('- hello');
  });

  it('adds a numbered prefix across multiple lines', () => {
    const view = makeView('one\ntwo\nthree', { anchor: 0, head: 13 });
    togglePrefixOnSelectedLines(view, '+ ');
    expect(view.state.doc.toString()).toBe('+ one\n+ two\n+ three');
  });

  it('removes the prefix when every selected line already has it', () => {
    const view = makeView('- one\n- two', { anchor: 0, head: 11 });
    togglePrefixOnSelectedLines(view, '- ');
    expect(view.state.doc.toString()).toBe('one\ntwo');
  });

  it('only adds the prefix to lines that lack it (mixed selection)', () => {
    const view = makeView('- one\ntwo', { anchor: 0, head: 9 });
    togglePrefixOnSelectedLines(view, '- ');
    expect(view.state.doc.toString()).toBe('- one\n- two');
  });
});

describe('insertAtCursor', () => {
  it('inserts text at the cursor and advances the cursor past the insertion', () => {
    const view = makeView('hello world', { anchor: 5 });
    insertAtCursor(view, ' bright');
    expect(view.state.doc.toString()).toBe('hello bright world');
    expect(view.state.selection.main.from).toBe(12);
  });

  it('replaces a non-empty selection', () => {
    const view = makeView('hello world', { anchor: 0, head: 5 });
    insertAtCursor(view, 'goodbye');
    expect(view.state.doc.toString()).toBe('goodbye world');
  });

  it('respects the read-only preamble', () => {
    const view = makeView('PREAMBLE\nbody', { anchor: 0 });
    insertAtCursor(view, 'X', 9);
    expect(view.state.doc.toString()).toBe('PREAMBLE\nbody');
  });
});
