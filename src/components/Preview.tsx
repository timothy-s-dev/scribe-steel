import { useTypstCompiler } from '@/hooks/useTypstCompiler';

interface PreviewProps {
  content: string;
  template: string;
}

export function Preview({ content, template }: PreviewProps) {
  const { svg, error, loading } = useTypstCompiler(content, template);

  if (loading && !svg) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading Typst compiler...
      </div>
    );
  }

  return (
    <div className="h-full">
      {error && (
        <div className="mx-4 mt-4 rounded-md bg-destructive/10 p-3 font-mono text-xs text-destructive whitespace-pre-wrap">
          {error}
        </div>
      )}
      {svg && (
        <div
          className="[&_svg]:mx-auto [&_svg]:max-w-full [&_svg]:h-auto"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
    </div>
  );
}
