import base64
import io
import json
import sys
import threading
from pathlib import Path
from unittest.mock import MagicMock

import pytest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import natascha_core as nc
import scan_input as si


def block(kind='image'):
    return {'type':kind,'source':{'media_type':'application/pdf' if kind=='document' else 'image/png','data':base64.b64encode(b'scan').decode()}}


@pytest.mark.parametrize('provider,model,expected',[
 ('openai','gpt-5.4-mini',True),('openai','gpt-6.1-sol',True),
 ('openai','o3-mini',False),('deepseek','deepseek-flash',True),
 ('deepseek','deepseek-v4-pro',False),('mistral','mistral-small-latest',True),
 ('mistral','mistral-ocr-latest',True),('mistral','mistral-embed',False),
 ('kimi','kimi-k2.6',True),('kimi','kimi-k3',True),
 ('qwen','qwen3.8-max',True),('qwen','qwen3.7-plus',True),('kimi','moonshot-v1',False),
 ('qwen','qwen-vl-max',True),('qwen','qwen3-max',False),
 ('anthropic','claude-sonnet-4-6',True),('ollama','qwen3',False),
])
def test_capabilities(provider,model,expected):
    assert nc.is_vision_capable(provider,model,Path('scan.pdf')) is expected


def test_openai_native_pdf():
    parts=si.chat_parts([block('document'),block()],True)
    assert [p['type'] for p in parts]==['file','image_url']
    assert parts[0]['file']['file_data'].startswith('data:application/pdf;base64,')


def test_pdf_pages_are_not_dropped(monkeypatch):
    monkeypatch.setattr(si,'pdf_images',lambda *args:[block(),block()])
    assert len(si.chat_parts([block('document')],False))==2


def test_cancel_before_render():
    event=threading.Event();event.set()
    with pytest.raises(ValueError,match='Abgebrochen'):
        si.chat_parts([block('document')],False,event)


def response(data):
    mock=MagicMock();mock.__enter__.return_value.read.return_value=json.dumps(data).encode()
    return mock


def test_mistral_request_and_order(monkeypatch):
    seen=[]
    def request(req,**kwargs):
        seen.append(json.loads(req.data))
        return response({'pages':[{'markdown':'Ich habbe'},{'markdown':'geschriben.'}]})
    monkeypatch.setattr(si.urllib.request,'urlopen',request)
    result=si.mistral_ocr(block('document'),'secret','https://api.mistral.ai/v1',10)
    assert seen[0]['document']['type']=='document_url'
    assert result['transkription']=='Ich habbe\n\ngeschriben.'
    assert result['geprueft'] is False


@pytest.mark.parametrize('status,code', [
    (401, 'invalid_api_key'), (403, 'permission_denied'), (404, 'model_not_found'),
    (400, 'invalid_value'), (429, 'insufficient_quota'), (429, 'rate_limit_exceeded'),
    (500, 'server_error'),
])
def test_http_metadata_survives_scan_extraction_without_raw_body(monkeypatch, tmp_path, status, code):
    from urllib.error import HTTPError
    monkeypatch.setenv('OPENAI_API_KEY', 'test-key')
    source = tmp_path / 'synthetic.png'
    source.write_bytes(b'synthetic')
    body = {'error': {'code': code, 'type': 'invalid_request_error',
                      'param': 'messages[0].content[0].file.file_data',
                      'message': 'PRIVATE DOCUMENT and sk-secret must stay hidden'}}
    calls = []
    def fail(request, **kwargs):
        calls.append(request)
        raise HTTPError(request.full_url, status, 'rejected', {},
                        io.BytesIO(json.dumps(body).encode()))
    monkeypatch.setattr(si.urllib.request, 'urlopen', fail)
    with pytest.raises(ValueError) as error:
        nc.extract_scan(source, {'api': {'provider': 'openai', 'model': 'gpt-5.4'},
                                 'paths': {'output': str(tmp_path / 'output')}})
    detail = json.loads(str(error.value).split('[provider_http] ', 1)[1])
    assert detail['status'] == status
    assert detail['code'] == code
    assert detail['provider'] == 'OpenAI'
    assert detail['param'] == body['error']['param']
    assert 'PRIVATE' not in str(error.value) and 'sk-secret' not in str(error.value)
    assert len(calls) == 1


def test_mistral_http_keeps_numeric_code_without_raw_body(monkeypatch):
    from urllib.error import HTTPError
    def fail(request, **kwargs):
        raise HTTPError(request.full_url, 429, 'rejected', {},
                        io.BytesIO(b'{"code":1300,"message":"private document"}'))
    monkeypatch.setattr(si.urllib.request, 'urlopen', fail)
    with pytest.raises(ValueError) as error:
        si.mistral_ocr(block(), 'test-key', 'https://api.mistral.ai/v1', 10)
    assert '"code": "1300"' in str(error.value)
    assert 'private document' not in str(error.value)


@pytest.mark.parametrize('body', [b'not json private body', b'{"error":"private"}',
    b'{"error":{"code":"sk-secret","param":"data:image/png;base64,private"}}'])
def test_http_metadata_rejects_unstructured_and_sensitive_fields(body):
    from urllib.error import HTTPError
    result = si.provider_http_error(HTTPError('https://api.openai.com', 400, 'private', {},
                                            io.BytesIO(body)), 'OpenAI')
    assert 'private' not in result and 'sk-secret' not in result
    assert json.loads(result.split('[provider_http] ', 1)[1]) == {'provider': 'OpenAI', 'status': 400}


@pytest.mark.parametrize('pages',[[],[{'markdown':''}],None])
def test_empty_ocr_is_failure(monkeypatch,pages):
    monkeypatch.setattr(si.urllib.request,'urlopen',lambda *a,**k:response({'pages':pages}))
    with pytest.raises(ValueError):
        si.mistral_ocr(block(),'secret','https://api.mistral.ai/v1',10)


@pytest.mark.parametrize('provider,model,base',[
 ('openai','gpt-5.4','https://api.openai.com/v1'),
 ('deepseek','deepseek-flash','https://api.deepseek.com/v1'),
 ('kimi','kimi-k2.6','https://api.moonshot.ai/v1'),
 ('qwen','qwen-vl-max','https://dashscope-intl.aliyuncs.com/compatible-mode/v1'),
])
def test_provider_sends_images(monkeypatch,provider,model,base):
    monkeypatch.setenv(provider.upper()+'_API_KEY','test-key')
    seen=[]
    def request(req,**kwargs):
        seen.append((req.full_url,json.loads(req.data)))
        return response({'choices':[{'message':{'content':'{}'},'finish_reason':'stop'}]})
    monkeypatch.setattr(si.urllib.request,'urlopen',request)
    assert nc.run_llm_api('JSON',{'api':{'provider':provider,'model':model}},vision_content=[block()])=='{}'
    assert seen[0][0]==base+'/chat/completions'
    assert seen[0][1]['messages'][0]['content'][0]['type']=='image_url'


def test_mistral_ocr_then_analysis(monkeypatch):
    monkeypatch.setenv('MISTRAL_API_KEY','test-key')
    monkeypatch.setattr(si,'mistral_ocr',lambda *args:{'transkription':'Ich habbe geschriben.'})
    seen=[]
    def request(req,**kwargs):
        seen.append(json.loads(req.data))
        return response({'choices':[{'message':{'content':'{}'},'finish_reason':'stop'}]})
    monkeypatch.setattr(si.urllib.request,'urlopen',request)
    assert nc.run_llm_api('JSON',{'api':{'provider':'mistral','model':'mistral-small-latest'}},vision_content=[block()])=='{}'
    assert 'Ich habbe geschriben.' in seen[0]['messages'][0]['content']


def test_cache_avoids_second_api_call(monkeypatch,tmp_path):
    monkeypatch.setenv('MISTRAL_API_KEY','test-key')
    mock=MagicMock(return_value={'transkription':'Ich habbe','seiten':[{'seite':1,'text':'Ich habbe'}],'geprueft':False})
    monkeypatch.setattr(si,'mistral_ocr',mock)
    monkeypatch.setattr(nc,'resolve_path',lambda *a:tmp_path)
    source=tmp_path/'scan.png';source.write_bytes(b'image')
    cfg={'api':{'provider':'mistral','model':'mistral-small-latest'}}
    assert nc.extract_scan(source,cfg)['transkription']=='Ich habbe'
    assert nc.extract_scan(source,cfg)['transkription']=='Ich habbe'
    assert mock.call_count==1
    source.write_bytes(b'changed')
    nc.extract_scan(source,cfg)
    assert mock.call_count==2


def test_pdfium_renders_all_pages(tmp_path):
    import pypdfium2 as pdfium
    doc=pdfium.PdfDocument.new()
    for _ in range(2):
        page=doc.new_page(200,300);page.close()
    source=tmp_path/'test.pdf';doc.save(str(source));doc.close()
    raw,_=nc.encode_file_for_vision(source)
    parts=si.chat_parts([raw],False)
    assert len(parts)==2
    assert all(p['image_url']['url'].startswith('data:image/jpeg;base64,') for p in parts)

def test_approved_scan_keeps_original_and_invalidates_on_change(monkeypatch, tmp_path):
    config = {'api':{'provider':'mistral','model':'mistral-small-latest'}}
    monkeypatch.setattr(nc,'resolve_path',lambda *a:tmp_path/'output')
    monkeypatch.setattr(nc,'load_config',lambda:config)
    source=tmp_path/'scan.png';source.write_bytes(b'original')
    nc.approve_scan(source,'Ich habbe Fehler.',config,'mistral','mistral-ocr-latest')
    assert source.read_bytes()==b'original'
    assert nc.read_submission_text(source)=='Ich habbe Fehler.'
    first=nc.approved_scan(source,config)
    nc.approve_scan(source,'Ich habbe andere Fehler.',config,'mistral','mistral-ocr-latest')
    assert nc.approved_scan(source,config)['text_sha256']!=first['text_sha256']
    assert len(list((tmp_path/'output'/'ocr').glob('*.json')))==3
    source.write_bytes(b'changed')
    assert nc.approved_scan(source,config) is None


def test_pdf_text_layer_works_without_vision_model(monkeypatch,tmp_path):
    import pypdfium2 as pdfium
    doc=pdfium.PdfDocument.new();page=doc.new_page(400,500)
    # PDFium-Textobjekt erzeugt eine echte, lokal auslesbare Textebene.
    import ctypes
    from pypdfium2 import raw
    obj = raw.FPDFPageObj_NewTextObj(doc, b'Helvetica', 12)
    text = 'Ein digitaler Schuelertext mit mehr als vierzig Zeichen.'
    encoded = text.encode('utf-16-le') + b'\x00\x00'
    buffer = (ctypes.c_ushort * (len(encoded)//2)).from_buffer_copy(encoded)
    assert raw.FPDFText_SetText(obj, buffer)
    raw.FPDFPage_InsertObject(page, obj)
    page.gen_content()
    source=tmp_path/'digital.pdf';doc.save(str(source));page.close();doc.close()
    result=nc.extract_scan(source,{'api':{'provider':'deepseek','model':'deepseek-v4-pro'}})
    assert result['anbieter']=='lokal'
    assert 'digitaler' in result['transkription']

def test_claude_http_without_native_sdk(monkeypatch):
    monkeypatch.setitem(sys.modules, 'anthropic', None)
    monkeypatch.setenv('ANTHROPIC_API_KEY', 'test-key')
    seen=[]
    def request(req,**kwargs):
        seen.append((req.full_url,json.loads(req.data)))
        return response({'content':[{'type':'text','text':'{"seiten":[{"seite":1,"text":"Original"}]}'}]})
    monkeypatch.setattr(si.urllib.request,'urlopen',request)
    result=nc.run_anthropic_api('Abschreiben','claude-sonnet-4-6',10,vision_content=[block()])
    assert json.loads(result)['seiten'][0]['text']=='Original'
    assert seen[0][0]=='https://api.anthropic.com/v1/messages'
    assert seen[0][1]['messages'][0]['content'][0]['type']=='image'
    assert 'timeout' not in seen[0][1]
