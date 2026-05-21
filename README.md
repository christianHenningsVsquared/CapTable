# CapTable Tool

Lokales Desktop-Tool für VC-Cap-Table-Analyse: liest Cap-Table-Daten aus Legals, Excel und PDFs aus,
baut daraus eine nachvollziehbare Cap Table, modelliert Share-Klassen & Liquidations-Waterfalls und
unterstützt Exit-, Valuation- und Follow-on-Entscheidungen über das gesamte Fonds-Portfolio.

> Status: **MVP build in progress.** The current, narrowed scope and the
> 3-stream work split live in **[docs/MVP.md](docs/MVP.md)** — start there.
> The phase docs below (`01-…` through `11-…`) describe the broader v2
> vision and are not the current build target.

## Kernidee (3 Schritte)

1. **Auslesen** – Quelldokumente (Legals, Excel, PDF) aus Ordner / Upload / Google Drive / Datenraum
   einlesen und strukturieren.
2. **Cap Table aufbauen** – Initiale Cap Table erzeugen, Runden + Option Pool ergänzen, automatisch updaten.
   Jede Zahl ist auf ihre **Quelle** rückverfolgbar (Hover + Drill-down) und hat ein **Confidence Level**.
3. **Analysieren & Entscheiden** – Investoren ranken, Red Flags erkennen, Waterfall & Valuation rechnen,
   Return-Kurven zeigen und **Follow-on-Entscheidungen** interaktiv durchspielen.

## Doku-Index

### Current MVP build (read these first)

| Datei | Inhalt |
|---|---|
| [docs/MVP.md](docs/MVP.md) | **What we're actually building.** Scope, pipeline, streams, DoD. |
| [docs/stream-a-ingestion.md](docs/stream-a-ingestion.md) | Stream A spec — LLM extraction + SQLite. |
| [docs/stream-b-engine.md](docs/stream-b-engine.md) | Stream B spec — Cap Table + Waterfall engine. |
| [docs/stream-c-ui.md](docs/stream-c-ui.md) | Stream C spec — Electron + React single screen. |
| [src/shared/types.ts](src/shared/types.ts) | Shared types — the contract between all three streams. |

### v2 background (broader vision, not the current target)

| Datei | Inhalt |
|---|---|
| [docs/01-vision-scope.md](docs/01-vision-scope.md) | Vision, Ziele, Nutzer, Scope, Glossar |
| [docs/02-architecture.md](docs/02-architecture.md) | Tech-Stack (lokale Desktop-App), Datenfluss, Privacy/Security |
| [docs/03-data-model.md](docs/03-data-model.md) | Entitäten & Datenmodell |
| [docs/04-ingestion-extraction.md](docs/04-ingestion-extraction.md) | Auslesen aus allen Quellen, LLM-Extraktion, Confidence & Provenance |
| [docs/05-captable-engine.md](docs/05-captable-engine.md) | Cap-Table-Engine: Runden, Pool, Verwässerung, Updates |
| [docs/06-waterfall-valuation.md](docs/06-waterfall-valuation.md) | Liquidations-Waterfall, Share Price, Valuation |
| [docs/07-analysis-insights.md](docs/07-analysis-insights.md) | Red Flags, Investor-Ranking, Patterns, Return-Kurve, Benchmarking |
| [docs/08-scenarios-followon.md](docs/08-scenarios-followon.md) | Szenarien & Follow-on-Entscheidungen |
| [docs/09-ui-ux.md](docs/09-ui-ux.md) | UI/UX, interaktiver Waterfall, Drill-down |
| [docs/10-roadmap-todos.md](docs/10-roadmap-todos.md) | Roadmap, Phasen, TODO-Liste |
| [docs/11-open-questions.md](docs/11-open-questions.md) | Annahmen & offene Fragen |
| [PROMPT.md](PROMPT.md) | Konsolidierter Build-Prompt für den Start der Umsetzung |

## Nächster Schritt

Read [docs/MVP.md](docs/MVP.md), agree on `src/shared/types.ts` and the
golden fixture, then each colleague picks up one stream brief and starts
building.
