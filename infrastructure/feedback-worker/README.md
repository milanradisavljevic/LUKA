# LUKA Feedback Worker

Dieser Worker nimmt ausschließlich Bug-Reports aus LUKA an und leitet sie per
Resend an `milanradisavljevic7@gmail.com` weiter. Er ist kein allgemeiner
E-Mail-Endpunkt und enthält keine Zugangsdaten.

## Einmalig einrichten

1. Bei Resend ein kostenloses Konto mit `milanradisavljevic7@gmail.com`
   einrichten und einen API-Schlüssel mit ausschließlich Versandberechtigung
   erstellen.
2. Den Schlüssel nur im Cloudflare-Projekt setzen:

   ```powershell
   npx wrangler secret put RESEND_API_KEY
   ```

3. Worker bereitstellen:

   ```powershell
   npx wrangler deploy
   ```

4. Die ausgegebene `workers.dev`-Adresse im Release-Build setzen; der Pfad ist
   immer `/v1/reports`:

   ```powershell
   $env:LUKA_BUG_REPORT_ENDPOINT = 'https://<dein-worker>.workers.dev/v1/reports'
   pnpm tauri build
   ```

Der Versand wird vom nativen Rust-Backend ausgeführt. Deshalb braucht die
WebView-CSP keine breite `workers.dev`-Ausnahme.

Für den kostenlosen Resend-Testversand muss die Empfängeradresse im Konto
bestätigt sein. Vor dem ersten Release einen echten Bericht aus einem
Release-Build senden. Ein eigener, bei Resend bestätigter Domain-Absender kann
später über `RESEND_FROM` ergänzt werden und ändert weder die App noch das
Report-Format.

## Betrieb

- Der API-Schlüssel gehört nie in `wrangler.toml`, `.env`, Git oder den
  LUKA-Build. Der Worker liest ihn ausschließlich als Cloudflare Secret.
- `REPORT_RATE_LIMIT` begrenzt auf drei Berichte je Herkunft und Minute. Das
  verhindert nicht jeden Missbrauch eines öffentlichen Endpunkts, begrenzt aber
  Mail- und Kostenrisiko ohne Lehrkräfte anzumelden.
- Zum sofortigen Abschalten des Versands den Cloudflare-Secret
  `RESEND_API_KEY` entfernen oder den Worker deaktivieren.
- Tests lokal ausführen: `npm test`.
