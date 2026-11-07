import {CheckCircle2, FolderOpen, X} from 'lucide-react';

export function TeacherReportFile({path,onOpenFolder,onClose,onAttach,attached=false}: {
  path:string;onOpenFolder:()=>void;onClose:()=>void;onAttach?:()=>void;attached?:boolean;
}) {
  const parts=path.split(/[/\\]/);const name=parts.pop()||path;const folder=parts.join(path.includes('\\')?'\\':'/');
  return <section role="status" aria-label="Lehrkraftbericht erstellt" style={{padding:'.75rem 1rem',marginBottom:'1rem',border:'1px solid var(--color-success)',borderRadius:'var(--radius)',background:'color-mix(in srgb, var(--color-success-bg, #f0fdf4) 60%, var(--color-bg-surface))'}}>
    <div style={{display:'flex',alignItems:'center',gap:'.5rem'}}><CheckCircle2 size={18}/><strong>Lehrkraftbericht erstellt</strong><button type="button" className="btn-ghost" aria-label="Exporthinweis schließen" onClick={onClose} style={{marginLeft:'auto'}}><X size={15}/></button></div>
    <p style={{margin:'.5rem 0 .25rem',overflowWrap:'anywhere'}}>{name}</p>
    <p style={{fontSize:'.75rem',color:'var(--color-text-secondary)',overflowWrap:'anywhere'}}>Gespeichert in: {folder}</p>
    <button type="button" className="btn-secondary" onClick={onOpenFolder} style={{display:'inline-flex',alignItems:'center',gap:'.4rem'}}><FolderOpen size={15}/>Ordner öffnen</button>
    {onAttach && <button type="button" className="btn-secondary" disabled={attached} onClick={onAttach} style={{marginLeft:'.5rem'}}>{attached?'Am Termin abgelegt':'Am Termin ablegen'}</button>}
  </section>;
}
