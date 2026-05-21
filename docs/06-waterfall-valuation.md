# 06 – Waterfall & Valuation

Das Herzstück für Exit-Analyse: Wer bekommt bei einem Exit-Erlös wie viel? Ergebnis = **Shares × Share Price**
je Stakeholder, aber unter Berücksichtigung aller Vorzugsrechte.

## Eingaben

- Exit-Erlös (Bruttoverkaufspreis) und Exit-Typ (Trade Sale / IPO / Liquidation).
- Optional: Transaktionskosten, ausstehende Schulden/Wandeldarlehen, Escrow/Earn-out.
- Aktuelle Cap Table inkl. aller Share-Klassen + Terms (Liq-Pref, Participation, Cap, Seniorität, Conversion).

## Waterfall-Algorithmus (Standard-Reihenfolge)

```
1. Nettoerlös = Exit-Erlös − Transaktionskosten
2. Schulden / nicht gewandelte Convertibles bedienen (nach deren Regeln)
3. Liquidation Preferences nach Seniorität auszahlen:
     - Reihenfolge: senior → pari-passu (anteilig, falls Erlös nicht reicht) → subordinate
     - Pref-Betrag je Klasse = liqPrefMultiple × investiertes Kapital (× ausstehende Shares)
4. Participation:
     - non-participating: Klasse hat Pref ODER wandelt in Common (Schritt 6) – das Maximum
     - full participating: Pref + anteilig am verbleibenden Erlös (wie Common)
     - capped participating: Pref + Teilnahme bis Cap (z. B. 3× Investment), danach gedeckelt
5. Rest verteilt sich auf Common + as-converted Preferred (pro Share)
6. Conversion-Optimierung (entscheidend!):
     - Jede non-participating Preferred-Klasse wählt: max(Liq-Pref, as-converted-Common-Anteil)
     - Das ist iterativ/abhängig, weil eine Conversion die Verteilung für alle ändert
     → Engine löst das per Iteration bis Fixpunkt (jede Klasse trifft optimale Wahl)
7. ESOP/Optionen: nur in-the-money Optionen partizipieren (Erlös pro Share > Strike), abzgl. Strike
8. Ergebnis: Auszahlung je Stakeholder, Erlös pro Share, MOIC je Investor
```

### Wichtige Feinheiten
- **Pari-passu bei Unterdeckung**: Reicht der Erlös nicht für alle gleichrangigen Prefs, anteilige Kürzung.
- **Capped participating**: Sobald der Cap erreicht ist, ist Conversion zu Common oft vorteilhafter → in
  die Conversion-Optimierung einbeziehen.
- **Stacked vs. pari-passu** verändert die Verteilung massiv – muss exakt aus den Terms kommen.
- **Convertibles**, die im Exit noch nicht gewandelt sind: nach SAFE/Note-Regeln behandeln (oft zum Cap).

## Worked Example (zur Test-Verankerung)

Beispiel: Exit 50 Mio. €. Series A investierte 10 Mio. mit 1× non-participating, hält 25 % as-converted.
- Liq-Pref-Pfad: 10 Mio. €.
- As-converted-Pfad: 25 % × 50 Mio. = 12,5 Mio. €.
- → Series A **wandelt** (12,5 > 10). Ergebnis fließt in die Gesamtverteilung; danach prüfen alle anderen
  Klassen erneut ihre optimale Wahl (Fixpunkt-Iteration).

> Solche Beispiele werden als Unit-Test-Golden-Cases hinterlegt (inkl. participating-cap, stacked, down-round).

## Return-Kurve

Auszahlung / MOIC je Stakeholder als **Funktion des Exit-Erlöses** (z. B. 0 → 500 Mio.).
- Zeigt charakteristische **Knicke**: dort, wo eine Preferred von „Pref nehmen" zu „converten" wechselt,
  oder ein Participation-Cap greift.
- Pro Investor: ab welchem Exit-Wert lohnt sich was; Break-even-Punkte; „Preference Overhang" sichtbar
  (Bereich, in dem Common faktisch leer ausgeht).
- Vergleich mehrerer Investoren / unseres Funds in einer Kurve.

## Valuation-Unterstützung

- Aus Waterfall + Zielrendite rückwärts: „Welcher Exit-Wert nötig für unseren Ziel-MOIC?"
- Entry-Bewertung: bei gegebenem Preis & Terms, was bedeutet das für Ownership & Return-Erwartung?
- Sensitivitäten: Exit-Wert, Verwässerung künftiger Runden, Liq-Pref-Annahmen.

## Genauigkeit

- Alle Beträge Decimal; Verteilung summiert exakt auf Nettoerlös (Invariante, getestet).
- Jede Auszahlungszeile ist drill-down-bar: „warum diese Zahl?" → Pref/Participation/Conversion-Pfad sichtbar.
