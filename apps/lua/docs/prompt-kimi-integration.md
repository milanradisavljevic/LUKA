# Prompt für Kimi (mich) — Integration: useGenerate auf invoke umstellen

> Dies ist mein eigener Arbeitsplan. Ich führe ihn selbst aus.

---

## Ziel

`useGenerate` (und damit die gesamte Generierungs-Pipeline) von `fetch`/`@lehrunterlagen/llm` auf `invoke('llm_complete', ...)` umstellen. Damit verschwindet der "process is not defined"-Fehler endgültig und die API-Keys bleiben sicher auf der Rust-Seite.

## Kontext

- Qwen hat `src-tauri/` gebaut und `invoke('llm_complete', ...)` funktioniert.
- Im Root liegt `neue ENV-Datei.txt` mit echten API-Keys. Die Keys müssen über Qwens Rust-Commands in den Keyring geladen werden.
- Die Prompt-Bau-Logik (`packages/llm/src/prompt.ts`) und Zod-Validierung (`validate.ts`) bleiben im TS — sie sind browsertauglich.
- Die alten Provider-Adapter (`provider-*.ts`) können für Node-Tests erhalten bleiben, aber die App nutzt nur noch Rust.

## Schritte

### 1. Provider-Mapping aktualisieren

In `apps/web/src/hooks/useGenerate.ts`:
- `PROVIDER_MAP` erweitern auf 6 Anbieter:
  ```ts
  const PROVIDER_MAP = {
    claude: 'anthropic',
    chatgpt: 'openai',
    deepseek: 'deepseek',
    mistral: 'mistral',
    qwen: 'qwen',
    kimi: 'kimi',
  } as const;
  ```
- `MODEL_MAP` prüfen und aktualisieren (GLM hat neue Modelle/Preise eingetragen).

### 2. `generateDocument`-Aufruf ersetzen

Statt:
```ts
import { generateDocument } from '@lehrunterlagen/llm';
const result = await generateDocument(input, { provider, model, kreativitaet });
```

Wird:
```ts
import { invoke } from '@tauri-apps/api/core';
const result = await invoke('llm_complete', {
  provider: providerId,
  model: apiModel,
  system: systemPrompt,
  messages: [{ role: 'user', content: promptText }],
  kreativitaet: state.kreativitaet,
});
```

**Wichtig:** Der Prompt-Text muss vorher mit `packages/llm/src/prompt.ts` gebaut werden (das ist reine TS-Logik, kein Node-Bezug). Das Ergebnis von `invoke` ist ein String (JSON), der dann mit `packages/llm/src/validate.ts` validiert wird.

### 3. Fehlerbehandlung anpassen

- Netzwerk-Fehler werden jetzt von Tauri/Rust gemeldet
- `error` State in `useGenerate` zeigt die deutsche Fehlermeldung aus Rust an
- Ladezustand (`generating`) bleibt bestehen

### 4. End-to-End-Test mit echtem Key

- Sorge dafür, dass Qwens Keys im Keyring sind (oder lade sie manuell über `invoke('save_api_key', ...)`)
- Öffne die App mit `pnpm run tauri dev`
- Gehe durch den Wizard: Absicht → Quelltexte → Baukasten → LLM-Modell → Generieren
- Wähle einen Anbieter (z. B. Anthropic oder DeepSeek)
- Klicke "Generieren"
- Erwartetes Ergebnis: `DocumentV1` kommt zurück, `generiertesDokument` ist gesetzt, Vorschau zeigt Inhalte

### 5. Fallback für reines Vite-Dev

Wenn `pnpm run dev` (nur Vite, ohne Tauri) läuft, kann `invoke` nicht funktionieren. Zeige einen Hinweis:
> "LLM-Generierung ist nur in der Desktop-App verfügbar. Bitte `pnpm run tauri dev` verwenden."

Dieser Fall tritt auf, wenn jemand nur das Frontend bauen will.

### 6. Changelog

Trage in `docs/changelog.md` ein:
- `useGenerate` auf `invoke('llm_complete')` umgestellt
- Provider-Mapping auf 6 Anbieter erweitert
- Erster erfolgreicher End-to-End-Generierungslauf (Anbieter, Modell, Datum)

## Regeln

1. **Keine API-Keys im Frontend-Code.** Die Keys leben ausschließlich in Rust/Keyring.
2. **Prompt-Bau und Validierung bleiben in TS.** Keine Logik nach Rust verschieben, die im Browser laufen kann.
3. **Alte `llm`-Package-Tests nicht zerstören.** Die `provider-*.ts` bleiben für Node-Tests erhalten.
4. **Changelog pflegen.**

## Erste Schritte

1. Lies `apps/web/src/hooks/useGenerate.ts` und `packages/llm/src/index.ts`
2. Prüfe, ob `@tauri-apps/api/core` mit `invoke` in `apps/web/package.json` als Dependency vorhanden ist
3. Baue den neuen `useGenerate` Hook
4. Teste mit `pnpm run tauri dev`

---

> **Status:** Ich werde diesen Plan jetzt ausführen.
