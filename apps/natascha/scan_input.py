"""Scan-Formate nach offizieller Anbieter-Dokumentation, Stand 2026-10-26.

Quellen:
https://developers.openai.com/api/docs/guides/file-inputs
https://docs.mistral.ai/studio/document-processing/basic_ocr
https://api-docs.deepseek.com/guides/vision/
https://platform.moonshot.ai/docs/guide/kimi-k3-quickstart
https://www.alibabacloud.com/help/en/model-studio/vision-model/
"""
from __future__ import annotations

import base64
import io
import json
import re
import threading
import urllib.error
import urllib.request


def scan_capable(provider: str, model: str) -> bool:
    """Nur bestaetigte Modellfamilien freigeben."""
    p, m = provider.lower(), model.lower()
    if p == "anthropic":
        return m.startswith("claude-")
    if p == "openai":
        return (m.startswith(("gpt-4o", "gpt-4.1", "gpt-4-turbo", "gpt-5", "gpt-6"))
                or m in {"o3", "o3-pro", "o4-mini"})
    if p == "mistral":
        return m == "mistral-ocr-latest" or (bool(m) and not m.startswith(("mistral-embed", "mistral-ocr")))
    if p == "deepseek":
        return m in {"deepseek-flash", "deepseek-v4-flash-vision-exp"}
    if p == "kimi":
        return m in {"kimi-k2.5", "kimi-k2.6", "kimi-k3"}
    if p == "qwen":
        return ("vl" in m or "omni" in m or m in {
            "qwen3.8-max", "qwen3.8-max-0902", "qwen3.8-flash",
            "qwen3.7-plus", "qwen3.7-flash", "qwen3.6-plus", "qwen3.6-flash",
            "qwen3.5-plus", "qwen3.5-flash",
        })
    return False


def _cancel(event: threading.Event | None) -> None:
    if event is not None and event.is_set():
        raise ValueError("Abgebrochen")


def provider_http_error(error: urllib.error.HTTPError, provider: str) -> str:
    """Nur Status und begrenzte technische Felder weitergeben, nie Antworttexte/Scans/Keys."""
    detail = {"provider": provider, "status": error.code}
    try:
        body = json.loads(error.read(64 * 1024))
        fields = body.get("error", body) if isinstance(body, dict) else {}
        if isinstance(fields, dict):
            for name in ("code", "type", "param"):
                value = str(fields.get(name) or "")
                if re.fullmatch(r"[A-Za-z0-9_.\[\]-]{1,80}", value) and not any(
                    word in value.lower() for word in ("sk-", "bearer", "base64")
                ):
                    detail[name] = value
    except (OSError, ValueError, TypeError):
        pass
    # Bestehende CLI-Auswerter erkennen 429 weiterhin am bisherigen Marker.
    prefix = "FEHLER: [rate_limited] " if error.code == 429 else "FEHLER: "
    return prefix + "[provider_http] " + json.dumps(detail, ensure_ascii=False)


def pdf_images(block: dict, cancel_event: threading.Event | None = None) -> list[dict]:
    """PDF lokal rendern; begrenzte Seitenzahl und Bildgroesse."""
    import pypdfium2 as pdfium

    raw = base64.b64decode(block["source"]["data"], validate=True)
    images = []
    with pdfium.PdfDocument(raw) as document:
        if not 1 <= len(document) <= 30:
            raise ValueError("Bitte PDFs mit 1 bis 30 Seiten verwenden oder die Datei aufteilen.")
        for i in range(len(document)):
            _cancel(cancel_event)
            page = document[i]
            try:
                width, height = page.get_size()
                if min(width, height) <= 0:
                    raise ValueError("Ungueltige PDF-Seitengroesse.")
                bitmap = page.render(scale=min(200 / 72, 2400 / max(width, height)))
                try:
                    image = bitmap.to_pil().convert("RGB")
                    try:
                        with io.BytesIO() as buffer:
                            image.save(buffer, format="JPEG", quality=92)
                            data = base64.b64encode(buffer.getvalue()).decode("ascii")
                    finally:
                        image.close()
                finally:
                    bitmap.close()
            finally:
                page.close()
            images.append({"type": "image", "source": {
                "type": "base64", "media_type": "image/jpeg", "data": data,
            }})
    return images


def chat_parts(blocks: list[dict], native_pdf: bool,
               cancel_event: threading.Event | None = None) -> list[dict]:
    """Dokumentbloecke niemals stillschweigend weglassen."""
    result = []
    for block in blocks:
        _cancel(cancel_event)
        src = block["source"]
        if block["type"] == "document":
            if native_pdf:
                result.append({"type": "file", "file": {
                    "filename": "scan.pdf",
                    "file_data": f"data:application/pdf;base64,{src['data']}",
                }})
            else:
                result.extend(chat_parts(pdf_images(block, cancel_event), False, cancel_event))
        elif block["type"] == "image":
            result.append({"type": "image_url", "image_url": {
                "url": f"data:{src['media_type']};base64,{src['data']}",
            }})
        else:
            raise ValueError("Nicht unterstuetzter Scan-Inhalt.")
    if len(json.dumps(result)) > 40 * 1024 * 1024:
        raise ValueError("Die aufbereiteten Scans sind zu gross. Bitte PDF aufteilen.")
    return result


def mistral_ocr(block: dict, api_key: str, base_url: str, timeout: int,
                cancel_event: threading.Event | None = None) -> dict:
    """Seiten getrennt zurueckgeben; Ergebnis bleibt ungeprueft."""
    _cancel(cancel_event)
    src = block["source"]
    field = "document_url" if block["type"] == "document" else "image_url"
    document = {"type": field, field: f"data:{src['media_type']};base64,{src['data']}"}
    payload = json.dumps({"model": "mistral-ocr-latest", "document": document,
                          "include_image_base64": False, "include_blocks": True,
                          "confidence_scores_granularity": "block"}).encode("utf-8")
    request = urllib.request.Request(base_url.rstrip("/") + "/ocr", data=payload,
                                     headers={"Content-Type": "application/json",
                                              "Authorization": f"Bearer {api_key}"})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            data = json.loads(response.read())
        _cancel(cancel_event)
        pages = data.get("pages")
        if not isinstance(pages, list) or not pages:
            raise ValueError("OCR hat keine Seiten geliefert.")
        normalized = []
        for number, page in enumerate(pages, 1):
            text = page.get("markdown")
            if not isinstance(text, str):
                raise ValueError(f"OCR-Seite {number} hat ein ungueltiges Format.")
            normalized.append({"seite": number, "text": text,
                               "leer": not bool(text.strip()), "blocks": page.get("blocks", []),
                               "dimensions": page.get("dimensions"), "confidence_scores": page.get("confidence_scores")})
        if not any(p["text"].strip() for p in normalized):
            raise ValueError("OCR hat keinen lesbaren Text erkannt.")
        return {"anbieter": "mistral", "modell": "mistral-ocr-latest",
                "seiten": normalized,
                "transkription": "\n\n".join(p["text"] for p in normalized),
                "geprueft": False}
    except urllib.error.HTTPError as exc:
        raise ValueError(provider_http_error(exc, "Mistral OCR")) from None
    except (urllib.error.URLError, TimeoutError, ConnectionError):
        raise ValueError("Mistral OCR ist nicht erreichbar. Bitte Verbindung pruefen.") from None
