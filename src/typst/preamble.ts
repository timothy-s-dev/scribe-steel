// Small helpers for building Typst preambles in metadata's buildSource.

export function importLine(path: string): string {
  return `#import "${path}": *`;
}

// Quotes a string for use as a Typst string literal.
export function quoteString(val: string): string {
  return `"${val.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

// Wraps a value in a Typst content block.
export function contentBlock(val: string): string {
  return `[${val}]`;
}

// Renders a `#show: name.with(arg1, arg2, ...)` line. Each arg is a
// pre-formatted "key: value" string; pass an empty array to emit a bare
// `#show: name`.
export function showWith(functionName: string, args: string[]): string {
  if (args.length === 0) return `#show: ${functionName}`;
  return `#show: ${functionName}.with(\n${args.join(',\n')},\n)`;
}
