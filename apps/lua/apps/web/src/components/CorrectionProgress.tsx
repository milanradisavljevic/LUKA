import type { CSSProperties } from 'react';
const stages=['scan_ocr','scan_analysis','scan_verify','scan_reassess','scan_ready'];
const labels=['Auslesen','Korrektur vorbereiten','Original prüfen','Bewertung aktualisieren','Vorschau bereit'];
export function CorrectionProgress({stage,message,current,total,onHide,onOpen,reducedMotion=false}:{stage:string|null;message:string|null;current?:number;total?:number;onHide?:()=>void;onOpen?:()=>void;reducedMotion?:boolean}) {
 const index=stage?stages.indexOf(stage):-1;
 const fallback=stage==='review'?'Schritt 2 von 2: Befunde und Bewertung werden gegengeprüft':stage==='llm'?'Die KI analysiert die Arbeit':stage==='input'?'Abgabe und Grundlage werden gelesen':'Der Auftrag wird vorbereitet';
 const style:CSSProperties={border:'1px solid var(--color-border)',borderRadius:'var(--radius)',padding:'0.85rem 1rem',background:'var(--color-bg-base)',margin:'0.75rem 0'};
 return <section aria-label="Fortschritt der Korrektur" style={style}>
  <div style={{display:'flex',justifyContent:'space-between',gap:'1rem',alignItems:'center'}}><strong role="status" aria-live="polite">{message||fallback}</strong>{total&&total>1?<span>Datei {current} von {total}</span>:null}</div>
  <div role="progressbar" aria-label="Korrektur läuft" aria-valuetext={message||fallback} className="correction-progress-track"><div className="correction-progress-motion" style={reducedMotion?{animation:"none",width:"100%",opacity:.55}:undefined}/></div>
  {index>=0&&<div style={{display:'flex',gap:'.75rem',flexWrap:'wrap',fontSize:'.75rem',color:'var(--color-text-secondary)'}}>{labels.map((label,i)=><span key={label} aria-current={i===index?'step':undefined} style={{fontWeight:i===index?700:400,color:i===index?'var(--color-accent)':undefined}}>{label}</span>)}</div>}
  <p style={{fontSize:'.8rem',margin:'.6rem 0 0'}}>Der Auftrag läuft weiter, wenn Sie dieses Fenster ausblenden oder den Arbeitsbereich wechseln. Lassen Sie LUKA geöffnet.</p>
  {onHide&&<button type="button" className="btn-secondary" onClick={onHide}>Im Hintergrund weiterarbeiten</button>}
  {onOpen&&<button type="button" className="btn-secondary" onClick={onOpen}>Auftrag öffnen</button>}
 </section>;
}
