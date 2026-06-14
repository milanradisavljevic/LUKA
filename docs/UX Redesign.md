╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 Design-Redesign „Tinte & Papier" — lehrerzentriert statt AI-Builder

 Context

 Milan (UX-Brief): App wirkt „vibecoded/generisch". Ziel: visuelle Identität mit Vertrauen
 (Zielgruppe Lehrkräfte 40–65), didaktische Hierarchie, Lehrer-UX-Patterns. Entscheide:
 Palette „Tinte & Papier" (Tintenblau #2C4A6E auf warmem Papier #F5F4EF) +
 Dashboard wird Start-Ansicht (zwei Türen).

 Befund am Code: Token-System in index.css solide, aber Indigo+Grau = Startup-Look.
 Kein :focus-visible auf Buttons (A11y-Loch). Vieles aus dem Brief existiert schon
 (Stepper mit Namen, Stage-Texte, TemplateManager, Ctrl+K-Palette, DashboardView) →
 schärfen, nicht neu bauen. Brief-Korrektur: „Schnell-Modus → direkt Ergebnis" wird
 NICHT gebaut (bewusst entfernte Sofort-Generierung, Doppel-Call-Fallacy); der
 Schnell-Pfad IST die „Übung ohne Quelltext"-Tür → Baukasten → 1 Call. Keine Emojis
 (Tauri-EXE), lucide-Icons.

 ---
 1. Design-Prinzipien (5 Leitsätze)

 1. Papier zuerst. Das Produkt ist ein Arbeitsblatt — die UI sieht aus wie hochwertiges
 Unterrichtsmaterial: warmer Grund, klare Flächen, Tinte als Akzent.
 2. Die Lehrkraft sieht immer, WAS für WEN entsteht. Kontext (Fach · Stufe · Klasse ·
 Modus) ist permanent sichtbar, nicht in Schritt-1-Feldern vergraben.
 3. Zwei Türen, ein Haus. „Aus Quelltext" (Wizard) und „Ohne Quelltext" (Kompetenz)
 sind gleichwertige, benannte Einstiege — keine versteckten Modi.
 4. Kein toter Spinner. Jeder Wartezustand sagt, was gerade passiert und was am Ende
 herauskommt (Schülerfassung + Lösung + Raster).
 5. Tastatur ist Erstklassbürger. Sichtbarer Fokus überall; alles ohne Maus erreichbar.

 2. Token- & Typografie-Schema

 index.css — Variablen ERSETZEN/ERGÄNZEN (Light)

 :root {
   /* Tinte & Papier */
   --color-bg-base: #F5F4EF;            /* warmes Papier statt #F0F0F0 */
   --color-bg-hover: #EFEDE6;
   --color-bg-selected: rgba(44,74,110,0.10);
   --color-border: #C9C6BC;             /* warmes Grau statt #BFBFBF */
   --color-border-focus: #2C4A6E;
   --color-accent: #2C4A6E;             /* Tintenblau statt #5b5bd6 */
   --color-accent-hover: #1F3A5A;
   --color-text-primary: #1A1A1A;
   --color-text-secondary: #5A5A52;
   --color-text-muted: #8C8A80;
   /* NEU: Info/didaktischer Hinweis (4. semantischer Ton) */
   --color-info: #2C6E5A;
   --color-info-bg: rgba(44,110,90,0.08);
   /* Sidebar */
   --sidebar-bg: #EFEDE6;
   --sidebar-text: #5A5A52;
   --sidebar-text-active: #1F3A5A;
   --sidebar-accent: #2C4A6E;
   --color-highlight: #6E2C4A;          /* Bordeaux statt Lila */
   --color-highlight-bg: rgba(110,44,74,0.08);
 }
 :root[data-theme="dark"] {
   --color-bg-base: #14181F;            /* Schiefer */
   --color-bg-surface: #1C232E;
   --color-bg-elevated: #242C3A;
   --color-bg-input: #1A2029;
   --color-bg-hover: #2A3342;
   --color-bg-selected: rgba(127,163,204,0.18);
   --color-border: #3A4456;
   --color-border-focus: #7FA3CC;
   --color-accent: #7FA3CC;
   --color-accent-hover: #9DBBDD;
   --color-info: #7FCCB2;
   --color-info-bg: rgba(127,204,178,0.12);
   --sidebar-bg: #1C232E;
   --sidebar-accent: #7FA3CC;
 }
 Focus-Ring-Farben in input:focus von hartem rgba(91,91,214,…) auf
 color-mix(in srgb, var(--color-accent) 18%, transparent) umstellen.

 NEU: globale Klassen (in index.css)

 /* A11y: sichtbarer Tastatur-Fokus überall (größtes Loch heute) */
 :focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: 2px; }
 button:focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: 2px; }

 /* Badges (Kontext, Zeit, Info) */
 .badge { display: inline-flex; align-items: center; gap: 0.3rem; padding: 2px 10px;
   border-radius: 999px; font-size: 0.75rem; font-weight: 500; }
 .badge-info    { background: var(--color-info-bg);    color: var(--color-info); }
 .badge-context { background: var(--color-bg-selected); color: var(--color-accent); }

 /* Karten (Dashboard-Türen, Vorlagen) */
 .card { background: var(--color-bg-surface); border: 1px solid var(--color-border);
   border-radius: var(--radius); box-shadow: var(--shadow); }
 .card-clickable { cursor: pointer; transition: border-color .15s, box-shadow .15s; }
 .card-clickable:hover { border-color: var(--color-accent); box-shadow: 0 2px 8px var(--color-shadow); }

 /* Notenzeilen-Motiv (dezent, nur Header/Leerflächen) */
 .notenzeilen { background-image: repeating-linear-gradient(transparent, transparent 7px,
   color-mix(in srgb, var(--color-border) 35%, transparent) 7px,
   color-mix(in srgb, var(--color-border) 35%, transparent) 8px); }

 Ubuntu-Gewichte (Hierarchie — alle 4 Gewichte sind schon eingebunden)

 ┌────────────────────────────────┬──────────────────────────┬────────────────────────────────────────────────────┐
 │             Ebene              │         Gewicht          │                     Verwendung                     │
 ├────────────────────────────────┼──────────────────────────┼────────────────────────────────────────────────────┤
 │ Display (Dashboard-Begrüßung)  │ 300 Light, 1.5rem        │ einzige Light-Stelle — Ruhe                        │
 ├────────────────────────────────┼──────────────────────────┼────────────────────────────────────────────────────┤
 │ H1/H2                          │ 700 Bold                 │ wie heute                                          │
 │ (Seiten-/Abschnittstitel)      │                          │                                                    │
 ├────────────────────────────────┼──────────────────────────┼────────────────────────────────────────────────────┤
 │ UI-Labels, Buttons, Badges     │ 500 Medium (statt        │ Buttons font-weight: 500 in index.css — weniger    │
 │                                │ 600/700)                 │ „laut"                                             │
 ├────────────────────────────────┼──────────────────────────┼────────────────────────────────────────────────────┤
 │ Fließtext/Inputs               │ 400 Regular              │ wie heute                                          │
 └────────────────────────────────┴──────────────────────────┴────────────────────────────────────────────────────┘

 3. Wireframes (textuell)

 Dashboard = Startansicht

 ┌ Sidebar ┐ ┌──────────────────────────────────────────────┐
 │         │ │ Guten Morgen.            [Klasse-Badge 7A]   │  ← Ubuntu Light 300
 │         │ │ Was möchtest du erstellen?                   │
 │         │ │ ┌──────────────────┐ ┌──────────────────┐    │
 │         │ │ │ AUS QUELLTEXT    │ │ OHNE QUELLTEXT   │    │  ← 2 .card-clickable
 │         │ │ │ Schularbeit/Test │ │ Grammatik/Übung  │    │    (FileText / Target)
 │         │ │ │ zu einem Text    │ │ aus Kompetenz    │    │
 │         │ │ │ ~5 Min Einricht. │ │ ~2 Min Einricht. │    │  ← badge-info + Timer
 │         │ │ └──────────────────┘ └──────────────────┘    │
 │         │ │ Weiterarbeiten: [letztes Dok · Karte]        │
 │         │ │ Vorlagen: [Karte][Karte][Karte] → alle       │
 │         │ │ Handlungsbedarf (aus Korrektur): [Liste]     │  ← existiert in DashboardView
 │         │ └──────────────────────────────────────────────┘
 DashboardView existiert — erweitern um Türen-Hero + letzte Dokumente, nicht neu bauen.

 Wizard „Absicht" (Step0)

 Oben Kontextzeile (immer): [Fach ▾] [Stufe ▾] [Klasse ▾] als Badges-Reihe.
 Unterlagentyp-Kacheln bekommen Zeit-Badge (Timer-Icon, „~15–20 Min Bearbeitungszeit")
 aus neuen minuten-Daten. Kontinuitäts-Kacheln (Weitermachen/Vorlagen/Kompetenz) bleiben.

 Baukasten (Step2)

 Bleibt Kachel + Config-Panel. NEU oben rechts: Summen-Badge
 Σ ~42 Min · 24 Punkte (Minuten aus Blocktyp-Schätzung × Anzahl, Punkte-Summe existiert).
 Bei punkteAusblenden: Punkte-Anteil des Badges weglassen.

 4. Konkrete Code-Änderungen

 index.css (Claude) — Kern

 Alle Token oben + :focus-visible + .badge/.card/.notenzeilen + button { font-weight: 500 }
 - Buttons transition: background .15s statt nur opacity (Hover = --color-accent-hover
 für .btn-primary statt opacity-Trick).

 App.tsx (Claude)

 - Start: useState<ActiveView>('dashboard') statt 'wizard'.
 - Header: Produktname „LUKA" (statt „Lehrunterlagen-Applikation"), Unterzeile bleibt.
 Rechts NEU Kontext-Badge (immer, nicht nur Wizard): BookOpen +
 {fachLabel} · {stufeLabel}{klasse ?  · ${klasse} : ''}{modus==='kompetenz' ? ' · Kompetenz' : ''}
 als .badge-context. Header bekommt className="notenzeilen" (dezentes Motiv).
 - Wizard-Subtitle: unter dem Stepper eine Zeile
 Schritt {n}/5 — {STEP_DESCRIPTIONS[state.step]}.

 lib/types.ts (Claude)

 STEP_DESCRIPTIONS: Record<StepId,string> — z. B. absicht: „Was soll entstehen — und
 für wen?", input: „Textquelle hochladen oder einfügen", baukasten: „Aufgaben
 zusammenstellen und dosieren", llm: „KI-Modell und Kreativität wählen",
 generate: „Erstellen, prüfen, exportieren".

 lib/constants.ts (Kimi)

 BLOCK_TYPE_DEFS um minuten: [min, max] erweitern (Schätzwerte je Typ, z. B.
 lueckentext [5,8], offeneSchreibaufgabe [20,30], umformung [8,12] …).
 NEU UNTERLAGENTYP_MINUTEN für Step0-Kacheln (schuluebung ~15–25, schularbeit ~50 …).

 Step0_Absicht.tsx (Kimi)

 Zeit-Badge auf Unterlagentyp-Kacheln: <span className="badge badge-info"><Timer size={12}/> ~15–20 Min</span>.

 Step2_Baukasten.tsx (Kimi)

 Summen-Badge oben: Minuten-Spanne (Σ über BLOCK_TYPE_DEFS[typ].minuten) + Punkte.

 Step4_Generate.tsx (Kimi)

 - Export-Transparenz-Box (vor dem Generieren-Button, .card + badge-info):
 „Beim Export entstehen: Schülerfassung (DOCX) · Lösung (DOCX) · Korrekturraster
 [· Kompetenznachweis nur Kompetenz-Modus] · optional PDF".
 - Stage-Texte präzisieren: sende → „KI formuliert Aufgaben …", validiere → „Struktur
 und Lösungen werden geprüft …", korrigiere → „KI bessert Beanstandungen nach …".

 DashboardView.tsx (Kimi)

 Hero „Was möchtest du erstellen?" (Ubuntu 300) + 2 Tür-Karten (navigiert
 onNavigate('wizard') bzw. ('kompetenz')) + „Weiterarbeiten"-Karte (letztes
 SavedDocument via loadDocuments(), jüngstes updatedAt) + bestehender
 Handlungsbedarf-Teil bleibt darunter.

 Sidebar.tsx (Kimi, klein)

 title-Tooltips für jeden Eintrag (1 Satz pro View); aktiver Eintrag bekommt 3px
 Akzent-Linkskante (statt nur Farbwechsel).

 A11y-Pass (Kimi, nach Tokens)

 Tab-Reihenfolge im Wizard durchtesten; Baukasten-Kacheln role="button"+aria-pressed;
 Drag&Drop-Alternative prüfen (Hoch/Runter-Buttons existieren?); Kontraste der neuen
 Token gegen WCAG AA (Tintenblau #2C4A6E auf Weiß = 8.0:1 ✓, #7FA3CC auf #1C232E = 5.6:1 ✓).

 5. Priorisierte To-Dos (Gewinn ÷ Aufwand)

 ┌─────┬──────────────────────────────────────────────────────────────┬───────────────────────┬──────────────────┐
 │  #  │                             Was                              │        Dateien        │     Aufwand      │
 ├─────┼──────────────────────────────────────────────────────────────┼───────────────────────┼──────────────────┤
 │ 1   │ Token-Umstellung Tinte&Papier + focus-visible +              │ index.css             │ S — wirkt        │
 │     │ Badge/Card-Klassen                                           │                       │ app-weit         │
 ├─────┼──────────────────────────────────────────────────────────────┼───────────────────────┼──────────────────┤
 │ 2   │ Header: LUKA + Kontext-Badge + Notenzeilen                   │ App.tsx               │ S                │
 ├─────┼──────────────────────────────────────────────────────────────┼───────────────────────┼──────────────────┤
 │ 3   │ Stepper-Subtitle (Schrittbeschreibung)                       │ types.ts, App.tsx     │ S                │
 ├─────┼──────────────────────────────────────────────────────────────┼───────────────────────┼──────────────────┤
 │ 4   │ Dashboard-Start + zwei Türen                                 │ App.tsx,              │ M                │
 │     │                                                              │ DashboardView         │                  │
 ├─────┼──────────────────────────────────────────────────────────────┼───────────────────────┼──────────────────┤
 │ 5   │ Zeit-Indikator (Kacheln + Baukasten-Summe)                   │ constants, Step0,     │ M                │
 │     │                                                              │ Step2                 │                  │
 ├─────┼──────────────────────────────────────────────────────────────┼───────────────────────┼──────────────────┤
 │ 6   │ Export-Transparenz + Stage-Texte                             │ Step4                 │ S                │
 ├─────┼──────────────────────────────────────────────────────────────┼───────────────────────┼──────────────────┤
 │ 7   │ Sidebar-Tooltips + Aktiv-Kante                               │ Sidebar               │ S                │
 ├─────┼──────────────────────────────────────────────────────────────┼───────────────────────┼──────────────────┤
 │ 8   │ A11y-Pass (Tastatur, ARIA, Kontrast-Check)                   │ quer                  │ M                │
 └─────┴──────────────────────────────────────────────────────────────┴───────────────────────┴──────────────────┘

 Rollen & Reihenfolge

 Claude: #1–3 (Design-System-Kern: Tokens, Header, Stepper — definiert die Sprache).
 Kimi: #4–8 auf Claudes Token-Commit (Pickup-Prompt nach Commit).

 Verifikation

 1. pnpm -r build + pnpm -r test grün (52 Web-Tests dürfen nicht brechen).
 2. pnpm tauri:dev Light+Dark: Papier/Schiefer-Grund, Tinten-Akzent überall (kein
 Indigo-Rest: grep -rn "5b5bd6\|7c7ce0" src/ = nur noch index.css-Historie/0 Treffer).
 3. Tastatur-Test: Tab durch Wizard → sichtbarer Fokus-Ring auf jedem Button.
 4. Start = Dashboard mit zwei Türen; beide navigieren korrekt; „Weiterarbeiten" lädt
 letztes Dokument.
 5. Kontext-Badge zeigt live Fach/Stufe/Klasse/Modus nach Änderung in Step0/Kompetenz.

 Risiken

 - Inline-Styles referenzieren Tokens → Palette-Wechsel ist sicher; einzelne hartkodierte
 rgba(91,91,214,…) suchen & ersetzen (grep -rn "91,91,214\|5b5bd6").
 - --color-highlight (Lila→Bordeaux) färbt Kreuzwort/Markier-Stellen — Sichtprüfung.
 - Dark-Theme-Kontraste nach Umstellung nochmal messen (WCAG AA, Punkt 8).