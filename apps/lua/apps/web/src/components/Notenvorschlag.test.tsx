import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Notenvorschlag, notenvorschlagText } from './Notenvorschlag';

describe('Sichtbarer Prüfstatus einer KI-Note', () => {
  it('zeigt die Zahl und den vorläufigen Status gemeinsam', () => {
    const html = renderToStaticMarkup(<Notenvorschlag note={4} vorlaeufig />);
    expect(html).toContain('4.0');
    expect(html).toContain('vorläufig – Prüfung erforderlich');
    expect(html).toContain('aria-label="KI-Notenvorschlag 4 – vorläufig, Prüfung erforderlich"');
  });
  it('zeigt bei abgeschlossener Gegenprüfung keinen vorläufigen Zusatz', () => {
    const html = renderToStaticMarkup(<Notenvorschlag note={3} />);
    expect(html).toContain('3.0');
    expect(html).not.toContain('vorläufig');
  });
  it('erfindet bei formativer Rückmeldung keine Zahl', () => {
    const html = renderToStaticMarkup(<Notenvorschlag note={null} vorlaeufig />);
    expect(html).toContain('—');
    expect(html).not.toContain('0.0');
    expect(notenvorschlagText(null, true)).toContain('Feedback vorhanden');
  });
  it('kennzeichnet auch die Stapelmeldung mit demselben Status', () => {
    expect(notenvorschlagText(6, true)).toBe('KI-Notenvorschlag 6 – vorläufig, Prüfung erforderlich');
    expect(notenvorschlagText(2)).toBe('KI-Notenvorschlag 2');
  });
});
