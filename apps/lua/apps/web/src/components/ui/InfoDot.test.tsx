// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InfoDot } from './InfoDot';

let host: HTMLDivElement, root: Root;
let top = 70;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  top = 70;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ x:180,y:top,left:180,right:193,top,bottom:top+13,width:13,height:13,toJSON:()=>({}) }));
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); });
describe('Info-Blase im Viewport', () => {
  it('setzt beim Wechsel zwischen unterhalb und oberhalb die andere Kante explizit zurück', async () => {
    await act(async () => root.render(<InfoDot text="Ein längerer Hinweis, der mehrere Zeilen benötigt." />));
    await act(async () => (host.querySelector('.info-dot') as HTMLElement).focus());
    let bubble = document.querySelector('[role="tooltip"]') as HTMLElement;
    expect(bubble.style.top).toBe('91px'); expect(bubble.style.bottom).toBe('auto');
    top = 300;
    await act(async () => window.dispatchEvent(new Event('resize')));
    bubble = document.querySelector('[role="tooltip"]') as HTMLElement;
    expect(bubble.style.top).toBe('auto'); expect(bubble.style.bottom).toBe(`${window.innerHeight-300+8}px`);
    top = 70;
    await act(async () => window.dispatchEvent(new Event('scroll')));
    expect(bubble.style.bottom).toBe('auto'); expect(bubble.style.top).toBe('91px');
  });
  it('öffnet bei Hover und schließt beim Verlassen ohne Tastaturfokus', async () => {
    await act(async () => root.render(<InfoDot text="Hinweis" />));
    const trigger = host.querySelector('.info-dot')!;
    await act(async () => trigger.dispatchEvent(new MouseEvent('mouseover', { bubbles:true })));
    expect(document.querySelector('[role="tooltip"]')).not.toBeNull();
    await act(async () => trigger.dispatchEvent(new MouseEvent('mouseout', { bubbles:true, relatedTarget:document.body })));
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });
});
