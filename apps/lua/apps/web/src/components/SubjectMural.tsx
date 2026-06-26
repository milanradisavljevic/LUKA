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

/**
 * Bewusst OHNE Dauer-Animation: das Bild ist vollflächig mit mix-blend-mode +
 * Maske gerendert; eine fortlaufende Transform-/Maus-Animation darauf zwingt
 * Software-Renderer (z. B. WSLg ohne GPU) zum Vollbild-Repaint pro Frame und
 * hängt die App auf. Einzige Bewegung ist der einmalige Crossfade beim
 * Fachwechsel (reine Opacity-Transition, kein Dauerzustand).
 */
export function SubjectMural({ fach, settings }: Props) {
  const theme = useSubjectTheme(fach);
  const [reduceMotion] = useState(prefersReducedMotion);
  const [frames, setFrames] = useState<MuralFrame[]>([]);
  const counter = useRef(0);

  const ambientEnabled = settings.ambientMuralsEnabled ?? DEFAULT_SETTINGS.ambientMuralsEnabled;
  const reducedEffects = settings.reduceBackgroundEffects ?? DEFAULT_SETTINGS.reduceBackgroundEffects;
  const fadeDisabled = reducedEffects || reduceMotion || settings.reduceMotion;

  const rootStyle = useMemo(() => paletteToStyle(theme), [theme]);

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
    }, fadeDisabled ? 0 : FADE_MS);
    return () => clearTimeout(timer);
  }, [frames, fadeDisabled]);

  if (!ambientEnabled || frames.length === 0) return null;

  return (
    <div className="subject-mural" style={rootStyle} aria-hidden="true">
      {frames.map((frame) => (
        <div
          key={frame.key}
          className="subject-mural-frame"
          style={{
            ...frame.paletteStyle,
            animation: fadeDisabled ? 'none' : `subject-mural-fade ${FADE_MS}ms ease-in-out forwards`,
            opacity: fadeDisabled ? 1 : undefined,
          }}
        >
          <div className="subject-mural-wash" />
          {frame.asset && (
            <div
              className="subject-mural-image"
              style={{ '--mural-image': `url("${frame.asset}")` } as CSSProperties}
            />
          )}
        </div>
      ))}
      <div className="subject-mural-center-veil" />
    </div>
  );
}
