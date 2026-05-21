# 05 – Cap-Table-Engine

Deterministische, getestete Logik. Baut die Cap Table aus Events auf und berechnet abgeleitete Größen.

## Aufbau & Update („Initial aufgesetzt + add Round + Pot ⇒ Update")

Die Cap Table ist **event-sourced**: Ausgangszustand + chronologische Events (Issuances, Runden,
Pool-Top-ups, Transfers, Conversions, Exercises) ergeben den Stand zu jedem Stichtag.

- **Initial aufsetzen**: Gründungs-Shares + ggf. erste Runde/Pool.
- **Add Round**: neue Runde anlegen → Pre/Post-Money, Preis pro Share, neue Shares, Lead, Pool-Top-up.
  Engine berechnet Verwässerung aller Bestehenden automatisch.
- **Add Pool**: Option Pool einrichten/aufstocken (pre- oder post-money – wichtig, siehe unten).
- **Update**: jedes neue Event aktualisiert alle abgeleiteten Werte; alte Stände bleiben abrufbar.

## Berechnete Größen

- **Shares pro Stakeholder/Klasse** (issued, outstanding).
- **Ownership %**: as-issued, **fully diluted** (inkl. Optionen, Warrants, as-converted SAFEs/Notes).
- **Price per Share** je Runde = Investment / neue Shares (bzw. aus Pre-Money / Pre-Money-Shares).
- **Pre/Post-Money-Konsistenz**: Post = Pre + Raised; Preis = Pre / (FD-Shares vor Runde).
- **Verwässerung** je Stakeholder über Runden (Dilution-Tracking).

## Runden-Mechanik (Priced Round)

1. Pre-Money-Bewertung + Investitionsbetrag gegeben → Post-Money = Pre + Betrag.
2. **Option-Pool-Shuffle**: Pool-Top-up üblicherweise **pre-money** → verwässert Altgesellschafter, nicht den neuen Investor.
   Engine macht das explizit sichtbar (häufiges Red-Flag-Thema, siehe Analyse).
3. Price per Share = Pre-Money / (Fully-diluted Shares vor Runde inkl. neuer Pool).
4. Neue Preferred Shares = Investment / Price per Share.
5. Alle Ownership-% neu berechnen.

## SAFEs & Wandeldarlehen (Convertibles)

- Vor Conversion: als separates Instrument geführt (kein fixer %).
- **Conversion bei nächster Preisrunde**: anhand Valuation Cap und/oder Discount, je nach „pre-money vs.
  post-money SAFE" und MFN-Klauseln. Engine bildet Standard-Varianten ab (Y-Combinator post-money SAFE,
  klassisches Wandeldarlehen mit Cap+Discount+Zins).
- Conversion-Logik beeinflusst Pre-/Post-Money-Verwässerung – explizit ausweisen.

## Anti-Dilution bei Down Rounds

Bei einer Runde unter vorherigem Preis greift der Verwässerungsschutz der jeweiligen Klasse:
- **Full Ratchet**: Conversion-Preis = neuer (niedrigerer) Preis → maximaler Schutz für Investor.
- **Broad-/Narrow-Based Weighted Average**: gewichtete Anpassung (gängiger, milder).
- Engine passt `conversionRatio` der betroffenen Klasse an und rechnet Effekt durch.

## Zeitreise / Snapshots

- Cap Table zu beliebigem Stichtag oder „nach Runde X" anzeigen.
- Diff zwischen zwei Ständen (was hat sich durch Runde Y verändert).

## Exporte

- Standard-Cap-Table-View (Stakeholder × Klasse × Shares × % × FD-%).
- Export nach Excel/CSV (mit optionaler Provenance-Spalte).
- „As-converted"-View (alles in Common umgerechnet).

## Validierungen

- Ownership-Summe = 100 % (FD).
- Post-Money = Pre-Money + Raised (Toleranz = Rundung).
- Pool allocated ≤ totalSize; outstanding ≤ authorized (falls authorized bekannt).
- Warnung bei impliziten Negativwerten oder unplausiblen Preisen.
