import type { VirtualFile } from '@/typst/compiler';

export interface TemplateParam {
  key: string;
  label: string;
  type: 'string' | 'content';
  optional?: boolean;
  default?: string;
}

export interface TemplateSchema {
  name: string;
  importPath: string;
  functionName: string;
  params?: TemplateParam[];
  files: VirtualFile[];
}

/**
 * Generate the preamble (#import + #show) from a schema and param values.
 */
export function generatePreamble(
  schema: TemplateSchema,
  values: Record<string, string>,
): string {
  const importLine = `#import "${schema.importPath}": *`;

  const params = schema.params ?? [];
  const args = params
    .map((p) => {
      const val = values[p.key] ?? p.default ?? '';
      if (p.optional && val === '') return null;
      if (p.type === 'content') {
        return `  ${p.key}: [${val}]`;
      }
      return `  ${p.key}: "${val}"`;
    })
    .filter(Boolean);

  const showLine =
    args.length > 0
      ? `#show: ${schema.functionName}.with(\n${args.join(',\n')},\n)`
      : `#show: ${schema.functionName}`;

  return `${importLine}\n${showLine}\n\n`;
}
