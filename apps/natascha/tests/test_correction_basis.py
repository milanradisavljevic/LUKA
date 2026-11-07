from __future__ import annotations
import copy
import pytest
from correction_basis import basis_hash, validate_basis


def example():
    b = dict(version=1,pruefumfang="vollstaendig",aufgabenstellung="Verfasse eine Rede.",ausgangstext="",rubrik_inhalt="Raster",erwartungshorizont="",umfangsvorgabe="400–500",quellenstatus="nicht_noetig")
    b["bestaetigung_hash"] = basis_hash(b)
    return b


def test_confirmed_and_optional_horizon():
    b=example()
    assert validate_basis(b) == b


@pytest.mark.parametrize("field,value", [("aufgabenstellung","Anderer Auftrag"),("erwartungshorizont","Neue Erwartung"),("umfangsvorgabe","500"),("ausgangstext","Neue Quelle"),("rubrik_inhalt","Anderes Raster")])
def test_changes_require_confirmation(field,value):
    b=example();b[field]=value
    with pytest.raises(ValueError):validate_basis(b)


@pytest.mark.parametrize("amount", ["0","-5","500-400","beliebig",""])
def test_invalid_amount_rejected(amount):
    b=example();b["umfangsvorgabe"]=amount;b["bestaetigung_hash"]=basis_hash(b)
    with pytest.raises(ValueError):validate_basis(b)


def test_language_scope_works_with_unresolved_source():
    b=example();b.update(pruefumfang="sprache",quellenstatus="offen",bestaetigung_hash="")
    assert validate_basis(b)["pruefumfang"] == "sprache"


def test_full_source_must_be_confirmed():
    b=example();b["quellenstatus"]="offen";b["bestaetigung_hash"]=basis_hash(b)
    with pytest.raises(ValueError):validate_basis(b)
