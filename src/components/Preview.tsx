import { useTypstCompiler } from '@/hooks/useTypstCompiler';

interface PreviewProps {
  content: string;
  template: string;
}

export function Preview({ content, template }: PreviewProps) {
  const { svg, error, loading } = useTypstCompiler(content, template);

  if (loading && !svg) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-outline">
        Loading Typst compiler...
      </div>
    );
  }

  return (
    <div className="h-full">
      {error && (
        <div className="mb-4 rounded-sm bg-tertiary-container/20 p-3 font-label text-xs text-tertiary whitespace-pre-wrap">
          {error}
        </div>
      )}
      {svg && (
        <div
          className="bg-white rounded-sm shadow-[0_0_32px_rgba(165,204,223,0.06)] [&_svg]:mx-auto [&_svg]:max-w-full [&_svg]:h-auto"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
    </div>
  );
}
