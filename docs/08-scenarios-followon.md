# 08 – Szenarien & Follow-on-Entscheidungen

Das erklärte **Ziel**: „Interaktiver Waterfall auf Basis von Follow-on-Entscheidungen" + Valuation-Unterstützung.

## Szenario-Konzept

Ein **Scenario** nimmt den aktuellen Cap-Table-Stand einer Company als Basis und legt What-if-Annahmen darüber:
- künftige Runden (Größe, Pre-Money, Pool-Top-up, neue Terms),
- unsere **Follow-on-Entscheidung** (mitgehen / pro-rata / super-pro-rata / aussetzen),
- Exit (Wert, Typ, Zeitpunkt).

Mehrere Szenarien parallel vergleichbar (Base / Up / Down / Aggressiv).

## Follow-on-Entscheidung modellieren

Für die nächste (hypothetische) Runde:
- **Pro-rata-Betrag**: was kostet es, unseren FD-Anteil zu halten?
- **Verwässerungsschutz**: ohne Mitgehen → wie stark verwässern wir?
- **Ownership-Ziele**: Betrag, um X % zu halten / auf Y % zu kommen.
- **Pay-to-play-Effekte**: falls Klausel vorhanden, Konsequenz des Nicht-Mitgehens.
- **Marginaler Return**: zusätzlicher Einsatz vs. zusätzlicher Exit-Erlös (inkrementelle MOIC).

Ausgabe: „Mitgehen kostet 2,5 Mio. €, hält uns bei 14 % FD; bei Exit zu 300 Mio. bringt das inkrementell
1,8× auf den Follow-on-Einsatz" – mit Return-Kurve über Exit-Werte.

## Interaktiver Waterfall

- Regler/Inputs: Exit-Wert, Annahmen je künftiger Runde, eigene Follow-on-Wahl.
- Waterfall + Return-Kurve aktualisieren sich live.
- Knickpunkte (Conversion, Caps, Preference-Overhang) bleiben sichtbar.
- Vergleichsmodus: zwei Follow-on-Strategien nebeneinander (mitgehen vs. nicht).

## Valuation-Unterstützung

- Rückwärts: „welcher Exit-Wert nötig für Ziel-MOIC X?"
- Entry: „bei diesem Pre-Money & diesen Terms – welche Ownership & welcher erwartete Return?"
- Sensitivitäts-Tabelle: Exit-Wert × Verwässerungsannahme → MOIC.

## Persistenz & Nachvollziehbarkeit

- Szenarien werden gespeichert (Annahmen + Ergebnis-Snapshot), versioniert, vergleichbar.
- Annahmen sind als solche markiert (kein echtes Dokument) – klar getrennt von extrahierten Fakten.
- Drill-down auch hier: jede Szenario-Zahl zeigt, welche Annahme + welche Basis-Daten sie treibt.
