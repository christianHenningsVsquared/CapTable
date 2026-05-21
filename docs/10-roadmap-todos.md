# 10 – Roadmap & TODOs

Da der Wunsch „alles" ist, aber Bauen sequentiell läuft: Phasen so geschnitten, dass jede Phase für sich
nutzbar ist und die nächste trägt. Reihenfolge ist Vorschlag (Fundament zuerst) – anpassbar.

## Phasen

### Phase 0 – Fundament
- [ ] **T0.1** Stack-Entscheidung final (Electron vs. Tauri), Repo-Setup, Lint/Format/Test.
- [ ] **T0.2** Datenmodell + SQLite-Schema (siehe `03-data-model.md`), Migrations.
- [ ] **T0.3** App-Hülle: Portfolio → Company → leere Tabs, lokale Persistenz.
- [ ] **T0.4** Provenance-Grundgerüst (FieldProvenance überall verdrahtet).

### Phase 1 – Cap-Table-Engine (deterministisch, getestet)
- [ ] **T1.1** Event-Sourcing: Issuance/Runde/Pool/Transfer/Conversion.
- [ ] **T1.2** Berechnung Shares, Ownership (issued + fully diluted), Price/Share.
- [ ] **T1.3** Runden-Mechanik inkl. Pre-Money-Pool-Shuffle.
- [ ] **T1.4** SAFEs/Wandeldarlehen + Conversion; Anti-Dilution (FR + WA).
- [ ] **T1.5** Snapshots/Zeitreise + Excel/CSV-Export. Unit-Tests + Invarianten.

### Phase 2 – Waterfall & Valuation
- [ ] **T2.1** Waterfall-Engine: Liq-Prefs, Seniorität, participation (none/full/capped).
- [ ] **T2.2** Conversion-Optimierung (Fixpunkt), ESOP-Behandlung, Convertibles im Exit.
- [ ] **T2.3** Return-Kurve über Exit-Werte; Valuation-Rückrechnung. Golden-Case-Tests.

### Phase 3 – Ingestion & Extraktion
- [ ] **T3.1** Connectors: lokaler Ordner + Upload.
- [ ] **T3.2** Excel-Parser (Cap-Table-Erkennung) → Entities + Provenance.
- [ ] **T3.3** PDF-Text-Parser + Klassifizierung.
- [ ] **T3.4** LLM-Extraktion (Claude API) für Legals: Schema-Output + Confidence + Locator + Zitat.
- [ ] **T3.5** Reconciliation (Quellen-Priorität, Konflikte) + Review-Workflow-UI.
- [ ] **T3.6** Connectors: Google Drive (OAuth read-only) + Datenraum-Export-Import + „weitere Quelle".

### Phase 4 – UI: Provenance & interaktiver Waterfall
- [ ] **T4.1** Cap-Table-View mit Hover/Drill-down + Confidence-Ampel.
- [ ] **T4.2** Interaktiver Waterfall + Return-Kurve (Regler, live).
- [ ] **T4.3** Dokument-Side-Panel (Highlight an Quelle).

### Phase 5 – Analyse & Szenarien
- [ ] **T5.1** Red-Flag-Engine (konfigurierbarer Katalog) + Anzeige.
- [ ] **T5.2** Investor-Ranking.
- [ ] **T5.3** Szenarien + Follow-on-Modellierung + Vergleich.
- [ ] **T5.4** Competitor-Benchmarking.
- [ ] **T5.5** Patterns for Success (sobald Referenzdaten vorhanden).

### Phase 6 – Härtung
- [ ] **T6.1** Privacy-Modus (Default vs. Local-only), DB-Verschlüsselung optional, Audit-Log.
- [ ] **T6.2** Packaging/Installer (Win zuerst), Auto-Update, Backup/Restore.
- [ ] **T6.3** Test mit echtem Datenraum, Genauigkeits-Abgleich vs. manuelle Referenz.

## Konsolidierte TODO-Liste (aus dem Whiteboard)

| # | TODO | Phase |
|---|---|---|
| T1 | Datenmodell + Schema | 0 |
| T2 | Excel-Ingestion | 3 |
| T3 | PDF/Legals-Ingestion (LLM) | 3 |
| T4 | Confidence + Quellen-Drill-down | 3/4 |
| T5 | Cap-Table-Engine (Runden, Pool, Verwässerung) | 1 |
| T6 | Waterfall-Engine | 2 |
| T7 | Szenario/Follow-on interaktiv | 5 |
| T8 | Investor-Ranking + Red Flags | 5 |
| T9 | Return-Kurve + Patterns for Success | 2/5 |
| T10 | Competitor-Benchmarking | 5 |
| T11 | UI / interaktiver Waterfall | 4 |
| T12 | Datenquellen-Anbindung (Drive/Datenraum/weitere) | 3 |

## Empfohlener erster „Walking Skeleton"
Eine Company manuell anlegen → Cap-Table-Engine (Phase 1) → Waterfall (Phase 2) → mit echten Zahlen
validieren. Erst dann Ingestion automatisieren (Phase 3). So ist die Engine korrekt, bevor unsichere
Extraktionsdaten reinkommen.
