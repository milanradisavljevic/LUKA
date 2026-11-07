import copy
import sys
from pathlib import Path
import pytest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import scan_review as sr
import natascha_core as nc

@pytest.fixture
def setup_review(tmp_path,monkeypatch):
    source=tmp_path/'scan.png';source.write_bytes(b'original-test-scan')
    config={'api':{'provider':'openai','model':'gpt-5.4'},'paths':{'output':str(tmp_path/'output')}}
    args=dict(file_path=source,config=config,docx_text='',rubric_content=(Path(nc.__file__).parent/'rubrics/deutsch_unterstufe.md').read_text(encoding='utf-8'),fach='Deutsch',schulstufe='Unterstufe',textsorte='Brief',
        klasse='TEST-7a',aufgabe='SYNTHETISCH',db_path_override=tmp_path/'test.db',pseudonymisierung=True)
    def analysis(**kw):
        return {'datei':'scan.png','textsorte':'Brief','fach':'Deutsch','schulstufe':'Unterstufe','rubrik':'test',
          'bewertung':{'sprache':{'punkte':3,'stufe':3,'staerken':[],'schwaechen':[],'vorschlaege':[]}},
          'fehler':[{'zitat':'Erfahnung','korrektur':'Erfahrung','typ':'R'}] if 'Erfahnung' in kw['scan_text'] else [],
          'notenempfehlung':{'note':3,'durchschnitt':3,'bezeichnung':'Befriedigend','begruendung':'Test'}},[]
    monkeypatch.setattr(nc,'run_llm_analysis',analysis)
    monkeypatch.setattr(nc,'extract_scan',lambda *a:{'seiten':[{'seite':1,'text':'Erfahnung'}]})
    return args,config


def prepare(pair):
    args,config=pair
    return sr.process(args,config,'openai','gpt-5.4','gpt-5.4','prepare')['scan_review']


def test_two_reads_correct_then_reassess_without_persisting(setup_review,monkeypatch):
    calls=[]
    def read(*a):
        calls.append(a)
        return {'text':'Erfahrung','unreadable':False}
    monkeypatch.setattr(sr,'read_image',read)
    session=prepare(setup_review)
    assert session['pages'][0]['text']=='Erfahrung'
    assert len(calls)==2
    assert not session['analysis']['fehler']
    args,_=setup_review
    with nc.ndb.sqlite3.connect(args['db_path_override']) as db:
        assert db.execute('SELECT COUNT(*) FROM abgabe').fetchone()[0]==0


def test_disagreement_stays_open_no_numbers(setup_review,monkeypatch):
    reads=iter([{'text':'Erfahrung','unreadable':False},{'text':'Erfarnung','unreadable':False}]*2)
    monkeypatch.setattr(sr,'read_image',lambda *a:next(reads))
    session=prepare(setup_review)
    assert session['pages'][0]['text']=='Erfahnung'
    assert session['analysis']['scan_review']['numericBlocked']
    assert 'notenempfehlung' not in session['analysis']
    assert session['analysis']['bewertung']['sprache']['punkte'] is None


def test_teacher_undo_is_not_overwritten_and_stale_write_rejected(setup_review,monkeypatch):
    monkeypatch.setattr(sr,'read_image',lambda *a:{'text':'Erfahrung','unreadable':False})
    session=prepare(setup_review);issue=session['issues'][0];_,config=setup_review
    updated=sr.resolve(config,session['id'],session['revision'],issue['id'],'Erfahnung')
    assert updated['state']=='dirty'
    with pytest.raises(ValueError,match='zwischenzeitlich'):
        sr.resolve(config,session['id'],session['revision'],issue['id'],'x')
    again=prepare(setup_review)
    assert again['pages'][0]['text']=='Erfahnung'
    assert again['analysis']['fehler'][0]['zitat']=='Erfahnung'


def test_restart_resumes_and_source_change_rejected(setup_review,monkeypatch):
    monkeypatch.setattr(sr,'read_image',lambda *a:{'text':'Erfahnung','unreadable':False})
    session=prepare(setup_review)
    monkeypatch.setattr(nc,'extract_scan',lambda *a:pytest.fail('OCR darf nicht wiederholt werden'))
    assert prepare(setup_review)['id']==session['id']
    args,config=setup_review;args['file_path'].write_bytes(b'changed')
    with pytest.raises(ValueError,match='Original'):
        sr.load(config,session['id'])


def test_commit_idempotent(setup_review,monkeypatch):
    monkeypatch.setattr(sr,'read_image',lambda *a:{'text':'Erfahnung','unreadable':False})
    session=prepare(setup_review);args,config=setup_review
    first=sr.process(args,config,'openai','gpt-5.4','gpt-5.4','commit',session['id'])
    second=sr.process(args,config,'openai','gpt-5.4','gpt-5.4','commit',session['id'])
    assert first['abgabe_id']==second['abgabe_id']
    with nc.ndb.sqlite3.connect(args['db_path_override']) as db:
        assert db.execute('SELECT COUNT(*) FROM korrektur_revision').fetchone()[0]==1


def test_explicit_reanalysis_refreshes_committed_scan_but_retries_stay_idempotent(setup_review, monkeypatch):
    args, config = setup_review
    args['reanalyze_existing'] = True
    original_analysis = nc.run_llm_analysis
    calls = []
    def analysis(**kwargs):
        calls.append(True)
        return original_analysis(**kwargs)
    monkeypatch.setattr(nc, 'run_llm_analysis', analysis)
    monkeypatch.setattr(sr, 'read_image', lambda *a: {'text': 'Erfahnung', 'unreadable': False})
    session = prepare(setup_review)
    sr.process(args, config, 'openai', 'gpt-5.4', 'gpt-5.4', 'commit', session['id'])
    count = len(calls)
    monkeypatch.setattr(nc, 'extract_scan', lambda *a: pytest.fail('Geprüfte Abschrift wiederverwenden'))
    second = prepare(setup_review)
    assert second['revision'] > session['revision'] and len(calls) > count
    count = len(calls)
    assert prepare(setup_review)['revision'] == second['revision'] and len(calls) == count
    for _ in range(2):
        sr.process(args, config, 'openai', 'gpt-5.4', 'gpt-5.4', 'commit', second['id'])
    with nc.ndb.sqlite3.connect(args['db_path_override']) as conn:
        assert conn.execute('SELECT COUNT(*) FROM abgabe').fetchone()[0] == 1
        assert conn.execute('SELECT COUNT(*) FROM korrektur_revision').fetchone()[0] == 2


def test_qualitative_export_accepts_null_without_zero(setup_review,monkeypatch):
    import generate_feedback as gf
    monkeypatch.setattr(sr,'read_image',lambda *a:{'text':'[unleserlich]','unreadable':True})
    session=prepare(setup_review)
    parsed=gf.parse_feedback_data(session['analysis'])
    assert parsed.bewertung[0].punkte is None
    doc=gf.build_feedback_document(parsed)
    assert 'NOTENEMPFEHLUNG' not in '\n'.join(p.text for p in doc.paragraphs)

def test_raw_scan_preview_real_core_has_no_persistence(tmp_path,monkeypatch):
    import json
    source=tmp_path/'synthetic.png';source.write_bytes(b'scan')
    fixture=json.loads((Path(__file__).parent/'fixtures'/'beispiel_deutsch_mit_fehlern.json').read_text(encoding='utf-8'))
    monkeypatch.setattr(nc,'run_llm_api',lambda *a,**k:json.dumps(fixture))
    monkeypatch.setattr(nc,'persist_analysis_result',lambda *a,**k:pytest.fail('Vorschau darf nicht speichern'))
    monkeypatch.setattr(nc,'approved_scan',lambda *a:None)
    data,errors=nc.run_llm_analysis(docx_text='',rubric_content=(Path(nc.__file__).parent/'rubrics/deutsch_unterstufe.md').read_text(encoding='utf-8'),fach='Deutsch',schulstufe='Unterstufe',
        textsorte='Eroerterung',config=nc.load_config(),file_path=source,scan_text='Dies ist synthetischer Schuelertext.',persist=False,pseudonymisierung=False)
    assert data is not None,errors
    assert '_abgabe_id' not in data


def test_failure_resumes_analysis_and_never_repeats_ocr(setup_review,monkeypatch):
    monkeypatch.setattr(sr,'read_image',lambda *a: (_ for _ in ()).throw(ValueError('HTTP 429')))
    with pytest.raises(ValueError,match='429'):
        prepare(setup_review)
    monkeypatch.setattr(nc,'extract_scan',lambda *a:pytest.fail('OCR wiederholt'))
    monkeypatch.setattr(nc,'run_llm_analysis',lambda *a,**k:pytest.fail('Vorhandene Analyse wiederholt'))
    monkeypatch.setattr(sr,'read_image',lambda *a:{'text':'Erfahnung','unreadable':False})
    assert prepare(setup_review)['state']=='ready'


def test_context_change_cannot_commit_previous_preview(setup_review,monkeypatch):
    monkeypatch.setattr(sr,'read_image',lambda *a:{'text':'Erfahnung','unreadable':False})
    session=prepare(setup_review);args,config=setup_review
    args={**args,'rubric_content':'Anderes Raster'}
    with pytest.raises(ValueError,match='Auftrag'):
        sr.process(args,config,'openai','gpt-5.4','gpt-5.4','commit',session['id'])


def test_missing_box_uses_page_without_guessing_occurrence():
    session={'pages':[{'seite':1,'text':'Fehler hier. Fehler dort.'}]}
    result=sr.regions(session,[{'zitat':'Fehler'}])
    assert len(result)==1 and result[0]['box'] is None
    assert result[0]['old']=='Fehler hier. Fehler dort.'


def test_multipage_pdf_renders_requested_page_at_300dpi(tmp_path):
    import base64,io
    import pypdfium2 as pdfium
    from PIL import Image
    doc=pdfium.PdfDocument.new()
    for _ in range(2):
        page=doc.new_page(72,144);page.close()
    source=tmp_path/'pages.pdf';doc.save(str(source));doc.close()
    image=sr.region_image(source,2)
    with Image.open(io.BytesIO(base64.b64decode(image['source']['data']))) as result:
        assert result.size==(300,600)


def test_same_source_after_approval_keeps_session_identity(setup_review,monkeypatch):
    monkeypatch.setattr(sr,'read_image',lambda *a:{'text':'Erfahnung','unreadable':False})
    session=prepare(setup_review);args,config=setup_review
    args['docx_text']='Freigegebene Abschrift aus einem frueheren Aufruf'
    assert prepare(setup_review)['id']==session['id']


def test_stale_background_result_cannot_overwrite_teacher_decision(setup_review,monkeypatch):
    monkeypatch.setattr(sr,'read_image',lambda *a:{'text':'Erfahnung','unreadable':False})
    session=prepare(setup_review);_,config=setup_review
    background=sr.load(config,session['id'])
    newer=sr.load(config,session['id']);newer['revision']+=1;sr.save(newer,config)
    with pytest.raises(ValueError,match='zwischenzeitlich'):
        sr.save(background,config)

def test_mistral_direct_image_read_never_gets_expected_text(tmp_path,monkeypatch):
    import json
    monkeypatch.setenv('MISTRAL_API_KEY','synthetic-test-key')
    pixels={'type':'image','source':{'media_type':'image/jpeg','data':'c3ludGhldGlj'}}
    monkeypatch.setattr(sr,'region_image',lambda *a:pixels)
    def request(base,key,model,prompt,timeout,**kwargs):
        assert model=='mistral-small-2603'
        assert 'ERWARTETE_LESART' not in prompt
        assert kwargs['vision_content']==[pixels]
        return json.dumps({'text':'Ich habbe','unreadable':False})
    monkeypatch.setattr(nc,'_call_openai_compat',request)
    result=sr.read_image(tmp_path/'test.png',{'page':1,'old':'ERWARTETE_LESART','box':None},'mistral','mistral-small-2603')
    assert result['text']=='Ich habbe'
