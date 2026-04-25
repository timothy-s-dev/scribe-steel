import type { VirtualFile } from '@/lib/typst/compiler';

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

// Fields that never flow into the Typst template as args. `name` is
// filename identity, `content` is appended below the preamble as the
// template body.
const DEFAULT_EXCLUDES = ['name', 'content'] as const;

interface JsonBackedOptions<T extends object> {
  importPath: string;
  functionName: string;
  templateFiles: VirtualFile[];
  payloadPath?: string;
  contentField?: keyof T;
  excludeKeys?: readonly (keyof T)[];
}

// Factory for buildSource implementations that hand their full data to
// Typst via a JSON file and map every top-level field 1:1 onto the
// template's function parameters.
//
// Convention:
//   - Fields in DEFAULT_EXCLUDES are skipped (see that comment).
//   - Every other top-level key becomes `key: _data.key`.
//   - The `content` field (or whatever `contentField` names) is appended
//     below the `#show:` line so the template receives it as its body.
//
// Templates must declare matching parameter names; TS field names and Typst
// parameter names are kept in sync by convention.
export function jsonBackedBuildSource<T extends object>(
  opts: JsonBackedOptions<T>,
): (data: T) => { source: string; files: VirtualFile[] } {
  const payloadPath = opts.payloadPath ?? '/data/payload.json';
  const contentField = (opts.contentField ?? 'content') as keyof T;
  const excluded = new Set<PropertyKey>([
    ...DEFAULT_EXCLUDES,
    ...(opts.excludeKeys ?? []),
    contentField,
  ]);

  return (data: T) => {
    const argKeys = (Object.keys(data) as (keyof T)[]).filter((k) => !excluded.has(k));
    const args = argKeys.map((k) => `  ${String(k)}: _data.${String(k)}`);

    const content = (data[contentField] as unknown as string | undefined) ?? '';

    const source = [
      importLine(opts.importPath),
      `#let _data = json("${payloadPath}")`,
      showWith(opts.functionName, args),
      '',
      content,
    ].join('\n');

    return {
      source,
      files: [
        ...opts.templateFiles,
        { path: payloadPath, content: JSON.stringify(data) },
      ],
    };
  };
}
