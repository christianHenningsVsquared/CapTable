# 01 – Vision, Ziele & Scope

## Vision

Ein lokales Desktop-Tool, das aus unstrukturierten Deal-Unterlagen (Legals, Excel, PDF) automatisch eine
korrekte, **vollständig nachvollziehbare** Cap Table erzeugt und dem VC-Team hilft, schneller und fundierter
über **Entry, Follow-on und Exit** zu entscheiden – über das gesamte Portfolio hinweg, inkl. Competitor-Benchmarking.

## Primäre Ziele

1. **Zeit sparen bei Due Diligence**: Ordner/Datenraum rein → fertige Cap Table raus, statt manueller Excel-Arbeit.
2. **Vertrauen in Zahlen**: Jeder Datenpunkt zeigt seine Quelle und ein Confidence Level (Hover + Drill-down).
3. **Bessere Entscheidungen**: Interaktiver Waterfall + Return-Kurve, der auf Follow-on- und Exit-Szenarien reagiert.
4. **Risiken früh sehen**: Red Flags in Terms & Struktur automatisch markieren.
5. **Lernen aus dem Portfolio**: Patterns for Success erkennen, Cap Tables von Competitors als Benchmark.

## Nutzer & Use Cases

- **Investment-Team / Partner** – Entry-Bewertung, Term-Sheet-Verhandlung, Follow-on-Allokation.
- **Associates / Analysts** – DD, Cap-Table-Aufbau, Szenario-Rechnungen.
- **Portfolio-Management** – laufende Pflege der Cap Tables über Runden hinweg, Return-Tracking.

Beispiel-Use-Cases:
- „Wir prüfen Series B von Firma X – baue mir aus dem Datenraum die aktuelle Cap Table inkl. aller Liq-Prefs."
- „Wenn wir bei der nächsten Runde pro-rata mitgehen, was kostet das und wie ändert sich unser Return bei Exit zu 300 Mio.?"
- „Zeig mir alle Beteiligungen mit 2x participating preferred ohne Cap."
- „Wie sah die Cap-Table-Struktur unserer erfolgreichsten Exits zum Series-A-Zeitpunkt aus?"

## In Scope

- Ingestion aus: lokaler Ordner, manueller Upload, Google Drive, Datenraum-Export (+ eine weitere Quelle, siehe offene Fragen).
- Datentypen: Excel-Cap-Tables, PDF (inkl. gescannt), Legals (SHA, Satzung, Term Sheets, Wandeldarlehen/SAFE, Side Letter).
- Cap-Table-Engine inkl. Runden, Option Pool, Verwässerung, mehreren Share-Klassen.
- Liquidations-Waterfall mit Liq-Prefs, Participation, Seniorität, Caps, Anti-Dilution, Conversion-Optimierung.
- Analyse: Red Flags, Investor-Ranking, Return-Kurve, Patterns for Success, Competitor-Benchmarking.
- Szenarien: Exit-Valuation, Follow-on-Entscheidungen, interaktive What-ifs.
- Multi-Company / Portfolio-Datenmodell.
- Provenance & Confidence über alle Daten.

## Out of Scope (vorerst)

- Verbindliches Cap-Table-Management of record / Aktienregister-Funktion (rechtsverbindliche Führung).
- Tatsächliche Transaktionsabwicklung, e-Signing, Notar-Workflows.
- Steuerberechnung / länderspezifische steuerliche Behandlung.
- Mehrbenutzer-Cloud-Kollaboration in Echtzeit (lokale Desktop-App; Sync später, siehe offene Fragen).
- Investor-/LP-Reporting-Portal.

## Erfolgskriterien (MVP)

- Eine reale Cap Table aus einem echten Datenraum in < 30 Min. statt Stunden aufgebaut.
- Waterfall-Ergebnis stimmt mit einer manuell gerechneten Referenz auf den Cent überein.
- Jeder Wert ist per Klick bis zur Quellseite im Originaldokument rückverfolgbar.

## Glossar

- **Cap Table** – Übersicht aller Anteilseigner, Anteilsklassen, Anzahl Shares und Ownership-%.
- **Share-/Anteilsklasse** – z. B. Common, Preferred Series A/B; mit eigenen Rechten (Liq-Pref, Participation …).
- **Liquidation Preference (Liq-Pref)** – bevorzugte Auszahlung im Exit, z. B. 1x/2x des Investments.
- **Participating Preferred** – erhält Liq-Pref **und** anteilig am Rest (ggf. mit Cap).
- **Seniorität / Stacking** – Rangfolge der Prefs (senior vs. pari passu).
- **Anti-Dilution** – Verwässerungsschutz (Full Ratchet / Broad- bzw. Narrow-Based Weighted Average).
- **Option Pool / ESOP** – für Mitarbeiter reservierte Anteile.
- **Pro-rata** – Recht, in Folgerunden den eigenen Anteil zu halten.
- **Waterfall** – Verteilungsreihenfolge der Exit-Erlöse.
- **Conversion** – Preferred wandelt in Common, wenn das mehr Erlös bringt (as-converted).
- **MOIC** – Multiple on Invested Capital (Return-Multiple).
- **Confidence Level** – Vertrauenswert eines extrahierten Datenpunkts (siehe Ingestion-Doc).
- **Provenance** – Herkunftsnachweis: Dokument + Seite + Stelle, aus der ein Wert stammt.
