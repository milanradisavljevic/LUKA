import { useEffect, useState } from 'react';
import type { ScanReviewSession, ScanReviewIssue } from '../lib/scanReview';
function Original({load}:{load:()=>Promise<string>}) {
  const [url,setUrl]=useState('');const [error,setError]=useState(false);const [attempt,setAttempt]=useState(0);
  useEffect(()=>{let active=true;setError(false);void load().then(value=>{if(active)setUrl(value);}).catch(()=>{if(active)setError(true);});return()=>{active=false;};},[attempt]);
  return <div>{url?<div style={{maxHeight:'28rem',overflow:'auto'}}><img src={url} alt="Original der Lesestelle" style={{width:'100%'}}/></div>:error?<button type="button" onClick={()=>setAttempt(v=>v+1)}>Original erneut laden</button>:<p role="status">Original wird geladen …</p>}</div>;
}
export function ScanReviewPanel({session,busy,onResolve,onPrepare,onCommit,onImage}:{
  session:ScanReviewSession;busy:boolean;
  onResolve:(issue:ScanReviewIssue,choice:string)=>void;onPrepare:()=>void;onCommit:()=>void;
  onImage:(issue:ScanReviewIssue)=>Promise<string>;
}) {
  const [edits,setEdits]=useState<Record<string,string>>({});
  const open=session.issues.filter(i=>i.status==='open'||i.status==='unreadable');
  const corrected=session.issues.filter(i=>i.status==='corrected');
  return <section aria-label="Scan gegenprüfen" style={{margin:'1rem 0'}}>
    <h3>{open.length} Stellen klären · {corrected.length} Auslesefehler automatisch berichtigt</h3>
    <p>Der Bildabgleich prüft die Lesart. Die fachliche Korrektur bleibt ein KI-Vorschlag.</p>
    {open.length>0&&<p role="status">Rasterpunkte und Gesamtnote bleiben offen, bis die Lesestellen geklärt sind. Qualitatives Feedback ist möglich.</p>}
    <p>{session.analysis?.zusammenfassung}</p>
    {session.issues.filter(i=>i.status!=='matched').map(i=><div key={i.id} style={{border:'1px solid var(--color-border)',padding:'0.75rem',marginBottom:'0.75rem'}}>
      <strong>Seite {i.page} · {i.status==='corrected'?'Automatisch berichtigt':i.decision?'Von Ihnen festgelegt':'Lesart prüfen'}</strong>
      <Original key={`${session.id}:${i.id}`} load={()=>onImage(i)}/>
      <p style={{whiteSpace:'pre-wrap'}}>{i.replacement??i.old}</p>
      {i.status==='corrected'?<button type="button" disabled={busy} onClick={()=>onResolve(i,i.old)}>Berichtigung zurücknehmen</button>:<>
        {i.candidates.map((c,n)=><button type="button" key={n} disabled={busy} onClick={()=>onResolve(i,c)} style={{whiteSpace:'pre-wrap',display:'block',margin:'0.4rem 0'}}>{c||'Leere Lesart'}</button>)}
        <textarea aria-label={`Lesart Seite ${i.page} bearbeiten`} value={edits[i.id]??i.replacement??i.old} onChange={e=>setEdits({...edits,[i.id]:e.target.value})} style={{width:'100%'}}/>
        <button type="button" disabled={busy} onClick={()=>onResolve(i,edits[i.id]??i.replacement??i.old)}>Diese Lesart verwenden</button>
        <button type="button" disabled={busy} onClick={()=>onResolve(i,'')}>Nicht lesbar</button>
      </>}
    </div>)}
    <details><summary>Vollständige Abschrift</summary><pre style={{whiteSpace:'pre-wrap'}}>{session.pages.map(p=>p.text).join('\n\n')}</pre></details>
    <details><summary>Korrekturvorschläge ansehen</summary>{session.analysis?.fehler?.map((f,i)=><p key={i}>{f.zitat} → {f.korrektur} ({f.typ})</p>)}</details>
    {session.state!=='ready'?<button type="button" className="btn-primary" disabled={busy} onClick={onPrepare}>Vorschau mit festgelegten Lesarten aktualisieren</button>:<button type="button" className="btn-primary" disabled={busy} onClick={onCommit}>Entwurf übernehmen{open.length?' – qualitatives Feedback':''}</button>}
  </section>;
}
