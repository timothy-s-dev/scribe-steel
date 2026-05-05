import type { EditorView } from '@codemirror/view';
import type { ChangeSpec, EditorState, Line } from '@codemirror/state';
import { EditorSelection } from '@codemirror/state';

/**
 * Wraps the primary selection in `prefix`/`suffix`. If the selection is
 * already wrapped (allowing leading/trailing whitespace), the wrapping is
 * stripped instead. With an empty selection, inserts the marker pair and
 * places the cursor between them.
 */
export function toggleWrap(
  view: EditorView,
  prefix: string,
  suffix: string,
  readOnlyPrefix = 0,
): void {
  const sel = view.state.selection.main;
  if (sel.from < readOnlyPrefix) return;

  if (sel.empty) {
    view.dispatch({
      changes: { from: sel.from, insert: prefix + suffix },
      selection: EditorSelection.cursor(sel.from + prefix.length),
    });
    view.focus();
    return;
  }

  const text = view.state.sliceDoc(sel.from, sel.to);
  const trimStart = text.match(/^\s*/)?.[0].length ?? 0;
  const trimEnd = text.match(/\s*$/)?.[0].length ?? 0;
  const inner = text.slice(trimStart, text.length - trimEnd);

  let replacement: string;
  if (
    inner.startsWith(prefix) &&
    inner.endsWith(suffix) &&
    inner.length >= prefix.length + suffix.length
  ) {
    const stripped = inner.slice(prefix.length, inner.length - suffix.length);
    replacement = text.slice(0, trimStart) + stripped + text.slice(text.length - trimEnd);
  } else {
    replacement = text.slice(0, trimStart) + prefix + inner + suffix + text.slice(text.length - trimEnd);
  }

  view.dispatch({
    changes: { from: sel.from, to: sel.to, insert: replacement },
    selection: EditorSelection.range(sel.from, sel.from + replacement.length),
  });
  view.focus();
}

const HEADING_RE = /^(=+)\s+/;

/**
 * Sets the heading level for each line in the selection. If every selected
 * line already has the requested level, the heading marker is removed (toggle
 * off). Lines without a heading get the marker prepended.
 */
export function setHeadingLevel(
  view: EditorView,
  level: 1 | 2 | 3,
  readOnlyPrefix = 0,
): void {
  const sel = view.state.selection.main;
  const lines = linesInRange(view.state, sel.from, sel.to);
  if (lines.length === 0 || lines[0].from < readOnlyPrefix) return;

  const marker = '='.repeat(level);
  const allMatch = lines.every((line) => {
    const m = line.text.match(HEADING_RE);
    return m && m[1] === marker;
  });

  const changes: ChangeSpec[] = [];
  for (const line of lines) {
    const m = line.text.match(HEADING_RE);
    if (allMatch) {
      changes.push({ from: line.from, to: line.from + m![0].length, insert: '' });
    } else if (m) {
      changes.push({ from: line.from, to: line.from + m[0].length, insert: `${marker} ` });
    } else {
      changes.push({ from: line.from, insert: `${marker} ` });
    }
  }
  view.dispatch({ changes });
  view.focus();
}

/**
 * Toggles a line-prefix marker (e.g. '- ' for bullets, '+ ' for numbered
 * lists) on every line in the selection. If every selected line already
 * starts with the prefix, the prefix is removed; otherwise it's added to any
 * line that lacks it.
 */
export function togglePrefixOnSelectedLines(
  view: EditorView,
  prefix: '- ' | '+ ',
  readOnlyPrefix = 0,
): void {
  const sel = view.state.selection.main;
  const lines = linesInRange(view.state, sel.from, sel.to);
  if (lines.length === 0 || lines[0].from < readOnlyPrefix) return;

  const allMatch = lines.every((line) => line.text.startsWith(prefix));
  const changes: ChangeSpec[] = [];
  for (const line of lines) {
    if (allMatch) {
      changes.push({ from: line.from, to: line.from + prefix.length, insert: '' });
    } else if (!line.text.startsWith(prefix)) {
      changes.push({ from: line.from, insert: prefix });
    }
  }
  if (changes.length === 0) return;
  view.dispatch({ changes });
  view.focus();
}

/**
 * Inserts text at the current cursor position, replacing the selection if any.
 * Used by the image-insert button.
 */
export function insertAtCursor(view: EditorView, text: string, readOnlyPrefix = 0): void {
  const sel = view.state.selection.main;
  if (sel.from < readOnlyPrefix) return;
  view.dispatch({
    changes: { from: sel.from, to: sel.to, insert: text },
    selection: EditorSelection.cursor(sel.from + text.length),
  });
  view.focus();
}

function linesInRange(state: EditorState, from: number, to: number): Line[] {
  const startLine = state.doc.lineAt(from);
  const endLine = state.doc.lineAt(to);
  const out: Line[] = [];
  for (let n = startLine.number; n <= endLine.number; n++) {
    out.push(state.doc.line(n));
  }
  return out;
}
