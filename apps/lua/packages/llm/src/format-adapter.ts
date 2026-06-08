/**
 * Format-Adapter — DEPRECATED / ENTFERNT
 * 
 * Dieses Modul wurde entfernt, weil es mehr Schaden anrichtete als es nuetzte.
 * Alle Provider bekommen denselben Prompt und liefern dasselbe Format.
 * 
 * Historischer Kontext:
 * Der urspruengliche Adapter versuchte, anbieterspezifische Formate zu erkennen
 * und in DocumentV1 umzuwandeln. Jede convert-Funktion erzeugte aber hardcoded
 * einen MultipleChoice-Block und verwandelte damit alle anderen Blocktypen in MC.
 * 
 * Die Pipeline ist jetzt sauber:
 *   extractJson → normalize → Zod-Validierung → ggf. Reparatur
 */

export {};
