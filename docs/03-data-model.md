# 03 – Datenmodell

Multi-Company / Portfolio-fähig. Alle Beträge als Decimal (kein Float). Alle Daten mit Provenance verknüpfbar.

## Entitäten (Überblick)

```
Portfolio
 └─ Company (Beteiligung)
     ├─ FundingRound (Seed, Series A, …)
     │   └─ Issuance (Ausgabe von Securities in dieser Runde)
     ├─ ShareClass (Common, Preferred Series X) ── Terms
     ├─ Security (konkretes Instrument: Aktien, Optionen, SAFE, Wandeldarlehen, Warrant)
     ├─ Stakeholder (Investor / Founder / ESOP / Angel)
     ├─ Holding (wer hält wie viel von welcher Security)
     ├─ OptionPool
     ├─ Transaction/Event (Issuance, Transfer, Conversion, Exercise, Cancellation)
     ├─ Valuation (pre/post money je Runde, 409A-/Fair-Value optional)
     └─ Document (Quelldatei) ── FieldProvenance (feldgenaue Herkunft + Confidence)
 └─ Scenario (Exit-/Follow-on-What-ifs, referenziert Company-Stand)
```

## Kern-Felder

### Company
`id, name, legalName, jurisdiction, foundedDate, status (active/exited/written-off), website, sector, isPortfolio (bool), isCompetitorBenchmark (bool)`

### FundingRound
`id, companyId, name, type (Pre-Seed/Seed/Series A…/Bridge/Secondary), date, preMoneyValuation, postMoneyValuation, amountRaised, leadInvestorId, pricePerShare, optionPoolTopUp, sourceDocs[]`

### ShareClass + Terms
`id, companyId, name, type (common/preferred), seniorityRank (int), pricePerShare, originalIssuePrice`

**Terms** (eingebettet, das Herzstück für Waterfall & Red Flags):
- `liqPrefMultiple` (z. B. 1.0, 2.0)
- `participation` (`none` | `full` | `capped`)
- `participationCap` (z. B. 3.0 = 3x Cap; null wenn full/none)
- `seniority` (`senior` | `pari-passu` | `subordinate`) + `seniorityRank`
- `antiDilution` (`none` | `full-ratchet` | `broad-based-wa` | `narrow-based-wa`)
- `conversionRatio` (default 1.0)
- `dividend` (rate, `cumulative` | `non-cumulative`, accrual)
- `proRataRights` (bool)
- `dragAlong` / `tagAlong` (threshold %)
- `payToPlay` (bool)
- `votingRights`, `boardSeats`
- `convertsToClassId` (Ziel-Klasse bei Conversion)

### Security (Instrumententyp)
`id, companyId, shareClassId?, type (equity-share | option | warrant | safe | convertible-note), quantity, ...`
- Für **SAFE/Convertible**: `principal, valuationCap, discount, interestRate, maturityDate, conversionTrigger, mfn (bool)`
- Für **Option/Warrant**: `strikePrice, vestingSchedule, expiry, status (granted/vested/exercised)`

### Stakeholder
`id, name, type (vc-fund | angel | founder | employee | esop-pool | strategic | other), isOurFund (bool), entityType, contact`

### Holding
`id, companyId, stakeholderId, securityId, quantity, acquiredDate, costBasis, sourceDocs[]`

### OptionPool
`id, companyId, totalSize, allocated, available, asOfRoundId`

### Transaction/Event
`id, companyId, type (issuance | transfer | conversion | exercise | cancellation | repurchase), date, fromStakeholderId?, toStakeholderId?, securityId, quantity, pricePerShare, roundId?, sourceDocs[]`
> Die Cap Table ist die Summe aller Events bis zu einem Stichtag (event-sourced) → ermöglicht Zeitreisen
> („Cap Table zum Series-A-Closing") und saubere Updates.

### Valuation
`id, companyId, roundId?, date, preMoney, postMoney, pricePerShare, method, sourceDocs[]`

### Document
`id, companyId?, fileName, filePath/uri, source (folder | upload | gdrive | dataroom | other), docType (excel-captable | sha | articles | term-sheet | safe | convertible | side-letter | board-resolution | other), hash, pageCount, ingestedAt`

### FieldProvenance  ← Kern für Hover/Drill-down + Confidence
`id, entityType, entityId, fieldName, documentId, page, locator (bbox/cell-ref/text-span), extractedValue, confidence (0–1), method (excel-cell | pdf-text | llm-vision | manual), extractedAt, reviewedBy?, reviewStatus (auto | confirmed | corrected)`

### Scenario
`id, companyId, name, baseAsOf (Datum/Event), exitValuation, exitType (ipo | trade-sale | liquidation), followOnRounds[], assumptions, createdBy, createdAt`

## Invarianten (von der Engine geprüft)

- Summe Ownership (fully diluted) = 100 %.
- Summe aller Waterfall-Auszahlungen = Exit-Erlös (minus Kosten/Schulden).
- Keine negativen Holdings; Pool allocated ≤ totalSize.
- Jede abgeleitete Zahl ist auf ≥ 1 Event/Document rückführbar (oder als „manuell/angenommen" markiert).

## Beziehungen zur Provenance

Jedes Feld, das **nicht** berechnet ist (z. B. `liqPrefMultiple`, `amountRaised`), MUSS einen
`FieldProvenance`-Eintrag haben – entweder aus Extraktion (mit Confidence) oder `method=manual`.
Berechnete Werte tragen ihre Formel + die IDs der Input-Felder (für Drill-down „warum diese Zahl?").
