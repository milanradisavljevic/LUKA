import { useEffect, useRef } from 'react';
export function useDialogFocus(open: boolean, close: () => void) {
 const ref=useRef<HTMLDivElement>(null); const closeRef=useRef(close); closeRef.current=close;
 useEffect(()=>{
  if(!open) return;
  const previous=document.activeElement as HTMLElement | null;
  const dialog=ref.current; if(!dialog) return;
   // `tabindex="-1"` heißt "programmatisch fokussierbar, aber nicht im
   // Tabulator-Pfad" — solche Elemente gehören nicht in die Falle, sonst
   // müsste man durch 30 Trefferzeilen durchtabben, um zum Schließen zu kommen.
   const items=()=>Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')).filter(el=>el.offsetParent!==null&&Number(el.getAttribute('tabindex'))>=0);
  (items()[0] ?? dialog).focus();
  const handler=(e:KeyboardEvent)=>{ if(e.key==='Escape'){e.preventDefault();closeRef.current();} if(e.key==='Tab'){const all=items(),first=all[0],last=all[all.length-1];if(!first){e.preventDefault();dialog.focus();}else if(e.shiftKey && (document.activeElement===first || document.activeElement===dialog)){e.preventDefault();last?.focus();}else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first.focus();}} };
  dialog.addEventListener('keydown',handler); return ()=>{dialog.removeEventListener('keydown',handler);previous?.focus();};
 },[open]); return ref;
}
