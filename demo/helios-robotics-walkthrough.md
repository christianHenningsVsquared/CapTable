# Demo-Testfall: Helios Robotics

Ein vollständig durchgerechneter End-to-End-Testfall. Eingabe ist [helios-robotics.txt](helios-robotics.txt);
unten stehen die **erwarteten Ergebnisse** jeder Pipeline-Stufe. Damit lässt sich die Logik Schritt für Schritt
verifizieren.

> Beträge sind als reine Zahlen behandelt (Währung egal). Hier in `$`, identisch zur Test-Fixture
> [tests/fixtures/golden.ts](../tests/fixtures/golden.ts), damit „getestet = demonstriert" gilt.

## So nutzt man den Testfall

1. **Ingestion**: `helios-robotics.txt` einlesen → `extractContract()` erzeugt die **Extraktion** (Schritt 1).
2. **Engine**: aus der Extraktion **Cap Table** bauen (Schritt 2) und **Waterfall** rechnen (Schritt 3).
3. **UI**: Cap Table anzeigen, Exit-Wert-Regler bewegen → Waterfall aktualisiert sich live.
   Die drei Szenarien unten (10 / 51 / 100 Mio.) sind die Referenzpunkte zum Gegenchecken.

Vollständiger Durchlauf headless mit der CLI:

```bash
npx captable run demo/helios-robotics.txt
```

Live-Extraction-Test gegen genau dieses Dokument (mit gesetztem `ANTHROPIC_API_KEY`):

```bash
npx vitest run tests/ingestion/live.test.ts
```

---

## Schritt 1 — Erwartete Extraktion (literal, ohne Mathematik)

```jsonc
{
  "company": { "name": "Helios Robotics" },
  "rounds": [
    { "name": "Seed",     "date": "2021-02-01", "preMoney": 4000000,  "investment": 1000000, "pricePerShare": 1.0, "liqPref": 1.0, "participation": "none",   "participationCap": null, "seniority": 1 },
    { "name": "Series A", "date": "2022-05-01", "preMoney": 10000000, "investment": 4000000, "pricePerShare": 2.0, "liqPref": 1.0, "participation": "none",   "participationCap": null, "seniority": 2 },
    { "name": "Series B", "date": "2023-09-01", "preMoney": 28000000, "investment": 8000000, "pricePerShare": 4.0, "liqPref": 1.0, "participation": "capped", "participationCap": 2.0,  "seniority": 3 }
  ],
  "investors": [
    { "name": "Seedcamp Ventures", "round": "Seed",     "amount": 700000 },
    { "name": "Angel Collective",  "round": "Seed",     "amount": 300000 },
    { "name": "Northstar Capital", "round": "Series A", "amount": 4000000 },
    { "name": "Meridian Growth",   "round": "Series B", "amount": 8000000 }
  ]
}
```

Wichtig: Die Gründer (Common) tauchen hier **nicht** auf — sie sind keine „Investoren". Die Engine leitet ihre
Anteile rechnerisch ab (siehe Schritt 2).

---

## Schritt 2 — Erwartete Cap Table (von der Engine berechnet)

Ableitungen (kein Wert davon steht im Dokument — die Engine rechnet sie):
- **Gründer-Common** = Pre-Money(Seed) / Preis(Seed) = 4.000.000 / 1,00 = **4.000.000 Anteile**
- **Seed** = 1.000.000 / 1,00 = **1.000.000** · **Series A** = 4.000.000 / 2,00 = **2.000.000** · **Series B** = 8.000.000 / 4,00 = **2.000.000**
- **Gesamt (fully diluted) = 9.000.000 Anteile**

| Anteilsklasse | Anteile | Preis | Investiert | Liq-Pref | Participation | Cap | Seniorität |
|---|--:|--:|--:|--:|---|--:|--:|
| Common | 4.000.000 | — | — | — | — | — | 0 |
| Seed | 1.000.000 | $1,00 | $1.000.000 | 1,0x | none | — | 1 |
| Series A | 2.000.000 | $2,00 | $4.000.000 | 1,0x | none | — | 2 |
| Series B | 2.000.000 | $4,00 | $8.000.000 | 1,0x | capped | 2,0x | 3 |

| Halter | Klasse | Anteile | Ownership (FD) |
|---|---|--:|--:|
| Founders | Common | 4.000.000 | 44,44 % |
| Seedcamp Ventures | Seed | 700.000 | 7,78 % |
| Angel Collective | Seed | 300.000 | 3,33 % |
| Northstar Capital | Series A | 2.000.000 | 22,22 % |
| Meridian Growth | Series B | 2.000.000 | 22,22 % |

---

## Schritt 3 — Erwarteter Waterfall (3 Exit-Szenarien)

Reihenfolge: Liq-Prefs nach Seniorität zuerst (höchste zuerst: B → A → Seed); danach Verteilung des Rests an
Common + participating; jede non-participating Preferred **wandelt**, wenn „as-converted" mehr bringt als die Pref;
Series B ist participating, **gedeckelt bei 2,0x** (= $16M total).

### Szenario A — Exit $10.000.000 (Downside: Prefs > Erlös)
Liq-Prefs gesamt = 8 + 4 + 1 = 13M > 10M. Zahlung nach Seniorität, bis der Erlös aufgebraucht ist:

| Halter | Auszahlung | MOIC |
|---|--:|--:|
| Meridian Growth (Series B) | $8.000.000 | 1,00x |
| Northstar Capital (Series A) | $2.000.000 | 0,50x |
| Seedcamp Ventures (Seed) | $0 | 0,00x |
| Angel Collective (Seed) | $0 | 0,00x |
| Founders (Common) | $0 | — |
| **Summe** | **$10.000.000** | |

**Zeigt:** Liquidationspräferenz + Seniorität-Stacking; „Preference Overhang" lässt Common (und sogar Seed) leer ausgehen.

### Szenario B — Exit $51.000.000 (Mitte: Conversion + Participation-Cap greift)
Seed und Series A **wandeln** (as-converted > Pref). Series B nimmt 1x Pref + Participation, **gedeckelt bei $16M (2,0x)**.
Common-Pool je Anteil = (51M − 16M) / 7.000.000 = **$5,00**.

| Halter | Auszahlung | MOIC |
|---|--:|--:|
| Founders (Common) | $20.000.000 | — |
| Seedcamp Ventures (Seed → Common) | $3.500.000 | 5,00x |
| Angel Collective (Seed → Common) | $1.500.000 | 5,00x |
| Northstar Capital (Series A → Common) | $10.000.000 | 2,50x |
| Meridian Growth (Series B, capped) | $16.000.000 | 2,00x |
| **Summe** | **$51.000.000** | |

**Zeigt:** non-participating Preferred wandeln, wenn sich's lohnt; participating Preferred wird durch den Cap gedeckelt
(Meridian landet exakt bei 2,0x).

### Szenario C — Exit $100.000.000 (Upside: alle wandeln)
Oberhalb von ~$72M ist der Series-B-Cap ($16M) schlechter als Wandeln → auch Series B wandelt. Reine Pro-rata-Verteilung
über 9.000.000 Anteile: $100M / 9.000.000 = **$11,111 je Anteil**.

| Halter | Auszahlung | MOIC |
|---|--:|--:|
| Founders (Common) | $44.444.444 | — |
| Seedcamp Ventures | $7.777.778 | 11,11x |
| Angel Collective | $3.333.333 | 11,11x |
| Northstar Capital (Series A) | $22.222.222 | 5,56x |
| Meridian Growth (Series B) | $22.222.222 | 2,78x |
| **Summe** | **$100.000.000** | |

**Zeigt:** bei hohen Exits wandeln alle Preferred in Common; der Participation-Cap macht das Wandeln für Series B optimal.

---

## Was dieser eine Testfall an Logik abdeckt
- Ableitung der Anteile aus Pre-Money/Preis (inkl. Gründer-Common, die nicht im Dokument stehen).
- Ownership-% (fully diluted), Summe = 100 %.
- Liquidationspräferenz **mit Seniorität-Stacking** (B > A > Seed), inkl. Unterdeckung im Downside.
- **Conversion-Optimierung** (non-participating wandeln, wenn as-converted > Pref).
- **Participating preferred mit Cap** (Series B exakt 2,0x bei mittleren Exits; wandelt bei hohen Exits).
- Waterfall-Invariante: Summe der Auszahlungen = Exit-Erlös (in jedem Szenario geprüft).

> Diese Zahlen sind die Zielwerte für die Engine. Als Golden-Case liegen sie in `tests/fixtures/golden.ts`
> und werden von `tests/engine/runWaterfall.test.ts` verifiziert.
