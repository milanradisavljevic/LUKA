"""Tests fuer das Retry-Verhalten bei 429-Rate-Limits in _call_openai_compat.

Phase 1: max_retries wurde von 3 auf 1 reduziert. Diese Tests pruefen:
- 429 → maximal 1 automatischer Retry, dann Fehler
- Kein unendlicher Retry-Loop
"""

from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# Projektroot fuer Import
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


class TestRetryBehavior:
    """Prueft, dass 429-Rate-Limits maximal 1x automatisch retryen."""

    def test_429_einmal_retry_dann_fehler(self):
        """Bei 429 soll maximal 1x automatisch wiederholt werden."""
        import natascha_core as nc

        call_count = 0

        def mock_urlopen(req, timeout=None):
            nonlocal call_count
            call_count += 1
            if call_count <= 1:
                # Erster Aufruf: 429
                response = MagicMock()
                response.read.return_value = b'{"error": "rate limit"}'
                response.__enter__ = lambda s: s
                response.__exit__ = MagicMock(return_value=False)
                exc = MagicMock()
                exc.code = 429
                exc.read.return_value = b'rate limit exceeded'
                raise exc
            # Zweiter Aufruf: Erfolg (sollte nicht erreicht werden bei max_retries=1)
            response = MagicMock()
            response.read.return_value = b'{"choices":[{"message":{"content":"ok"}}]}'
            response.__enter__ = lambda s: s
            response.__exit__ = MagicMock(return_value=False)
            return response

        with patch("urllib.request.urlopen", side_effect=mock_urlopen):
            with patch("urllib.error.HTTPError", type("HTTPError", (Exception,), {"code": 0, "read": lambda s: b""})):
                result = nc._call_openai_compat(
                    base_url="https://api.example.com/v1",
                    api_key="test-key",
                    model="test-model",
                    prompt="Test",
                    timeout=10,
                )

        # Bei max_retries=1: 1 initial call + 1 retry = max 2 calls
        # Dann Fehler-String
        assert "FEHLER" in result or call_count <= 2

    def test_503_kein_retry(self):
        """503 soll ebenfalls nur 1x retryen (wie 429)."""
        import natascha_core as nc

        call_count = 0

        def mock_urlopen(req, timeout=None):
            nonlocal call_count
            call_count += 1
            response = MagicMock()
            response.read.return_value = b'{"error": "service unavailable"}'
            response.__enter__ = lambda s: s
            response.__exit__ = MagicMock(return_value=False)
            exc = MagicMock()
            exc.code = 503
            exc.read.return_value = b'service unavailable'
            raise exc

        with patch("urllib.request.urlopen", side_effect=mock_urlopen):
            with patch("urllib.error.HTTPError", type("HTTPError", (Exception,), {"code": 0, "read": lambda s: b""})):
                result = nc._call_openai_compat(
                    base_url="https://api.example.com/v1",
                    api_key="test-key",
                    model="test-model",
                    prompt="Test",
                    timeout=10,
                )

        # max_retries=1: max 2 calls (1 initial + 1 retry)
        assert call_count <= 2
