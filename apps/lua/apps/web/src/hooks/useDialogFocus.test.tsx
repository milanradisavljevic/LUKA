// @vitest-environment jsdom
import { act, useCallback, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDialogFocus } from './useDialogFocus';
import { InfoDot } from '../components/ui/InfoDot';
import { CorrectionProgress } from '../components/CorrectionProgress';

let host: HTMLDivElement, root: Root;
function Auftrag({ initialFocus = 'dialog' }: { initialFocus?: 'first' | 'dialog' }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDialogFocus(open, close, initialFocus);
  return <>
    <button onClick={() => setOpen(true)}>Auftrag öffnen</button>
    {open && <div role="dialog" tabIndex={-1} ref={ref}>
      <h3>Korrekturauftrag</h3>
      <InfoDot text="Klasse und Aufgabe erklären den Korrekturauftrag." />
      <CorrectionProgress stage="review" message={null} />
      <button onClick={close}>Ausblenden</button>
    </div>}
  </>;
}
async function open() {
  await act(async () => { const button = host.querySelector('button')!; button.focus(); button.click(); });
}
async function key(value: string, shiftKey = false) {
  await act(async () => document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: value, shiftKey, bubbles: true, cancelable: true })));
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.spyOn(HTMLElement.prototype, 'offsetParent', 'get').mockImplementation(function (this: HTMLElement) { return this.parentElement; });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); });

describe('Korrekturauftrag schließen und wieder öffnen', () => {
  it('fokussiert den Auftrag statt ungefragt das erste Info-i zu öffnen', async () => {
    await act(async () => root.render(<Auftrag />));
    await open();
    expect(document.activeElement).toBe(host.querySelector('[role="dialog"]'));
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    expect(host.textContent).toContain('Schritt 2 von 2');
    await act(async () => (host.querySelector('[role="dialog"] button') as HTMLButtonElement).click());
    expect(document.activeElement).toBe(host.querySelector('button'));
    await open();
    expect(document.activeElement).toBe(host.querySelector('[role="dialog"]'));
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });
  it('schließt eine fokussierte Info-Blase mit Escape vor dem Dialog und hält Tab im Dialog', async () => {
    await act(async () => root.render(<Auftrag />));
    await open(); await key('Tab');
    expect(document.activeElement).toBe(host.querySelector('.info-dot'));
    expect(document.querySelector('[role="tooltip"]')).not.toBeNull();
    await key('Escape');
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
    await key('Tab', true);
    expect(document.activeElement).toBe(host.querySelector('[role="dialog"] button'));
    await key('Tab');
    expect(document.activeElement).toBe(host.querySelector('.info-dot'));
    await key('Escape'); await key('Escape');
    expect(host.querySelector('[role="dialog"]')).toBeNull();
  });
  it('entfernt offene Portal-Hinweise beim Ausblenden und öffnet sie beim Wiederholen nicht erneut', async () => {
    await act(async () => root.render(<Auftrag />));
    await open(); await key('Tab');
    expect(document.querySelector('[role="tooltip"]')).not.toBeNull();
    await act(async () => (host.querySelector('[role="dialog"] button') as HTMLButtonElement).click());
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    await open();
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });
  it('erhält für andere Dialoge den bisherigen anfänglichen Fokus', async () => {
    await act(async () => root.render(<Auftrag initialFocus="first" />));
    await open();
    expect(document.activeElement).toBe(host.querySelector('.info-dot'));
  });
});
