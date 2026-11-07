import {describe,it,expect,vi} from 'vitest';
import {exportTeacherReport} from './teacherReportExport';

describe('Direkter Lehrkraftexport',()=>{
 it('exportiert die gewählte Revision nur als Lehrkraftbericht und braucht keine zusätzliche Bestätigung',async()=>{
  const generate=vi.fn().mockResolvedValue({path:'/tmp/feedback_1.docx',abgabe_id:1});
  expect(await exportTeacherReport({abgabeId:1,revisionId:7,generate})).toBe('/tmp/feedback_1.docx');
  expect(generate).toHaveBeenCalledTimes(1);expect(generate).toHaveBeenCalledWith(1,undefined,7,'lehrkraft');
 });
 it('übernimmt ausstehende Änderungen vor dem Export und exportiert bei fehlgeschlagenem Speichern nicht',async()=>{
  const generate=vi.fn().mockResolvedValue({path:'/tmp/report.docx',abgabe_id:1});
  const savePending=vi.fn().mockResolvedValue(false);
  expect(await exportTeacherReport({abgabeId:1,revisionId:7,generate,savePending})).toBeNull();
  expect(generate).not.toHaveBeenCalled();
  savePending.mockImplementation(async()=>{expect(generate).not.toHaveBeenCalled();return true;});
  expect(await exportTeacherReport({abgabeId:1,revisionId:7,generate,savePending})).toBe('/tmp/report.docx');
 });
 it.each([null,{path:'',abgabe_id:1},{path:'/tmp/report.docx',abgabe_id:2}])('zeigt ohne passende Datei keinen falschen Erfolg',async result=>{
  await expect(exportTeacherReport({abgabeId:1,revisionId:7,generate:vi.fn().mockResolvedValue(result)})).rejects.toThrow('Lehrkraftbericht');
 });
});
