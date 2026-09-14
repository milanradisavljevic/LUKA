from pathlib import Path
import pytest
import natascha_core as nc

def test_utf8_and_windows_text(tmp_path):
    p=tmp_path / "abgabe.txt"
    p.write_bytes("Übung – Text".encode("utf-8-sig"))
    assert nc.read_submission_text(p) == "Übung – Text"
    p.write_bytes("Übung – Text".encode("cp1252"))
    assert nc.read_submission_text(p) == "Übung – Text"

@pytest.mark.parametrize("suffix", [".pdf", ".png", ".jpg"])
def test_vision_files_do_not_enter_docx_parser(tmp_path, suffix):
    p=tmp_path / ("abgabe" + suffix)
    p.write_bytes(b"not-a-docx-zip")
    assert nc.read_submission_text(p) == ""

def test_docx_and_odt_dispatch(monkeypatch, tmp_path):
    monkeypatch.setattr(nc, "read_docx_text", lambda p: "docx content")
    monkeypatch.setattr(nc, "read_odt_text", lambda p: "odt content")
    assert nc.read_submission_text(tmp_path / "test.docx") == "docx content"
    assert nc.read_submission_text(tmp_path / "test.odt") == "odt content"
