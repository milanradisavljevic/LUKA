import type { ActiveView } from './types';
export const WORK_AREAS: {label:string;view:ActiveView;views:ActiveView[]}[] = [
 {label:'Start',view:'dashboard',views:['dashboard']},
 {label:'Unterricht',view:'wizard',views:['wizard','kompetenz','quick']},
 {label:'Korrekturen',view:'korrektur',views:['korrektur','erwartungshorizont']},
 {label:'Klassen',view:'klassen',views:['klassen','schueler']},
 {label:'Bibliothek',view:'documents',views:['documents','pool','templates','favorites','history','trash']},
];
export function workArea(view:ActiveView){return WORK_AREAS.find(area=>area.views.includes(view));}
