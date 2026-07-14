import { describe, expect, it } from 'vitest';
import { filterKlassenNachArchiv } from './archivFilter';

describe('filterKlassenNachArchiv', () => {
  const klassen = [{ klasse: '7A' }, { klasse: '8B' }];
  const metadaten = [{ name: '7A', archiviert: true }, { name: '8B', archiviert: false }];

  it('blendet archivierte Klassen standardmäßig aus', () => {
    expect(filterKlassenNachArchiv(klassen, metadaten, false)).toEqual([{ klasse: '8B' }]);
  });

  it('zeigt im Archivmodus alle Klassen', () => {
    expect(filterKlassenNachArchiv(klassen, metadaten, true)).toEqual(klassen);
  });

  it('behandelt Klassen ohne LUA-Metadaten als aktiv', () => {
    expect(filterKlassenNachArchiv([{ klasse: '9C' }], metadaten, false)).toEqual([{ klasse: '9C' }]);
  });
});
