"""Lesbare, plattformübergreifende Namen für lokale Feedback-Exporte."""
from __future__ import annotations

from pathlib import Path
import re
import unicodedata


def feedback_filename(abgabe_id: int, student_name: str, original_filename: str) -> str:
    name = student_name.strip()
    if not name or name.casefold() in {"unbekannt", "unknown", "unbekannt unbekannt"}:
        name = Path(original_filename.replace("\\", "/").rsplit("/", 1)[-1]).stem
    name = unicodedata.normalize("NFC", name)
    name = re.sub(r'[<>:"/\\|?*\x00-\x1f\x7f]', "_", name)
    name = re.sub(r"[\s_]+", "_", name).strip(" ._")
    name = name[:80].encode("utf-8")[:160].decode("utf-8", errors="ignore").rstrip(" ._")
    return f"feedback_{name or 'Arbeit'}_{abgabe_id}.docx"
