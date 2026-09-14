import { useState,useEffect } from 'react';
import { Home,BookOpen,SpellCheck,GraduationCap,Library,Settings,HelpCircle,ChevronLeft,ChevronRight,Plus } from 'lucide-react';
import type { ActiveView } from '../lib/types';
import { WORK_AREAS,workArea } from '../lib/workNavigation';
import { FEATURES } from '../lib/features';
import { BrandSignature } from './BrandLogo';
const icons=[Home,BookOpen,SpellCheck,GraduationCap,Library];
export function Sidebar({currentView,onViewChange,onNewDocument}:{currentView:ActiveView;onViewChange:(view:ActiveView)=>void;onNewDocument:()=>void}){
 const [collapsed,setCollapsed]=useState(false),[version,setVersion]=useState('Vorschau');
 useEffect(()=>{if((window as any).__TAURI_INTERNALS__)void import('@tauri-apps/api/app').then(m=>m.getVersion()).then(setVersion);},[]);
 const active=workArea(currentView);
 return <aside className={'luka-sidebar'+(collapsed?' is-collapsed':'')} aria-label="Hauptnavigation">
  <div className="luka-sidebar-brand">{collapsed ? 'L' : <BrandSignature size={40} showMark={false} showTagline={false}/>}</div>
  <button className="sidebar-new" onClick={onNewDocument} title="Neue Unterlage"><Plus size={18}/>{!collapsed && 'Neue Unterlage'}</button>
  <nav>{WORK_AREAS.map((area,i)=>{if(!FEATURES.natascha && ['korrektur','klassen'].includes(area.view))return null;const Icon=icons[i]!;return <button key={area.view} onClick={()=>onViewChange(area.view)} aria-label={area.label} title={area.label} aria-current={active===area?'page':undefined}><Icon size={20}/>{!collapsed && area.label}</button>;})}</nav>
  <div className="sidebar-bottom"><button onClick={()=>onViewChange('settings')} aria-label="Einstellungen" title="Einstellungen" aria-current={currentView==='settings'?'page':undefined}><Settings size={18}/>{!collapsed && 'Einstellungen'}</button><button onClick={()=>onViewChange('help')} aria-label="Hilfe" title="Hilfe"><HelpCircle size={18}/>{!collapsed && 'Hilfe'}</button>
  <button onClick={()=>setCollapsed(!collapsed)} aria-label={collapsed?'Seitenleiste ausklappen':'Seitenleiste einklappen'} aria-expanded={!collapsed}>{collapsed?<ChevronRight size={16}/>:<><ChevronLeft size={16}/>Einklappen</>}</button><small>{collapsed ? version : 'LUKA '+version}</small></div>
 </aside>;
}
