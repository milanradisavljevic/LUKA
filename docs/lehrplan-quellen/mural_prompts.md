# Mural-Header-Bildprompts — LUKA AHS App

**Stil (für alle 12 Fächer identisch):**
- 16:9 Wide-Format
- Line art mit Aquarell-Waschung (klare Umrisse + dezente Farbfüllung)
- Pergament-Textur, entsättigte Sepiatöne
- Motive an LEFT + RIGHT edges, CENTER leer (Workspace)
- Ränder weichen weich ins Pergament, kein Rahmen
- Museum-Illustrations-Stil

**Empfohlene Nutzung:** Header-Background mit `opacity: 0.2` + `mix-blend-mode: multiply`, damit Workspace-Texte lesbar bleiben.

---

## 1. deutsch

```
16:9 composition, line art with watercolor wash on parchment texture. Motifs on LEFT edge: quill pen with inkwell, old Gutenberg printing press, open book with Gothic script. Motifs on RIGHT edge: theater masks (tragedy/comedy), Goethe silhouette profile, parchment scroll. CENTER intentionally empty (workspace). Clear outlines, desaturated sepia tones, museum illustration style, edges dissolve softly into parchment, no frame.
```

## 2. englisch

```
16:9 composition, line art with watercolor wash on parchment texture. Motifs on LEFT edge: Tudor rose emblem, Shakespeare's First Folio book, Big Ben clock tower silhouette. Motifs on RIGHT edge: Globe Theatre structure, vintage world map, Victorian teacup. CENTER intentionally empty (workspace). Clear outlines, desaturated sepia tones, museum illustration style, edges dissolve softly into parchment, no frame.
```

## 3. franzoesisch

```
16:9 composition, line art with watercolor wash on parchment texture. Motifs on LEFT edge: fleur-de-lis heraldic symbol, Marianne republican allegory profile, Eiffel Tower silhouette. Motifs on RIGHT edge: Lumières encyclopédie open volume, tricolor ribbon, Gothic cathedral facade. CENTER intentionally empty (workspace). Clear outlines, desaturated sepia tones, museum illustration style, edges dissolve softly into parchment, no frame.
```

## 4. spanisch

```
16:9 composition, line art with watercolor wash on parchment texture. Motifs on LEFT edge: flamenco acoustic guitar, Don Quijote with lance on horse Rosinante. Motifs on RIGHT edge: Alhambra Moorish arches, Spanish galleon ship, Castilian castle tower. CENTER intentionally empty (workspace). Clear outlines, desaturated sepia tones, museum illustration style, edges dissolve softly into parchment, no frame.
```

## 5. italienisch

```
16:9 composition, line art with watercolor wash on parchment texture. Motifs on LEFT edge: Dante Alighieri profile with laurel wreath, Roman Colosseum ruin. Motifs on RIGHT edge: Stradivarius violin, Venetian gondola on canal, Renaissance column capital. CENTER intentionally empty (workspace). Clear outlines, desaturated sepia tones, museum illustration style, edges dissolve softly into parchment, no frame.
```

## 6. latein

```
16:9 composition, line art with watercolor wash on parchment texture. Motifs on LEFT edge: wax tablet with stylus, SPQR banner with eagle. Motifs on RIGHT edge: laurel wreath, Roman Forum columns, Marcus Aurelius bust (stoic expression), Roman denarius coin. CENTER intentionally empty (workspace). Clear outlines, desaturated sepia tones, museum illustration style, edges dissolve softly into parchment, no frame.
```

## 7. geschichte

```
16:9 composition, line art with watercolor wash on parchment texture. Motifs on LEFT edge: hourglass, illuminated medieval chronicle, Jacobin cap (Phrygian). Motifs on RIGHT edge: Berlin Wall concrete segment, WWI Stahlhelm, ancient Greek amphora. CENTER intentionally empty (workspace). Clear outlines, desaturated sepia tones, museum illustration style, edges dissolve softly into parchment, no frame.
```

## 8. geographie

```
16:9 composition, line art with watercolor wash on parchment texture. Motifs on LEFT edge: ornamental compass rose, globe on wooden stand, brass sextant. Motifs on RIGHT edge: climate diagram chart, topographic contour lines, volcano silhouette with smoke. CENTER intentionally empty (workspace). Clear outlines, desaturated sepia tones, museum illustration style, edges dissolve softly into parchment, no frame.
```

## 9. religion

```
16:9 composition, line art with watercolor wash on parchment texture. Motifs on LEFT edge: Christian cross, Jewish menorah, open Bible. Motifs on RIGHT edge: Islamic crescent moon, Buddhist lotus flower, Orthodox cathedral with onion domes. CENTER intentionally empty (workspace). Clear outlines, desaturated sepia tones, museum illustration style, edges dissolve softly into parchment, no frame.
```

## 10. ethik

```
16:9 composition, line art with watercolor wash on parchment texture. Motifs on LEFT edge: scales of justice, handheld mirror (self-reflection), open philosophical book. Motifs on RIGHT edge: stone bridge (connection), olive branch (peace), two hands in handshake. CENTER intentionally empty (workspace). Clear outlines, desaturated sepia tones, museum illustration style, edges dissolve softly into parchment, no frame.
```

## 11. psychologie

```
16:9 composition, line art with watercolor wash on parchment texture. Motifs on LEFT edge: anatomical brain sketch, Rorschach inkblot, Freud's psychoanalytic couch. Motifs on RIGHT edge: Rubin's vase (gestalt figure-ground), neural network, Pavlov's dog. CENTER intentionally empty (workspace). Clear outlines, desaturated sepia tones, museum illustration style, edges dissolve softly into parchment, no frame.
```

## 12. philosophie

```
16:9 composition, line art with watercolor wash on parchment texture. Motifs on LEFT edge: Owl of Minerva, Plato's cave shadows. Motifs on RIGHT edge: Rodin's Thinker sculpture, astrolabe, Immanuel Kant silhouette profile. CENTER intentionally empty (workspace). Clear outlines, desaturated sepia tones, museum illustration style, edges dissolve softly into parchment, no frame.
```

---

## Nutzung

1. **ChatGPT Plus (DALL-E 3):** Prompt direkt einfügen → Bild generieren → Download PNG
2. **Midjourney:** Prompt mit `--ar 16:9 --style raw --v 6` ergänzen
3. **Stable Diffusion (SDXL):** Prompt + negative prompt `realistic, photograph, 3d render, cartoon, frame, border`

## CSS-Einbindung (Vorschlag)

```css
.mural-header {
  background-image: url('/assets/mural/deutsch.png');
  background-size: cover;
  background-position: center;
  opacity: 0.85;
}
.mural-header::after {
  content: '';
  position: absolute;
  inset: 0;
  background: white;
  mix-blend-mode: multiply;
  opacity: 0.2;
}
```
