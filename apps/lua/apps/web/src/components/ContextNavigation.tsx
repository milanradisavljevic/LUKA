import type { ActiveView } from '../lib/types';
import { workArea } from '../lib/workNavigation';
import { NAV_TARGETS } from '../lib/navigation';
export function ContextNavigation({view,navigate}:{view:ActiveView;navigate:(view:ActiveView)=>void}){
 const area=workArea(view);if(!area || area.views.length<2)return null;
 return <nav className="context-navigation" aria-label={area.label}>{area.views.map(target=><button key={target} className={target===view?'btn-primary':'btn-secondary'} aria-current={target===view?'page':undefined} onClick={()=>navigate(target)}>{target==='wizard'?'Aktuelle Unterlage':NAV_TARGETS.find(n=>n.view===target)?.label}</button>)}</nav>;
}
