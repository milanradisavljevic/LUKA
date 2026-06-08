#!/usr/bin/env python3
import json, os, sys, urllib.error, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent

def load_env():
    p = ROOT / ".env"
    if not p.exists():
        return
    for line in p.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        k = k.strip(); v = v.strip().strip(chr(34)).strip(chr(39))
        if k and k not in os.environ:
            os.environ[k] = v

def model_from_config():
    try:
        import tomllib
        cfg = tomllib.loads((ROOT / "natascha_config.toml").read_text(encoding="utf-8"))
        return cfg.get("api", {}).get("model", "deepseek-chat")
    except Exception as e:
        print("[WARN] Config nicht lesbar:", e); return "deepseek-chat"

def balance(text):
    s = text.find("{")
    if s == -1:
        return "KEIN { GEFUNDEN"
    d = 0
    for c in text[s:]:
        d += 1 if c == "{" else (-1 if c == "}" else 0)
    if d == 0:
        return "BALANCIERT (vollstaendig)"
    if d > 0:
        return str(d) + " schliessende } fehlen -> ABGESCHNITTEN"
    return str(abs(d)) + " zu viele }"

def main():
    load_env()
    key = os.environ.get("DEEPSEEK_API_KEY", "")
    if not key:
        print("FEHLER: DEEPSEEK_API_KEY nicht gesetzt"); return 1
    model = model_from_config()
    gross = "--gross" in sys.argv
    print("=" * 60)
    print("DeepSeek-Diagnose | Modell:", model)
    print("=" * 60)
    if gross:
        prompt = ("Du bist Korrekturassistent. Antworte NUR mit validem JSON. "
                  "Erstelle JSON mit datei, textsorte, fach, schulstufe, rubrik, "
                  "bewertung (vier Kriterien je stufe/punkte/staerken/schwaechen/"
                  "vorschlaege) und fehler (alle Sprachfehler, kein Limit, je "
                  "zitat/korrektur/typ/erklaerung). Erfinde einen Beispiel-Kommentar "
                  "zu Jugendsprache und korrigiere ihn mit mindestens 15 Fehlern.")
    else:
        prompt = ("Antworte NUR mit diesem JSON: "
                  + json.dumps({"status": "ok", "zahl": 42}))
    body = {"model": model, "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 4096}
    if "reasoner" not in model.lower():
        body["response_format"] = {"type": "json_object"}
        print("[INFO] response_format=json_object (chat)")
    else:
        print("[INFO] response_format weggelassen (reasoner/R1)")
    print("[INFO] max_tokens=4096, Prompt-Zeichen:", len(prompt))
    print("[INFO] sende ... (R1 denkt evtl. 30-60s)")
    req = urllib.request.Request(
        "https://api.deepseek.com/v1/chat/completions",
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json",
                 "Authorization": "Bearer " + key}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            data = json.loads(r.read())
    except urllib.error.HTTPError as e:
        print("FEHLER HTTP", e.code); print(e.read().decode("utf-8", "replace")[:800]); return 1
    except Exception as e:
        print("FEHLER:", e); return 1
    ch = data.get("choices", [{}])[0]; m = ch.get("message", {})
    fin = ch.get("finish_reason", "?")
    content = m.get("content", "") or ""; reason = m.get("reasoning_content", "") or ""
    u = data.get("usage", {})
    print("-" * 60)
    print("finish_reason     :", fin, "  <<< ABGESCHNITTEN" if fin == "length" else "")
    print("reasoning_content :", len(reason), "Zeichen")
    print("content           :", len(content), "Zeichen")
    if u:
        det = u.get("completion_tokens_details", {}) or {}
        print("tokens p/c        :", u.get("prompt_tokens", "?"), "/",
              u.get("completion_tokens", "?"), " reasoning:", det.get("reasoning_tokens", "?"))
    print("JSON-Balance      :", balance(content))
    print("-" * 60)
    print("CONTENT (erste 400):"); print(content[:400] if content else "(LEER)")
    if len(content) > 400:
        print("..."); print("CONTENT (letzte 200):"); print(content[-200:])
    print("-" * 60); print("DIAGNOSE:")
    if fin == "length":
        print("  -> ABGESCHNITTEN wegen Token-Limit. Ursache gefunden.")
        if reason:
            print("  -> R1 hat", len(reason), "Zeichen gedacht, das frisst die Tokens.")
    elif not content and reason:
        print("  -> content LEER, nur reasoning gefuellt. App liest falsches Feld.")
    elif "ABGESCHNITTEN" in balance(content):
        print("  -> JSON unbalanciert trotz finish_reason", fin)
    else:
        print("  -> vollstaendig. Jetzt mit  python3 deepseek_diag.py --gross  testen.")
    return 0

raise SystemExit(main())
