import type { ActiveView } from '../lib/types';
import { workArea, workAreaGruppen } from '../lib/workNavigation';
import { NAV_TARGETS } from '../lib/navigation';

/** Reiter-Leiste innerhalb eines Arbeitsbereichs.
 *
 *  Bei einer Fläche mit vielen Zielen (Bibliothek) kommt jede Zeile in eine eigene
 *  Gruppe – sonst stehen sechs Knöpfe nebeneinander und das ist kein Menü mehr,
 *  sondern ein Regal. */
export function ContextNavigation({ view, navigate }: { view: ActiveView; navigate: (view: ActiveView) => void }) {
  const area = workArea(view);
  if (!area || area.views.length < 2) return null;
  return (
    <nav className="context-navigation" aria-label={area.label}>
      {workAreaGruppen(area).map((gruppe, i) => (
        <span key={i} className="context-navigation__gruppe">
          {gruppe.map(target => (
            <button
              key={target}
              className={target === view ? 'btn-primary' : 'btn-secondary'}
              aria-current={target === view ? 'page' : undefined}
              onClick={() => navigate(target)}
            >
              {target === 'wizard' ? 'Aktuelle Unterlage' : NAV_TARGETS.find(n => n.view === target)?.label}
            </button>
          ))}
        </span>
      ))}
    </nav>
  );
}
