"""Dateinamen und tatsächlicher Export mit rein synthetischen Personen."""
import json
from pathlib import Path
import subprocess
import sys

from docx import Document
import pytest

import natascha_db as db
from feedback_filename import feedback_filename

ROOT = Path(__file__).resolve().parents[1]


@pytest.mark.parametrize('name,source,expected', [
    ('Nina Muster', 'rede.docx', 'feedback_Nina_Muster_7.docx'),
    ('Özlem Weiß', 'rede.docx', 'feedback_Özlem_Weiß_7.docx'),
    ('', r'C:\Abgaben\Rede_Arbeit_A.docx', 'feedback_Rede_Arbeit_A_7.docx'),
    ('Unbekannt', '/abgaben/Rede_Arbeit_B.docx', 'feedback_Rede_Arbeit_B_7.docx'),
    ('../../Nina:*?', 'rede.docx', 'feedback_Nina_7.docx'),
    ('', '', 'feedback_Arbeit_7.docx'),
])
def test_readable_and_safe_filename(name, source, expected):
    result = feedback_filename(7, name, source)
    assert result == expected
    assert Path(result).name == result


def test_same_names_have_distinct_ids_and_long_unicode_names_fit():
    assert feedback_filename(7, 'Nina', '') != feedback_filename(8, 'Nina', '')
    assert len(feedback_filename(7, '名' * 200, '').encode('utf-8')) < 220


@pytest.mark.parametrize('assigned', [True, False])
def test_real_cli_export_uses_trusted_assignment_or_original_filename(tmp_path, assigned):
    db_path = tmp_path / 'synthetic.db'
    db.init_db(db_path)
    student = db.insert_schueler(db_path, 'TEST', 'Nina', 'Muster') if assigned else None
    raw = json.loads((ROOT / 'tests/fixtures/beispiel_deutsch_mit_fehlern.json').read_text(encoding='utf-8'))
    raw['schueler'] = 'Abweichendes Modelllabel' if assigned else ''
    for criterion in raw['bewertung'].values():
        criterion['stufe'] = criterion['punkte'] = 3
    source = tmp_path / 'Rede_Arbeit_A.docx'
    raw['datei'] = source.name
    doc = Document(); doc.add_paragraph('Synthetischer Text.'); doc.save(source)
    aid = db.save_analysis_to_db(db_path, raw, source, 'TEST', 'Rede', rohtext='Synthetischer Text.', bestaetigte_schueler_id=student)
    target_dir = tmp_path / 'feedback'
    result = subprocess.run([sys.executable, str(ROOT / 'natascha_cli.py'), '--db-path', str(db_path), 'feedback-docx', str(aid), '--revision-id', str(raw['_revision_id']), '--output-dir', str(target_dir)], capture_output=True, text=True, encoding='utf-8')
    assert result.returncode == 0, result.stderr
    target = Path(json.loads(result.stdout)['path'])
    expected = 'Nina_Muster' if assigned else 'Rede_Arbeit_A'
    assert target == target_dir / f'feedback_{expected}_{aid}.docx'
    assert target.is_file()
    if assigned:
        text = ' '.join(p.text for p in Document(target).paragraphs) + ' '.join(c.text for t in Document(target).tables for r in t.rows for c in r.cells)
        assert 'Nina Muster' in text and 'Abweichendes Modelllabel' not in text

    explicit = tmp_path / 'eigener-name.docx'
    result = subprocess.run([sys.executable, str(ROOT / 'natascha_cli.py'), '--db-path', str(db_path), 'feedback-docx', str(aid), '--output', str(explicit)], capture_output=True, text=True, encoding='utf-8')
    assert result.returncode == 0, result.stderr
    assert Path(json.loads(result.stdout)['path']) == explicit and explicit.is_file()
