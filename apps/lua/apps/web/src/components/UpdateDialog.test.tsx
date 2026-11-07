// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import tauri from '../../../../src-tauri/tauri.conf.json';
import { useUpdater } from '../hooks/useUpdater';
import { UpdateDialog } from './UpdateDialog';

vi.mock('@tauri-apps/api/app', () => ({ getVersion: async () => tauri.version }));
vi.mock('@tauri-apps/plugin-updater', () => ({
  check: vi.fn().mockRejectedValue(new Error('offline')),
}));

it('zeigt die Neuerungen nach dem Neustart auch mit dem Update-Marker aus 1.5.8', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('__TAURI_INTERNALS__', {});
  localStorage.setItem('luka-update-pending', tauri.version);
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);

  function App() {
    return <UpdateDialog updater={useUpdater()} />;
  }

  try {
    await act(async () => root.render(<App />));
    await act(async () => vi.advanceTimersByTimeAsync(5000));
    expect(host.querySelector('h2')?.textContent).toContain(`LUKA ${tauri.version}`);
    expect(document.activeElement).toBe(host.querySelector('[role="dialog"]'));
    expect(host.querySelector('.release-notes li')?.textContent).toBeTruthy();
    expect(localStorage.getItem('luka-update-pending')).toBeNull();
    await act(async () => host.querySelector('button')?.click());
    expect(host.querySelector('[role="dialog"]')).toBeNull();
  } finally {
    await act(async () => root.unmount());
    host.remove();
    localStorage.removeItem('luka-update-pending');
    vi.unstubAllGlobals();
    vi.useRealTimers();
  }
});
