import { useState, useCallback, useEffect } from 'react';

export type ZoomMode = 'fit-width' | 'fit-page' | 'manual';

const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3];

export interface ZoomState {
  mode: ZoomMode;
  manualZoom: number;
  effectiveZoom: number;
  zoomPercent: number;
  setMode: (mode: ZoomMode) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setContainerEl: (el: HTMLDivElement | null) => void;
  setPageDimensions: (width: number, height: number) => void;
}

export function useZoom(): ZoomState {
  const [mode, setMode] = useState<ZoomMode>('fit-width');
  const [manualZoom, setManualZoom] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [pageWidth, setPageWidth] = useState(596);
  const [pageHeight, setPageHeight] = useState(842);
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerEl) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) {
        setContainerWidth(rect.width);
        setContainerHeight(rect.height);
      }
    });
    observer.observe(containerEl);
    return () => observer.disconnect();
  }, [containerEl]);

  const setPageDimensions = useCallback((w: number, h: number) => {
    setPageWidth(w);
    setPageHeight(h);
  }, []);

  const zoomIn = useCallback(() => {
    setMode('manual');
    setManualZoom((z) => ZOOM_STEPS.find((s) => s > z + 0.01) ?? z);
  }, []);

  const zoomOut = useCallback(() => {
    setMode('manual');
    setManualZoom((z) => [...ZOOM_STEPS].reverse().find((s) => s < z - 0.01) ?? z);
  }, []);

  const padding = 48;
  let effectiveZoom = manualZoom;
  if (containerWidth > 0) {
    if (mode === 'fit-width') {
      effectiveZoom = (containerWidth - padding) / pageWidth;
    } else if (mode === 'fit-page') {
      effectiveZoom = Math.min(
        (containerWidth - padding) / pageWidth,
        (containerHeight - padding) / pageHeight,
      );
    }
  }

  return {
    mode,
    manualZoom,
    effectiveZoom,
    zoomPercent: Math.round(effectiveZoom * 100),
    setMode,
    zoomIn,
    zoomOut,
    setContainerEl,
    setPageDimensions,
  };
}
