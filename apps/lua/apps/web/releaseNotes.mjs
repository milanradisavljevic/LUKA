/** Liest die erste „Das ist neu“-Rubrik für App und Release. */
export function extractReleaseNotes(changelog, version) {
  const section = changelog.split(/^## /m)[1];
  if (!section) return '';

  const [title, ...lines] = section.split(/\r?\n/);
  if (version && title.match(/^Version (\S+)/)?.[1] !== version) return '';

  const start = lines.findIndex(line => /^### Das ist neu\s*$/i.test(line));
  if (start < 0) return '';

  const end = lines.findIndex((line, index) => index > start && /^### /.test(line));
  return lines.slice(start + 1, end < 0 ? undefined : end).join('\n').trim();
}
