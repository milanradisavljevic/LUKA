import { describe,it,expect,vi,afterEach } from 'vitest';
import {findeTextanker} from './textAnchors';
import {wizardReducer} from '../hooks/useWizard';
import {readDraft,writeDraft,flushDrafts,beginActivity,hasActiveWork} from './workSession';
import type {AppState} from './types';
afterEach(()=>vi.unstubAllGlobals());
describe('UX regression',()=>{
  it('never reports a repeated or overlapping quotation as unambiguous',()=>{
    // Ein Zitat, das mehrfach vorkommt, wird nie still auf die erste Stelle gesetzt –
    // es wird als mehrdeutig ausgewiesen und alle Fundstellen werden gezeigt.
    expect(findeTextanker('one two one','one').status).toBe('mehrdeutig');
    expect(findeTextanker('aaaa','aa').status).toBe('mehrdeutig');
    expect(findeTextanker('one two','two').status).toBe('eindeutig');
  });
  it('keeps the generated document on navigation and identifies changed inputs',()=>{const doc={} as never;const state={generiertesDokument:doc,meta:{}} as unknown as AppState;expect(wizardReducer(state,{type:'SET_STEP',step:'baukasten'}).generiertesDokument).toBe(doc);const changed=wizardReducer(state,{type:'SET_META',meta:{titel:'Changed'} as never});expect(changed.generiertesDokument).toBe(doc);expect(changed.generatedOutdated).toBe(true);expect(wizardReducer(changed,{type:'SET_GENERIERTES_DOKUMENT',dokument:doc}).generatedOutdated).toBe(false);});
  it('refuses closing with failed drafts and recovers after storage becomes writable',()=>{const store=new Map<string,string>();let fail=true;vi.stubGlobal('window',new EventTarget());vi.stubGlobal('localStorage',{getItem:(k:string)=>store.get(k)??null,setItem:(k:string,v:string)=>{if(fail)throw Error('quota');store.set(k,v);}});writeDraft('regression',{comment:'unsaved'});expect(()=>flushDrafts()).toThrow();fail=false;flushDrafts();expect(readDraft('regression',null)).toEqual({comment:'unsaved'});});
  it('tracks overlapping activities independently',()=>{vi.stubGlobal('window',new EventTarget());const a=beginActivity('a'),b=beginActivity('b');a();expect(hasActiveWork()).toBe(true);b();expect(hasActiveWork()).toBe(false);});
});
