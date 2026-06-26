import { useMemo } from 'react';
import type { Fach } from '@lehrunterlagen/schema';
import { getSubjectTheme } from '../themes/subjectThemes';

export function useSubjectTheme(fach: Fach) {
  return useMemo(() => getSubjectTheme(fach), [fach]);
}
