import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Fach } from '@lehrunterlagen/schema';
import type { AppSettings } from '../lib/types';
import { DEFAULT_SETTINGS } from '../lib/storage';
import { useSubjectTheme } from '../hooks/useSubjectTheme';
import { getMuralAsset, type SubjectTheme } from '../themes/subjectThemes';

interface Props {
  fach: Fach;
  settings: AppSettings;
}

/** Ein sichtbarer Mural-Stand; beim Fachwechsel liegen kurz zwei übereinander (Crossfade). */
interface MuralFrame {
  key: number;
  fach: Fach;
  asset: string | null;
  paletteStyle: CSSProperties;
}

const FADE_MS = 900;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function paletteToStyle(theme: SubjectTheme | null): CSSProperties {
  if (!theme) return {};
  return {
    '--mural-paper': theme.palette[0],
    '--mural-wash': theme.palette[1],
    '--mural-mid': theme.palette[2],
    '--mural-ink': theme.palette[3],
    '--mural-accent': theme.accentColor,
  } as CSSProperties;
}

export function SubjectMural({ fach, settings }: Props) {
  const theme = useSubjectTheme(fach);
  const [systemReduceMotion, setSystemReduceMotion] = useState(prefersReducedMotion);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const [frames, setFrames] = useState<MuralFrame[]>([]);
  const counter = useRef(0);

  const ambientEnabled = settings.ambientMuralsEnabled ?? DEFAULT_SETTINGS.ambientMuralsEnabled;
  const reducedEffects = settings.reduceBackgroundEffects ?? DEFAULT_SETTINGS.reduceBackgroundEffects;
  const motionEnabled = !systemReduceMotion && !settings.reduceMotion && !reducedEffects;

  const rootStyle = useMemo(() => paletteToStyle(theme), [theme]);

  // Systemweite reduced-motion-Präferenz live verfolgen
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setSystemReduceMotion(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  // Dezenter Ganzbild-Parallax über die Maus (max. ~6px)
  useEffect(() => {
    if (!motionEnabled) {
      setMouseOffset({ x: 0, y: 0 });
      return;
    }
    const onMove = (event: MouseEvent) => {
      const width = window.innerWidth || 1;
      const height = window.innerHeight || 1;
      setMouseOffset({
        x: ((event.clientX / width) - 0.5) * 6,
        y: ((event.clientY / height) - 0.5) * 6,
      });
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [motionEnabled]);

  // Fachwechsel → neuen Frame oben auflegen (Crossfade)
  useEffect(() => {
    if (!ambientEnabled) {
      setFrames([]);
      return;
    }
    setFrames((prev) => {
      const top = prev[prev.length - 1];
      if (top && top.fach === fach) return prev; // gleiches Fach → nichts tun
      counter.current += 1;
      const next: MuralFrame = { key: counter.current, fach, asset: getMuralAsset(fach), paletteStyle: rootStyle };
      // höchstens 2 Frames gleichzeitig (alter + neuer)
      return [...prev.slice(-1), next];
    });
  }, [fach, ambientEnabled, rootStyle]);

  // Alten Frame nach dem Crossfade entfernen
  useEffect(() => {
    if (frames.length <= 1) return;
    const timer = setTimeout(() => {
      setFrames((prev) => prev.slice(-1));
    }, reducedEffects ? 0 : FADE_MS);
    return () => clearTimeout(timer);
  }, [frames, reducedEffects]);

  if (!ambientEnabled || frames.length === 0) return null;

  const frameTransform = `translate3d(${mouseOffset.x}px, ${mouseOffset.y}px, 0)`;

  return (
    <div
      className={`subject-mural ${reducedEffects ? 'subject-mural-reduced' : ''}`}
      style={rootStyle}
      aria-hidden="true"
    >
      {frames.map((frame) => (
        <div
          key={frame.key}
          className="subject-mural-frame"
          style={{
            ...frame.paletteStyle,
            transform: frameTransform,
            animation: reducedEffects ? 'none' : `subject-mural-fade ${FADE_MS}ms ease-in-out forwards`,
            opacity: reducedEffects ? 1 : undefined,
          }}
        >
          <div className="subject-mural-wash" />
          {frame.asset && (
            <div
              className={`subject-mural-image ${motionEnabled ? 'subject-mural-image-drift' : ''}`}
              style={{ '--mural-image': `url("${frame.asset}")` } as CSSProperties}
            />
          )}
        </div>
      ))}
      {motionEnabled && <div className="subject-mural-particles" />}
      <div className="subject-mural-center-veil" />
    </div>
  );
}
