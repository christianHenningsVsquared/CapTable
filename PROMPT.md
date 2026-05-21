# Build-Prompt: CapTable Tool

> Konsolidierter Prompt, um die Umsetzung zu starten. Enthält Kontext, Ziel, Anforderungen, Stack,
> Reihenfolge und Leitplanken. Detail-Specs je Modul: siehe `docs/`.

## Kontext & Auftrag

Baue ein **lokales Desktop-Tool** für ein VC-Fonds-Team, das aus unstrukturierten Deal-Unterlagen
(Legals, Excel, PDF) automatisch eine **nachvollziehbare Cap Table** erzeugt und Entry-, Follow-on- und
Exit-Entscheidungen über das **gesamte Portfolio** unterstützt – inkl. Competitor-Benchmarking.

## Was es können muss (aus den Anforderungen)

1. **Auslesen**: Quelldokumente aus lokalem Ordner, Upload, Google Drive und Datenraum-Export einlesen,
   klassifizieren und in strukturierte Cap-Table-Daten überführen.
2. **Cap Table aufbauen & pflegen**: initial aufsetzen, Runden + Option Pool ergänzen, automatisch updaten;
   mehrere Share-Klassen.
3. **Provenance & Confidence**: jeder Wert zeigt Quelle (Hover) + ist bis ins Originaldokument drill-down-bar;
   pro Feld ein Confidence Level; Konflikte zwischen Quellen sichtbar.
4. **Waterfall & Valuation**: Liquidations-Waterfall (Liq-Prefs, Participation, Seniorität, Caps,
   Anti-Dilution, Conversion-Optimierung) → Shares × Share Price; Return-Kurve über Exit-Werte;
   Valuation-Unterstützung.
5. **Analyse**: Investor-Liste mit Ranking + Red Flags, Patterns for Success, Competitor-Benchmarking.
6. **Szenarien**: interaktiver Waterfall, der live auf **Follow-on-Entscheidungen** und Exit-Annahmen reagiert.

## Tech-Stack (Default; siehe `docs/02-architecture.md`)

- Desktop: **Electron** (Alt.: Tauri) · Frontend **React + TypeScript** · Charts **visx/D3**.
- Lokale DB: **SQLite** (`better-sqlite3`). Geld: **decimal.js** (kein Float).
- Parsing: **SheetJS** (Excel), **pdf.js** (PDF-Text), **Claude API** (Legals/gescannt, Vision+Text).
- Finanz-Engine: eigenständige, voll getestete **TypeScript**-Module – getrennt vom LLM.

## Leitplanken (nicht verhandelbar)

- **Engine ist deterministisch & getestet**; das LLM macht nur Extraktion, nie die Finanz-Mathematik.
- **Provenance überall**: kein nicht-berechneter Wert ohne Quelle/Confidence; nichts stillschweigend annehmen.
- **Local-first & Privacy**: Cap-Table-Daten bleiben lokal; LLM-Extraktion nur mit Zero-Retention bzw.
  umschaltbarem Local-only-Modus.
- **Erklärbarkeit**: jedes Ergebnis (Ownership, Waterfall-Zeile, Red Flag) ist aufschlüsselbar.
- **Korrektheit vor Features**: Invarianten (Ownership = 100 %, Waterfall-Summe = Erlös) sind getestet.

## Reihenfolge (siehe `docs/10-roadmap-todos.md`)

Phase 0 Fundament (Datenmodell + App-Hülle) → 1 Cap-Table-Engine → 2 Waterfall/Valuation →
3 Ingestion/Extraktion → 4 UI (Provenance + interaktiver Waterfall) → 5 Analyse/Szenarien → 6 Härtung.
Erster Walking Skeleton: manuelle Company → Engine → Waterfall, gegen manuelle Referenz validieren,
**dann** Ingestion automatisieren.

## Vor dem Start zu klären (siehe `docs/11-open-questions.md`)

Mindestens: B1 (welche „weitere" Datenquelle), B2 (Privacy-Modus / LLM-API erlaubt?), B3 (Electron vs.
Tauri), C1 (Jurisdiktion DE/US). Defaults greifen, wo nichts vorgegeben ist.

## Definition of Done (MVP)

- Echter Datenraum → Cap Table in < 30 Min., jeder Wert bis zur Quelle rückverfolgbar.
- Waterfall stimmt cent-genau mit manueller Referenz; Return-Kurve interaktiv.
- Red Flags + Investor-Ranking + ein Follow-on-Szenario nutzbar; Portfolio mit ≥ 2 Companies.
