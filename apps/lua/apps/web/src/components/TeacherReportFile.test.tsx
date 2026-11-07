// @vitest-environment jsdom
import {act,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {describe,it,expect,vi} from 'vitest';
import {TeacherReportFile} from './TeacherReportFile';
import {exportTeacherReport} from '../lib/teacherReportExport';

it('zeigt nach einem echten Exportklick die Dateikarte und öffnet deren Ordner',async()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
 const open=vi.fn();const confirm=vi.spyOn(window,'confirm').mockReturnValue(false);
 const generate=vi.fn().mockResolvedValue({path:'/home/test/Downloads/Lehrkraftbericht.docx',abgabe_id:1});
 function Export(){const [path,setPath]=useState<string|null>(null);return <><button onClick={async()=>setPath(await exportTeacherReport({abgabeId:1,revisionId:7,generate}))}>Lehrkraftbericht als Word</button>{path&&<TeacherReportFile path={path} onOpenFolder={open} onClose={()=>setPath(null)}/>}</>;}
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try {
  await act(async()=>root.render(<Export/>));
  await act(async()=>(host.querySelector('button') as HTMLButtonElement).click());
  expect(confirm).not.toHaveBeenCalled();expect(generate).toHaveBeenCalledTimes(1);expect(generate).toHaveBeenCalledWith(1,undefined,7,'lehrkraft');
  const card=host.querySelector('[role="status"]')!;
  expect(card.textContent).toContain('Lehrkraftbericht erstellt');expect(card.textContent).toContain('Downloads/Lehrkraftbericht.docx'.split('/').pop());
  expect(card.textContent).toContain('Gespeichert in: /home/test/Downloads');
  await act(async()=>(Array.from(card.querySelectorAll('button')).find(b=>b.textContent==='Ordner öffnen') as HTMLButtonElement).click());
  expect(open).toHaveBeenCalledOnce();expect(host.querySelector('[role="status"]')).not.toBeNull();
  await act(async()=>(card.querySelector('[aria-label="Exporthinweis schließen"]') as HTMLButtonElement).click());
  expect(host.querySelector('[role="status"]')).toBeNull();
 } finally {await act(async()=>root.unmount());host.remove();confirm.mockRestore();}
});
