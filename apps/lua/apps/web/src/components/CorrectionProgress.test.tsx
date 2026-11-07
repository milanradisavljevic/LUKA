import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CorrectionProgress } from './CorrectionProgress';
describe('Korrekturfortschritt',()=>{
 it('zeigt den gemeldeten Schritt ohne erfundene Prozentangabe',()=>{
  const html=renderToStaticMarkup(<CorrectionProgress stage="scan_verify" message="Original pruefen: Bereich 2 von 5"/>);
  expect(html).toContain('role="progressbar"');expect(html).toContain('Bereich 2 von 5');expect(html).toContain('aria-current="step"');expect(html).not.toContain('aria-valuenow');
 });
 it('trennt Ausblenden und Wiederaufnahme vom Abbrechen',()=>{
  const html=renderToStaticMarkup(<CorrectionProgress stage="scan_analysis" message={null} onHide={()=>{}} onOpen={()=>{}}/>);
  expect(html).toContain('Im Hintergrund weiterarbeiten');expect(html).toContain('Auftrag öffnen');expect(html).not.toContain('abbrechen');
 });
});
