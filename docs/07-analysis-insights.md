# 07 – Analyse & Insights

Baut auf der Cap-Table-Engine + Waterfall auf. Vier Bausteine: Red Flags, Investor-Ranking,
Patterns for Success, Competitor-Benchmarking. Alle Insights sind erklärbar (Drill-down zur Quelle).

## 1. Red Flags

Regelbasierte Marker (deterministisch, erklärbar). Beispiel-Katalog mit Default-Schwellen
(konfigurierbar – siehe offene Fragen):

**Term-/Struktur-Risiken**
- Liquidation Preference > 1× (🟡 ab 1.5×, 🔴 ab 2×).
- Participating preferred **ohne** Cap.
- Full-Ratchet Anti-Dilution.
- Stacked (senior) Prefs statt pari-passu → hoher Preference-Overhang.
- Cumulative Dividends auf Preferred.
- Pay-to-play / harte Drag-Along-Schwellen / ungewöhnliche Vetorechte.

**Cap-Table-Gesundheit**
- Großer **Preference Overhang**: Common/Founder bei realistischen Exits faktisch leer.
- Hohe Founder-Verwässerung früh / niedrige Founder-Ownership relativ zur Stage.
- **Dead Equity** (große Anteile bei inaktiven Ex-Gründern/Beratern).
- Option Pool zu klein (kein Headroom) oder Top-up komplett pre-money zulasten Altgesellschafter.
- Hoher Convertible-Overhang (viele ungewandelte SAFEs/Notes, unklare Verwässerung).
- Zu viele/zu wenige Investoren, fragmentierte Cap Table, fehlende Lead-Struktur.

**Datenqualität (eigene Kategorie)**
- Fehlende Schlüsseldokumente (z. B. SHA einer Runde fehlt).
- Konflikte zwischen Quellen (Term Sheet ≠ final SHA).
- Viele niedrig-Confidence-Felder → Cap Table nur eingeschränkt belastbar.

Jeder Red Flag: Schweregrad, Erklärung, betroffene Felder + Quelle, ggf. Auswirkung im Waterfall.

## 2. Investor-Ranking („Liste aller Investoren → Ranken")

Liste aller Stakeholder mit Sortier-/Rank-Kriterien (Auswahl & Gewichtung konfigurierbar – offene Frage):
- Ownership % (as-issued & fully diluted), eingesetztes Kapital.
- Pref-/Term-Aggressivität (wie investorfreundlich sind ihre Terms).
- Seniorität im Waterfall (wer wird zuerst bedient).
- Pro-rata-Rechte / Follow-on-Kapazität.
- Board-/Kontrollrechte.
- (optional, falls Daten vorhanden) Signaling/Reputation, Value-Add.

Ausgabe: sortierbare Tabelle + „wer dominiert die Cap Table / den Waterfall".

## 3. Patterns for Success

Vergleich der aktuellen Cap-Table-Struktur mit Mustern erfolgreicher (vs. gescheiterter) Beteiligungen.
- Metriken zum jeweiligen Stage-Zeitpunkt: Founder-Ownership, # Runden, Verwässerung pro Runde,
  Pool-Größe, Syndikatsgröße, Liq-Pref-Last, Zeit zwischen Runden.
- **Voraussetzung**: Referenzdatensatz (eigenes Portfolio inkl. Exits + ggf. Marktdaten).
  → Datenbasis ist eine offene Frage; ohne genug Historie startet das als deskriptiver Vergleich,
  nicht als statistisches Modell.
- Ausgabe: „diese Beteiligung ähnelt Profil X unserer erfolgreichen Exits / weicht in Y ab".

## 4. Competitor-Benchmarking („Cap Tables Competitors für Analyse / Exit + Entry")

- Cap Tables von Wettbewerbern als `isCompetitorBenchmark`-Companies pflegen.
- Vergleich: Valuation-Trajektorie, Verwässerung, Investorenstruktur, Terms.
- Nutzen bei **Entry** (ist unser Preis/Terms markt-üblich?) und **Exit** (Vergleichswerte für Bewertung).
- Datenquelle für Competitor-Cap-Tables klären (öffentlich oft lückenhaft) – siehe offene Fragen.

## Cross-Portfolio-Sicht

- Aggregierte Views: alle Beteiligungen mit Filter (z. B. „alle mit > 1× participating", „alle mit
  anstehender Down-Round-Gefahr", „unser FD-Ownership je Beteiligung").
- Portfolio-Return-Übersicht: erwartete MOIC je Beteiligung bei Szenario-Exit-Werten.
