import { describe,it,expect,vi,afterEach } from 'vitest';
import {uniqueTextAnchor} from './textAnchors';
import {wizardReducer} from '../hooks/useWizard';
import {readDraft,writeDraft,flushDrafts,beginActivity,hasActiveWork} from './workSession';
import type {AppState} from './types';
afterEach(()=>vi.unstubAllGlobals());
describe('UX regression',()=>{
 it('never marks the first of duplicate or overlapping quotations',()=>{expect(uniqueTextAnchor('one two one','one')).toBeNull();expect(uniqueTextAnchor('aaaa','aa')).toBeNull();expect(uniqueTextAnchor('one two','two')).toBe(4);});
 it('keeps the generated document on navigation and identifies changed inputs',()=>{const doc={} as never;const state={generiertesDokument:doc,meta:{}} as unknown as AppState;expect(wizardReducer(state,{type:'SET_STEP',step:'baukasten'}).generiertesDokument).toBe(doc);const changed=wizardReducer(state,{type:'SET_META',meta:{titel:'Changed'} as never});expect(changed.generiertesDokument).toBe(doc);expect(changed.generatedOutdated).toBe(true);expect(wizardReducer(changed,{type:'SET_GENERIERTES_DOKUMENT',dokument:doc}).generatedOutdated).toBe(false);});
 it('refuses closing with failed drafts and recovers after storage becomes writable',()=>{const store=new Map<string,string>();let fail=true;vi.stubGlobal('window',new EventTarget());vi.stubGlobal('localStorage',{getItem:(k:string)=>store.get(k)??null,setItem:(k:string,v:string)=>{if(fail)throw Error('quota');store.set(k,v);}});writeDraft('regression',{comment:'unsaved'});expect(()=>flushDrafts()).toThrow();fail=false;flushDrafts();expect(readDraft('regression',null)).toEqual({comment:'unsaved'});});
 it('tracks overlapping activities independently',()=>{vi.stubGlobal('window',new EventTarget());const a=beginActivity('a'),b=beginActivity('b');a();expect(hasActiveWork()).toBe(true);b();expect(hasActiveWork()).toBe(false);});
});
