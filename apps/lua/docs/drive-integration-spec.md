# Design-Spec: Google-Drive-Integration (Quelltext-Import)

> **Status:** Entwurf / nicht implementiert. Umsetzung **nach** dem ersten Lehrer-Test.
> Diese Spec legt den Flow, die Scopes, die Token-Speicherung, die UX und das
> Sicherheitsmodell fest, damit die spätere Implementierung geradlinig ist.

## 1. Ziel & Abgrenzung

Lehrkräfte sollen Quelltexte (Word-Dokumente, PDFs, Google Docs, reine Texte)
direkt aus ihrem Google Drive in Schritt 1 („Quelltexte") importieren, statt sie
erst lokal herunterzuladen und dann hochzuladen.

**In Scope (Phase 1 der Umsetzung):**
- Anmeldung mit Google (OAuth 2.0, read-only).
- Datei-Auswahl über den Google Picker.
- Download/Export der gewählten Datei → Text (analog zum bestehenden Upload-Pfad).

**Nicht in Scope:**
- Schreiben/Hochladen nach Drive.
- Ordner-Synchronisation, Mehrfachkonten, geteilte Team-Drives als Erstklasse-Feature.
- Verarbeitung personenbezogener Schülerdaten (siehe §6).

## 2. OAuth-2.0-Flow (Desktop, PKCE)

Da die App eine Tauri-Desktop-App ist (kein vertrauenswürdiger Server, kein
geheimer Client-Secret-Speicher), nutzen wir **Authorization Code Flow mit PKCE**
für einen „Desktop/Installed App"-Client.

```
[App] --(1) öffnet System-Browser--> [Google Consent Screen]
       (2) code_challenge = S256(code_verifier)
[Google] --(3) redirect mit ?code=…--> [loopback: http://127.0.0.1:<port>/callback]
[App] --(4) POST /token (code + code_verifier)--> [Google]
[Google] --(5) access_token (+ refresh_token)--> [App]
```

**Implementierungsdetails:**
- **Redirect-URI:** Loopback `http://127.0.0.1:<freier_port>` (Google empfiehlt Loopback
  für Desktop-Apps). Rust startet kurzzeitig einen lokalen HTTP-Listener (z. B. via
  `tiny_http` oder manuell über `tokio::net::TcpListener`) und nimmt den `code` entgegen.
- **System-Browser öffnen:** `tauri-plugin-opener` bzw. `open`-Crate.
- **PKCE:** `code_verifier` (43–128 Zeichen, zufällig), `code_challenge = base64url(sha256(verifier))`,
  `code_challenge_method=S256`.
- **Client-ID:** Ein OAuth-Client vom Typ „Desktop App" in der Google Cloud Console.
  Kein Client-Secret im Code hinterlegen (bei Desktop-Clients ist das Secret nicht
  vertraulich; PKCE schützt den Flow). **Externes Setup nötig:** Projekt + OAuth-Consent-Screen
  + Aktivierung der Drive-API + Picker-API.
- **Token-Refresh:** `refresh_token` verwenden, um abgelaufene `access_token` (≈1 h) zu erneuern.

## 3. Scopes (minimal, read-only)

| Scope | Zweck |
|-------|-------|
| `https://www.googleapis.com/auth/drive.readonly` | Lesen/Exportieren der vom Nutzer gewählten Datei |
| `https://www.googleapis.com/auth/drive.file` *(Alternative, enger)* | Nur über den Picker freigegebene Dateien — **bevorzugt**, falls Picker-only ausreicht |

**Empfehlung:** Mit dem **Google Picker** kombiniert reicht `drive.file` (nur die im
Picker ausgewählten Dateien werden zugänglich) — das ist der datensparsamste Weg und
vermeidet den Google-„Restricted Scope"-Verifizierungsaufwand von `drive.readonly`.

## 4. Datei-Export-Mapping

| Drive-MIME-Typ | Aktion | Ergebnis |
|----------------|--------|----------|
| `application/vnd.google-apps.document` (Google Doc) | `files.export` → `text/plain` | direkt Text |
| `application/vnd.openxmlformats-…wordprocessingml.document` (.docx) | `files.get?alt=media` → Bytes | über bestehenden `mammoth`-Pfad zu Text |
| `application/pdf` | `files.get?alt=media` → Bytes | über bestehenden `pdfjs`-Pfad (Textebene; kein OCR) |
| `text/plain`, `text/html` | `files.get?alt=media` | Text (HTML → `strip_html`, siehe `fetch_url`) |

Der Datei-Inhalt wird in denselben Quelltext-Datensatz überführt wie Upload/URL:
`{ id, titel: <dateiname>, inhalt: <text>, herkunft: { typ: 'drive', ref: <fileId> } }`.

> **Schema-Hinweis:** `herkunft.typ` muss um `'drive'` erweitert werden
> (`QuellTextSchema` in `packages/schema`). Bis dahin `'upload'` mit `ref` = Drive-Dateiname.

## 5. Token-Speicherung

Wiederverwendung des bestehenden **Keystores** (`src-tauri/src/keystore.rs`, OS-Keychain
via `keyring`-Crate), den die App bereits für LLM-API-Keys nutzt.

- Schlüssel: `google_oauth_refresh_token` (nur der `refresh_token` wird persistiert).
- `access_token` nur im Speicher halten (flüchtig), bei Bedarf per Refresh erneuern.
- „Abmelden"-Aktion: Refresh-Token aus Keystore löschen + Google-Token-Revoke-Endpoint aufrufen.

## 6. Sicherheit & Datenschutz

- **Keine Schülerdaten:** Die Integration ist ausschließlich für Lehrer-Unterrichtsmaterial
  gedacht. UI-Hinweis beim ersten Connect, dass keine personenbezogenen Schülerdaten
  importiert werden sollen.
- **Read-only + Picker-only** (`drive.file`) → minimaler Zugriff.
- **Prompt-Injection:** Importierter Drive-Text durchläuft denselben `sanitizeQuelltext`-Pfad
  wie jeder andere Quelltext (Quelltexte sind DATEN, keine Anweisungen).
- **Token im OS-Keychain**, nie im Klartext/LocalStorage.
- **Transport:** ausschließlich HTTPS gegen Google-Endpunkte.

## 7. UX

- In `Step1_Input.tsx` neben „📂 Datei hochladen" und dem URL-Feld ein Button
  **„🟦 Aus Google Drive importieren"**.
- Erststart: Button → OAuth-Flow im Browser → nach Erfolg Picker.
- Folgestarts: direkt Picker (Token aus Keystore, ggf. still refreshen).
- Statusanzeige „Verbunden als <email>" + „Abmelden" (z. B. im `SettingsPanel`).
- Außerhalb von Tauri (reiner Browser-Dev): Button deaktiviert mit Hinweis
  „Nur in der Desktop-App verfügbar" (analog zur LLM-Generierung).

## 8. Fehlerfälle

| Fall | Verhalten |
|------|-----------|
| Nutzer bricht Consent ab | Freundlicher Hinweis, kein Token gespeichert |
| `refresh_token` ungültig/abgelaufen | Erneuter Consent-Flow ausgelöst |
| Datei zu groß / Export schlägt fehl | Fehlermeldung, Vorschlag manueller Upload |
| Kein Netz | „Google nicht erreichbar" (deutsch) |
| Scan-PDF ohne Textebene | Hinweis: kein Text gefunden (OCR später) |

## 9. Tauri-Commands (Schnittstelle, später zu bauen)

```
google_oauth_connect() -> Result<{ email: String }, String>   // startet Flow, speichert Token
google_oauth_status()  -> Result<Option<{ email: String }>, String>
google_oauth_logout()  -> Result<(), String>
drive_import_file(file_id: String, mime: String) -> Result<String, String>  // liefert Text
```

Der Picker selbst läuft im Web-Layer (Google Picker JS-API mit dem `access_token`);
nur Token-Verwaltung und der eigentliche Datei-Download liegen in Rust.

## 10. Aufwandsschätzung

- Google Cloud Console Setup (Projekt, Consent-Screen, Client, API-Aktivierung): ~0,5 Tag (extern, einmalig).
- Rust OAuth/PKCE + Loopback-Listener + Keystore-Anbindung: ~1–1,5 Tage.
- Picker-Integration + Export-Mapping im Web: ~1 Tag.
- Schema-Erweiterung `herkunft.typ: 'drive'` + Tests: ~0,25 Tag.
- **Summe:** ~3–3,5 Tage netto, plus Google-Verifizierung (Wartezeit) falls `drive.readonly` statt `drive.file`.
