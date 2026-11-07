// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { BewertungsrasterView } from './BewertungsrasterView';

const api = vi.hoisted(() => ({ listRubrics: vi.fn(), readRubric: vi.fn(), saveRubric: vi.fn(), checkRubric: vi.fn() }));
vi.mock('../hooks/useNatascha', () => ({ useNatascha: () => api }));
const original = '<!-- luka-rubrik\nfach: deutsch\n-->\n# Raster A\n\n| Stufe | Beschreibung |\n|---|---|\n| 1 | prüfen |';
let host: HTMLDivElement, root: Root;
async function select(value: string) {
  const el = host.querySelector<HTMLSelectElement>('[aria-label="Bewertungsraster wählen"]')!;
  await act(async () => { el.value = value; el.dispatchEvent(new Event('change', { bubbles: true })); });
}
async function click(text: string) {
  const el = [...host.querySelectorAll('button')].find(b => b.textContent?.trim() === text)!;
  await act(async () => { el.click(); });
}
async function edit(value: string) {
  const el = host.querySelector('textarea')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
beforeEach(async () => {
  vi.resetAllMocks();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  api.listRubrics.mockResolvedValue({ rubrics: [{ filename: 'a.md', titel: 'A' }, { filename: 'b.md', titel: 'B' }] });
  api.readRubric.mockImplementation(async (name: string) => name === 'a.md' ? original : '# Raster B');
  api.checkRubric.mockResolvedValue({ fehler: [], hinweise: [] });
  api.saveRubric.mockImplementation(async (name: string) => ({ name, bytes: 100 }));
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await act(async () => root.render(<BewertungsrasterView />));
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); });
describe('Raster lesen und bearbeiten', () => {
  it('öffnet die formatierte Ansicht und erhält Quelltext samt Metadaten beim Umschalten', async () => {
    await select('a.md');
    expect(host.querySelector('h1')?.textContent).toBe('Raster A');
    expect(host.querySelector('textarea')).toBeNull();
    await click('Quelltext bearbeiten');
    expect(host.querySelector('textarea')?.value).toBe(original);
    await edit(original + '\n\n**Neu**');
    await click('Ansicht');
    expect(host.querySelector('strong')?.textContent).toBe('Neu');
    expect(host.textContent).toContain('Ungespeicherte Änderungen');
    expect(api.saveRubric).not.toHaveBeenCalled();
    await click('Speichern');
    expect(api.saveRubric).toHaveBeenCalledWith('a.md', original + '\n\n**Neu**');
    expect(host.textContent).not.toContain('Ungespeicherte Änderungen');
  });
  it('schützt Änderungen beim Rasterwechsel und behält sie nach einem Speicherfehler', async () => {
    await select('a.md'); await click('Quelltext bearbeiten'); await edit(original + '\nEigene Änderung');
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await select('b.md');
    expect(host.querySelector('textarea')?.value).toContain('Eigene Änderung');
    expect(api.readRubric).not.toHaveBeenCalledWith('b.md');
    api.saveRubric.mockRejectedValueOnce(new Error('Speicherfehler'));
    await click('Speichern');
    expect(host.textContent).toContain('Ungespeicherte Änderungen');
    expect(host.textContent).toContain('Speicherfehler');
  });
  it('verwirft verspätete Ladeantworten anderer Raster', async () => {
    let resolve!: (text: string) => void;
    api.readRubric.mockImplementation((name: string) => name === 'a.md' ? new Promise<string>(r => { resolve = r; }) : Promise.resolve('# Raster B'));
    await select('a.md'); await select('b.md');
    await act(async () => resolve('# Veraltet'));
    expect(host.querySelector('h1')?.textContent).toBe('Raster B');
    expect(host.textContent).not.toContain('Veraltet');
  });
  it('zeigt nach bestätigtem Wechsel wieder die Ansicht und fängt Prüffehler ab', async () => {
    await select('a.md'); await click('Quelltext bearbeiten'); await edit(original + '\nÄnderung');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    api.checkRubric.mockRejectedValueOnce(new Error('Prüfung offline'));
    await select('b.md');
    expect(host.querySelector('textarea')).toBeNull();
    expect(host.querySelector('h1')?.textContent).toBe('Raster B');
    expect(host.textContent).toContain('Prüfung fehlgeschlagen');
  });
});
