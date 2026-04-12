import { useTypstCompiler } from '../hooks/useTypstCompiler';

interface PreviewProps {
  content: string;
  template: string;
}

export function Preview({ content, template }: PreviewProps) {
  const { svg, error, loading } = useTypstCompiler(content, template);

  if (loading && !svg) {
    return <div className="preview-status">Loading Typst compiler...</div>;
  }

  return (
    <div className="preview-container">
      {error && <div className="preview-error">{error}</div>}
      {svg && (
        <div
          className="preview-svg"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
    </div>
  );
}
