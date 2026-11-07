import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CorrectionReasoningSelect, correctionReasoningKey, loadCorrectionReasoningOptions } from './CorrectionReasoningSelect';
const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ invoke }));
vi.mock('../lib/storage', () => ({ loadSettings: () => ({}) }));
afterEach(() => vi.clearAllMocks());
describe('Denkoptionen des tatsächlichen Sidecars', () => {
  it('übernimmt ausschließlich zurückgemeldete Modelloptionen', async () => {
    const options = {default:'off',options:[{id:'off',label:'Aus'},{id:'high',label:'Hoch'}]};
    invoke.mockResolvedValue(JSON.stringify(options));
    expect(await loadCorrectionReasoningOptions('deepseek','DeepSeek V4 Pro')).toEqual(options);
    expect(invoke).toHaveBeenCalledWith('natascha_model_options', expect.objectContaining({provider:'deepseek',model:'deepseek-v4-pro'}));
  });
  it('erfindet bei ungültiger Antwort keine Optionen', async () => {
    invoke.mockResolvedValue(JSON.stringify({options:[]}));
    await expect(loadCorrectionReasoningOptions('kimi','kimi-k3')).rejects.toThrow('Ungültige Modelloptionen');
  });
  it('verwendet denselben Schlüssel für Anzeigenamen und API-Kennung', () => {
    expect(correctionReasoningKey('chatgpt','GPT-6.1 Sol')).toBe('openai:gpt-6.1-sol');
  });
  it('sperrt die Auswahl bis die Möglichkeiten des Sidecars vorliegen', () => {
    const html=renderToStaticMarkup(<CorrectionReasoningSelect provider="deepseek" model="deepseek-v4-pro" onChange={()=>{}}/>);
    expect(html).toContain('Denkmodus für Korrekturen');expect(html).toContain('disabled');
  });
});
