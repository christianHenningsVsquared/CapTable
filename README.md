# CapTable Tool

Lokales Desktop-Tool für VC-Cap-Table-Analyse: liest Cap-Table-Daten aus Legals, Excel und PDFs aus,
baut daraus eine nachvollziehbare Cap Table, modelliert Share-Klassen & Liquidations-Waterfalls und
unterstützt Exit-, Valuation- und Follow-on-Entscheidungen über das gesamte Fonds-Portfolio.

> Status: **Spezifikations-/Konzeptphase**. Es wurde noch kein Code geschrieben. Diese Doku ist die
> Grundlage für den Build. Offene Punkte siehe [docs/11-open-questions.md](docs/11-open-questions.md).

## Kernidee (3 Schritte)

1. **Auslesen** – Quelldokumente (Legals, Excel, PDF) aus Ordner / Upload / Google Drive / Datenraum
   einlesen und strukturieren.
2. **Cap Table aufbauen** – Initiale Cap Table erzeugen, Runden + Option Pool ergänzen, automatisch updaten.
   Jede Zahl ist auf ihre **Quelle** rückverfolgbar (Hover + Drill-down) und hat ein **Confidence Level**.
3. **Analysieren & Entscheiden** – Investoren ranken, Red Flags erkennen, Waterfall & Valuation rechnen,
   Return-Kurven zeigen und **Follow-on-Entscheidungen** interaktiv durchspielen.

## Doku-Index

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

Offene Fragen in [docs/11-open-questions.md](docs/11-open-questions.md) durchgehen → danach Phase 0
(Datenmodell + leere App-Hülle) starten, siehe [docs/10-roadmap-todos.md](docs/10-roadmap-todos.md).
