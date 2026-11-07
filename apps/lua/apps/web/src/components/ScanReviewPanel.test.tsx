import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ScanReviewPanel } from './ScanReviewPanel';
import type { ScanReviewSession } from '../lib/scanReview';
const session:ScanReviewSession={id:'test',source:'synthetic.png',sourceHash:'test',revision:1,state:'ready',pages:[{seite:1,text:'Test'}],issues:[{id:'one',page:1,old:'Test',box:null,candidates:['Test','Text'],status:'open'}],analysis:{zusammenfassung:'Synthetische Vorschau'}};
const render=(s:ScanReviewSession)=>renderToStaticMarkup(<ScanReviewPanel session={s} busy={false} onResolve={()=>{}} onPrepare={()=>{}} onCommit={()=>{}} onImage={async()=>''}/>);
describe('Scan-Pruefvorschau',()=>{
 it('erklaert offene Bewertung und erlaubt qualitative Uebernahme',()=>{const html=render(session);expect(html).toContain('Gesamtnote bleiben offen');expect(html).toContain('qualitatives Feedback');expect(html).toContain('Original wird geladen');});
 it('fordert nach einer Textaenderung eine neue Vorschau statt Uebernahme',()=>{const html=render({...session,state:'dirty'});expect(html).toContain('Vorschau mit festgelegten Lesarten aktualisieren');expect(html).not.toContain('Entwurf übernehmen');});
 it('bietet fuer automatische Aenderungen eine Ruecknahme',()=>{const html=render({...session,issues:[{...session.issues[0]!,status:'corrected',replacement:'Text'}]});expect(html).toContain('Berichtigung zurücknehmen');expect(html).toContain('1 Auslesefehler automatisch berichtigt');});
});
