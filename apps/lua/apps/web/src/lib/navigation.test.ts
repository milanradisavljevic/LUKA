import { describe, expect, it } from 'vitest';
import { NATASCHA_VIEWS, visibleNavTargets } from './navigation';
import { WORK_AREAS, workArea, workAreaGruppen } from './workNavigation';

describe('visibleNavTargets', () => {
  it('blendet im Generator-only-Pilot alle NATASCHA-Ziele aus', () => {
    const views = visibleNavTargets(false).map((target) => target.view);
    for (const view of NATASCHA_VIEWS) expect(views).not.toContain(view);
  });

  it('stellt die NATASCHA-Ziele für einen späteren Rollout wieder bereit', () => {
    const views = visibleNavTargets(true).map((target) => target.view);
    for (const view of NATASCHA_VIEWS) expect(views).toContain(view);
  });
});

describe('Reiter der Korrekturen-Fläche', () => {
  const korrekturen = WORK_AREAS.find((area) => area.label === 'Korrekturen')!;
  const gruppen = workAreaGruppen(korrekturen);

  it('trennt Vorbereitung von Korrekturarbeit', () => {
    // Der Reiter heißt jetzt "Bewertungsraster" und nicht mehr "Erwartungshorizont
    // & Raster". Die Fläche ist zweizeilig: oben die Arbeit an der Klasse, unten
    // die Artefakte, die man vorher festlegt. Erwartungshorizont und Raster
    // teilen sich dabei die Zeile - nicht den Reiter.
    const flache = korrekturen.views;
    expect(flache).toContain('erwartungshorizont');
    expect(flache).toContain('bewertungsraster');

    const vorbereitung = gruppen.findIndex((gruppe) => gruppe.includes('erwartungshorizont'));
    const arbeit = gruppen.findIndex((gruppe) => gruppe.includes('korrektur'));
    expect(vorbereitung).toBe(arbeit + 1);
    expect(gruppen[vorbereitung]).toContain('bewertungsraster');
    // Und sie sind wirklich zwei verschiedene Reiter, nicht derselbe Knopf.
    expect(gruppen[vorbereitung]).toHaveLength(2);
  });

  it('findet beide Reiter über workArea, damit sie im Klassen-Bereich liegen', () => {
    expect(workArea('erwartungshorizont')).toBe(korrekturen);
    expect(workArea('bewertungsraster')).toBe(korrekturen);
  });

  it('kommt mit zwei Reiter-Zeilen aus, damit die Fläche kein Regal wird', () => {
    expect(gruppen.length).toBe(2);
    // Jede Zeile für sich darf nicht leer sein, sonst entsteht eine Lücke.
    for (const gruppe of gruppen) expect(gruppe.length).toBeGreaterThan(0);
  });
});
