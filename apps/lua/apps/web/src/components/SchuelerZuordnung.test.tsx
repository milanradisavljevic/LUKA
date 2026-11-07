// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SchuelerZuordnung, vorhandenePerson } from './SchuelerZuordnung';

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
async function selectNew() {
  const el = host.querySelector('select')!;
  await act(async () => { el.value = 'neu'; el.dispatchEvent(new Event('change', { bubbles: true })); });
}
async function typeName(value: string) {
  const el = host.querySelector('input')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('Schüler direkt im Korrekturauftrag benennen', () => {
  it('bietet die Eingabe auch bei leerer Klassenliste an und ordnet erst nach dem Speichern zu', async () => {
    const onCreate = vi.fn().mockResolvedValue(12), onChange = vi.fn();
    await act(async () => root.render(<SchuelerZuordnung personen={[]} value="" label="Schülerzuordnung für Rede.docx" onChange={onChange} onCreate={onCreate} />));
    await selectNew(); await typeName('  Nina  ');
    expect(onChange).not.toHaveBeenCalled();
    expect(host.textContent).toContain('Klassenliste');
    await act(async () => (host.querySelector('.btn-primary') as HTMLButtonElement).click());
    expect(onCreate).toHaveBeenCalledWith('Nina', '');
    expect(onChange).toHaveBeenCalledTimes(1); expect(onChange).toHaveBeenCalledWith(12);
    expect(host.querySelector('input')).toBeNull();
  });
  it('behält Eingabe und bisherige Zuordnung bei einem Speicherfehler', async () => {
    const onChange = vi.fn();
    await act(async () => root.render(<SchuelerZuordnung personen={[{ id: 4, vorname: 'Mona', nachname: null }]} value={4} label="Schülerzuordnung" onChange={onChange} onCreate={vi.fn().mockRejectedValue(new Error('Speichern fehlgeschlagen'))} />));
    await selectNew(); await typeName('Nina');
    await act(async () => (host.querySelector('.btn-primary') as HTMLButtonElement).click());
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('Speichern fehlgeschlagen');
    expect(host.querySelector('input')?.value).toBe('Nina');
    expect(onChange).not.toHaveBeenCalled();
  });
  it('legt beim Abbrechen keinen Eintrag an und fängt Enter auf dem Abbrechen-Knopf nicht als Speichern ab', async () => {
    const onCreate = vi.fn(), onChange = vi.fn();
    await act(async () => root.render(<SchuelerZuordnung personen={[]} value="" label="Schülerzuordnung" onChange={onChange} onCreate={onCreate} />));
    await selectNew(); await typeName('Nina');
    await act(async () => {
      const cancel = host.querySelector('.btn-secondary') as HTMLButtonElement;
      cancel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); cancel.click();
    });
    expect(onCreate).not.toHaveBeenCalled(); expect(onChange).not.toHaveBeenCalled();
    expect(host.querySelector('input')).toBeNull();
  });
  it('verhindert doppelte Speicherung während eine Anfrage läuft', async () => {
    let resolve!: (id: number) => void;
    const onCreate = vi.fn(() => new Promise<number>(r => { resolve = r; })), onChange = vi.fn();
    await act(async () => root.render(<SchuelerZuordnung personen={[]} value="" label="Schülerzuordnung" onChange={onChange} onCreate={onCreate} />));
    await selectNew(); await typeName('Nina');
    await act(async () => { const save = host.querySelector('.btn-primary') as HTMLButtonElement; save.click(); save.click(); });
    expect(onCreate).toHaveBeenCalledTimes(1); expect(onChange).not.toHaveBeenCalled();
    await act(async () => resolve(15));
    expect(onChange).toHaveBeenCalledTimes(1); expect(onChange).toHaveBeenCalledWith(15);
  });
  it('verwendet vorhandene gleichnamige Einträge und erfindet bei Mehrdeutigkeit keine Zuordnung', () => {
    const person = { id: 3, vorname: 'Nina', nachname: 'Muster' };
    expect(vorhandenePerson([person], ' nina ', 'MUSTER')).toBe(person);
    expect(vorhandenePerson([person], 'Nina', '')).toBeUndefined();
    expect(() => vorhandenePerson([person, { ...person, id: 4 }], 'Nina', 'Muster')).toThrow('Mehrere Personen');
  });
});
