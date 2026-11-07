/** Lehrkraftbericht aus der gespeicherten Revision, ohne Modellaufruf oder Browserdialog. */
export async function exportTeacherReport(input: {
  abgabeId: number; revisionId: number | null;
  savePending?: () => Promise<boolean>;
  generate: (abgabeId: number, output: undefined, revisionId: number | null, view: 'lehrkraft') => Promise<{path: string; abgabe_id: number} | null>;
}): Promise<string | null> {
  if (input.savePending && !await input.savePending()) return null;
  const result = await input.generate(input.abgabeId, undefined, input.revisionId, 'lehrkraft');
  if (!result || typeof result.path !== 'string' || !result.path.trim() || result.abgabe_id !== input.abgabeId) {
    throw new Error('Der Lehrkraftbericht konnte nicht erstellt werden. Bitte den Export erneut versuchen.');
  }
  return result.path;
}
