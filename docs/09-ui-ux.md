# 09 – UI / UX

Leitidee: **vertrauenswürdig & erklärbar**. Jede Zahl ist anklickbar bis zur Quelle. Interaktion steht im
Zentrum (Regler → Waterfall/Return-Kurve aktualisieren live).

## Navigation (Top-Level)

- **Portfolio** – Liste aller Companies (Beteiligungen + Competitor-Benchmarks), Filter & Aggregat-Views.
- **Company** – eine Beteiligung im Detail, mit Tabs:
  1. **Übersicht** – Status, letzte Runde, unsere Position, Confidence-Indikator, offene Red Flags.
  2. **Cap Table** – Tabelle (Stakeholder × Klasse × Shares × % × FD-%), Stichtag/Runden-Auswahl, Export.
  3. **Waterfall** – interaktiver Waterfall + Return-Kurve, Exit-Regler.
  4. **Szenarien** – Follow-on/Exit-What-ifs, Vergleich.
  5. **Analyse** – Red Flags, Investor-Ranking, Patterns, Benchmarking.
  6. **Dokumente** – Quelldateien, Ingestion-Status, Review-Queue.
- **Ingestion** – Quelle wählen (Ordner/Upload/Drive/Datenraum), Fortschritt, Review-Workflow.
- **Einstellungen** – Datenquellen-Verbindungen, Privacy-Modus (Default/Local-only), Red-Flag-Schwellen, API-Key.

## Schlüssel-Interaktionen

### Provenance (Hover + Drill-down) – durchgängig
- **Hover** über einen Wert → Tooltip: Quelle (Dokument · Seite), Confidence (Ampel + %), Methode, Datum.
- **Klick** → Side-Panel mit Originaldokument an der Stelle (Highlight/Seite/Zelle) + Zitat.
- **Berechnete Werte** → Formel + Eingangswerte, jeweils weiter drill-down-bar.

### Confidence sichtbar machen
- Ampel-System (🟢🟡🔴) pro Feld; Cap-Table-Gesamt-Confidence oben.
- Filter „nur ungeprüfte / niedrige Confidence zeigen" für schnelles Review.
- Konflikt-Badge, wenn Quellen widersprechen (beide Werte + Quellen einsehbar).

### Interaktiver Waterfall
- Exit-Wert-Regler (oder Eingabe) → Balken/Stufen + Return-Kurve aktualisieren live.
- Hover auf Waterfall-Segment → wer, wie viel, welcher Pfad (Pref / participation / converted).
- Knickpunkte der Return-Kurve markiert (Conversion-/Cap-/Overhang-Punkte).
- Vergleichsmodus (zwei Szenarien überlagert).

## States & Feedback

- Ingestion-Fortschritt mit Pro-Dokument-Status (geparst / extrahiert / Konflikt / fehlt).
- Leere Zustände mit klarer nächster Aktion („Ordner verbinden, um zu starten").
- Klare Trennung **Fakt (extrahiert)** vs. **Annahme (Szenario)** vs. **manuell eingegeben**.

## Nicht-Ziele (UI)

- Kein überladenes Dashboard zum Start; lieber wenige, tiefe, vertrauenswürdige Views.
- Keine versteckte Magie: nichts wird stillschweigend angenommen ohne Markierung.

> Konkrete Layouts/Mockups folgen, sobald die offenen Fragen (insb. MVP-Reihenfolge, Privacy-Modus) geklärt sind.
