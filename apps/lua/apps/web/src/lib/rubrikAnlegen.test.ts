import { describe, expect, it } from 'vitest';
import {
  dateinameVorschlag, mitRubrikEndung, pruefeRubrikName,
  rubrikMitTitel, titelAusRubrik,
} from './rubrikAnlegen';

const VORLAGE = `<!-- luka-rubrik
titel: Leseverständnis
fach: deutsch
schulstufe: oberstufe
textsorte: leseverstaendnis
aufgabenart: verstaendnis
k1: sachverstaendnis, detailverstaendnis
k3: ausdruck, sprachrichtigkeit
-->

# Bewertungsraster: Leseverständnis

## JSON-Kriterien (exakte Schlüssel für die Bewertung)

- \`sachverstaendnis\` — Sachverständnis
- \`ausdruck\` — Ausdruck

## Gewichtung

- Sachverstaendnis: 60 %
- Ausdruck: 40 %
`;

describe('Rubrik-Name', () => {
  it('akzeptiert einen einfachen .md-Namen', () => {
    expect(pruefeRubrikName('mein_raster.md')).toEqual({ ok: true });
  });

  it('weist Pfade und Traversal ab — wie NATASCHA es auch tut', () => {
    // Dieselben Regeln wie `_is_safe_rubric_name`. Ein Pfad im Namen würde in
    // den Rubrik-Ordner oder darüber hinaus schreiben.
    expect(pruefeRubrikName('../raus.md').ok).toBe(false);
    expect(pruefeRubrikName('unter/ordner.md').ok).toBe(false);
    expect(pruefeRubrikName('C:\\pfad.md').ok).toBe(false);
    expect(pruefeRubrikName('   ').ok).toBe(false);
  });

  it('sagt, dass die Endung fehlt, statt sie nur zu prüfen', () => {
    const ergebnis = pruefeRubrikName('mein_raster');
    expect(ergebnis.ok).toBe(false);
    expect(ergebnis.ok === false && ergebnis.grund).toContain('.md');
  });

  it('ergänzt die Endung', () => {
    expect(mitRubrikEndung('mein_raster')).toBe('mein_raster.md');
    expect(mitRubrikEndung('mein_raster.MD')).toBe('mein_raster.MD');
    expect(mitRubrikEndung('  mit Rand  ')).toBe('mit Rand.md');
  });
});

describe('Dateiname aus dem Titel', () => {
  it('übernimmt Umlaute lesbar in den Dateinamen', () => {
    // Über die Zerlegung (NFD) allein würde aus "ä" ein "a":
    // `leseverstaendnis` ergäbe `leseverstandnis`.
    expect(dateinameVorschlag('Leseverständnis')).toBe('leseverstaendnis.md');
    expect(dateinameVorschlag('Große Texte')).toBe('grosse_texte.md');
    expect(dateinameVorschlag('Erläuterung zur Änderung')).toBe('erlaeuterung_zur_aenderung.md');
  });

  it('fällt auf einen brauchbaren Namen zurück statt leer zu werden', () => {
    // Leerer Dateiname würde das Speichern verweigern - mit einer
    // Rückfallmeldung von NATASCHA, nicht clientseitig.
    expect(dateinameVorschlag('...')).toBe('raster.md');
    expect(dateinameVorschlag('')).toBe('raster.md');
  });

  it('hängt nichts an, was der Dateiname nicht entscheidet', () => {
    // Der Dateiname steuert seit v1.5.4 nichts mehr. Ein Vorschlag darf ihn
    // deshalb weder mit einem Stufen-Suffix versehen noch kürzen, was die
    // Lehrkraft getippt hat.
    expect(dateinameVorschlag('Mein eigenes Raster')).toBe('mein_eigenes_raster.md');
  });
});

describe('Titel im Raster-Kopf', () => {
  it('liest den vorhandenen Titel', () => {
    expect(titelAusRubrik(VORLAGE)).toBe('Leseverständnis');
    expect(titelAusRubrik('# Ohne Kopf')).toBe('');
  });

  it('ersetzt den Titel und lässt den Rest unangetastet', () => {
    const kopie = rubrikMitTitel(VORLAGE, 'Leseverständnis Unterstufe');
    expect(titelAusRubrik(kopie)).toBe('Leseverständnis Unterstufe');
    // k1/k3 und die Gewichtung müssen gültig bleiben, sonst bricht der
    // Schlüssel- oder Gewichtungsbezug und die Note verliert Anteile.
    expect(kopie).toContain('k1: sachverstaendnis, detailverstaendnis');
    expect(kopie).toContain('k3: ausdruck, sprachrichtigkeit');
    expect(kopie).toContain('- Sachverstaendnis: 60 %');
    expect(kopie).toContain('## JSON-Kriterien');
  });

  it('erhält den Kopf, ersetzt aber kein zweites Mal', () => {
    const kopie = rubrikMitTitel(VORLAGE, 'Noch ein Titel');
    const kopfAnzahl = kopie.match(/luka-rubrik/g)?.length ?? 0;
    expect(kopfAnzahl).toBe(1);
    expect(kopie.match(/^titel:/gm)?.length).toBe(1);
  });

  it('legt einen Kopf an, wenn die Vorlage keinen hat', () => {
    // Sonst wäre die Kopie "generic" und tauchte in jedem Fach und jeder
    // Stufe auf - das war genau der Fehler aus der Stufenzuordnung.
    const kopie = rubrikMitTitel('# Nur ein Text', 'Mein Raster');
    expect(titelAusRubrik(kopie)).toBe('Mein Raster');
    expect(kopie).toContain('# Nur ein Text');
  });

  it('setzt einen fehlenden Titel in einen vorhandenen Kopf', () => {
    const ohneTitel = '<!-- luka-rubrik\nfach: deutsch\n-->\n\n# Text';
    const kopie = rubrikMitTitel(ohneTitel, 'Mein Raster');
    expect(titelAusRubrik(kopie)).toBe('Mein Raster');
    expect(kopie).toContain('fach: deutsch');
  });
});
