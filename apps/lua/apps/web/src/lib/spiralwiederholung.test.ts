import { describe, it, expect } from 'vitest';
import type { SavedDocument } from './types';
import { spiralNotiz, spiralThemen } from './spiralwiederholung';

function doc(thema: string, klasse: string, updatedAt: string, isDeleted = false): SavedDocument {
  return {
    id: `${thema}-${updatedAt}`, title: thema, savedAt: updatedAt, updatedAt, isFavorite: false, isDeleted, deletedAt: null,
    snapshot: { meta: { thema, klasse } } as SavedDocument['snapshot'],
  };
}

describe('spiralThemen', () => {
  const heute = new Date('2026-10-19T12:00:00Z');
  it('nimmt ältere Themen derselben Klasse, das jüngste zuerst, ohne Doppelte und Sonderformen', () => {
    const dokumente = [
      doc('Kommasetzung', '6b', '2026-09-01T10:00:00Z'),
      doc('Relativsätze (Gruppe B)', '6b', '2026-09-20T10:00:00Z'),
      doc('Relativsätze', '6B', '2026-09-18T10:00:00Z'),
      doc('Zu frisch', '6b', '2026-10-15T10:00:00Z'),
      doc('Andere Klasse', '7a', '2026-09-01T10:00:00Z'),
      doc('Gelöscht', '6b', '2026-09-01T10:00:00Z', true),
      doc('Exit-Ticket: Kommasetzung', '6b', '2026-09-02T10:00:00Z'),
      doc('Passiv', '6b', '2026-09-10T10:00:00Z'),
    ];
    expect(spiralThemen(dokumente, '6b', 'Passiv', heute)).toEqual(['Relativsätze', 'Kommasetzung']);
  });

  it('liefert ohne Klasse nichts', () => {
    expect(spiralThemen([doc('A', '', '2026-01-01T00:00:00Z')], '', 'B', heute)).toEqual([]);
  });

  it('formuliert die Notiz nur bei Themen', () => {
    expect(spiralNotiz([])).toBe('');
    expect(spiralNotiz(['A', 'B'])).toContain('(A; B)');
  });
});
