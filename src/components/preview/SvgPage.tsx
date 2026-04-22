import { useEffect, useRef } from 'react';
import type { ParsedPage } from '@/hooks/useTypstCompiler';

interface SvgPageProps {
  page: ParsedPage;
  zoom: number;
}

// Mounts SVG via innerHTML on a ref, bypassing React reconciliation so large
// SVG trees don't churn through the virtual DOM on every recompile.
export function SvgPage({ page, zoom }: SvgPageProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const mountedSvgRef = useRef<string | null>(null);

  useEffect(() => {
    if (innerRef.current && page.svg !== mountedSvgRef.current) {
      innerRef.current.innerHTML = page.svg;
      mountedSvgRef.current = page.svg;
    }
  }, [page.svg]);

  return (
    <div
      className="shadow-[0_2px_16px_rgba(0,0,0,0.3)]"
      style={{
        width: page.width * zoom,
        height: page.height * zoom,
      }}
    >
      <div
        ref={innerRef}
        style={{
          width: page.width,
          height: page.height,
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
        }}
      />
    </div>
  );
}
