import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'lehrunterlagen-zoom';
const MIN_ZOOM = 0.75;
const MAX_ZOOM = 1.50;
const STEP = 0.05;
const DEFAULT_ZOOM = 1.0;

function clampZoom(value: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(value * 100) / 100));
}

export function useZoom() {
  const [zoom, setZoom] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? clampZoom(parseFloat(saved)) : DEFAULT_ZOOM;
    } catch {
      return DEFAULT_ZOOM;
    }
  });

  useEffect(() => {
    document.documentElement.style.setProperty('--html-font-size', `${zoom * 16}px`);
    try {
      localStorage.setItem(STORAGE_KEY, String(zoom));
    } catch { /* ignore */ }
  }, [zoom]);

  const zoomIn = useCallback(() => {
    setZoom((z) => clampZoom(z + STEP));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => clampZoom(z - STEP));
  }, []);

  const reset = useCallback(() => {
    setZoom(DEFAULT_ZOOM);
  }, []);

  // Keyboard: Ctrl/Cmd + Plus/Minus/0
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        zoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        reset();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [zoomIn, zoomOut, reset]);

  // Mouse: Ctrl/Cmd + Scroll Wheel
  useEffect(() => {
    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      if (e.deltaY < 0) {
        zoomIn();
      } else {
        zoomOut();
      }
    };
    window.addEventListener('wheel', handler, { passive: false });
    return () => window.removeEventListener('wheel', handler);
  }, [zoomIn, zoomOut]);

  return { zoom, zoomIn, zoomOut, reset };
}
