# 11 – Offene Fragen & Annahmen

Damit „keine Fragen offen bleiben": Hier alle Punkte, die ich noch nicht sicher weiß, **mit meinem
Default-Vorschlag**. Wo du nichts sagst, baue ich nach Default. Bitte durchgehen und korrigieren.

## A. Bereits beantwortet (aus Rückfragen)
- Umfang: **alle Module**, detaillierte Doku je Modul. ✅
- Plattform: **lokale Desktop-App**. ✅
- Datenquellen: lokaler Ordner, Upload, Google Drive, Datenraum **+ eine weitere** (siehe B1). ✅
- Scope: **ganzes Portfolio** inkl. Competitor-Benchmarking. ✅

## B. Wichtig – beeinflusst Architektur/Bau

| # | Frage | Default-Vorschlag |
|---|---|---|
| B1 | Welche **„weitere" Datenquelle** war gemeint? (E-Mail, Notion, Carta/Ledgy-Export, anderes?) | Annahme vorerst: keine zusätzliche; einbauen, sobald spezifiziert. |
| B2 | **Privacy-Modus**: Dürfen Dokumente zur Extraktion an die Claude API gehen (Zero-Retention) oder strikt lokal? | Default: Claude API mit Zero-Retention **plus** umschaltbarer Local-only-Modus. |
| B3 | **Electron oder Tauri**? | Default: Electron (Ökosystem); Tauri falls Bundle-Größe/Maximal-Security wichtiger. |
| B4 | **Betriebssystem** primär? (du bist auf Windows 11) | Default: Windows zuerst, Cross-Platform-fähig halten. |
| B5 | **Sprache der UI**: Deutsch, Englisch oder zweisprachig? | Default: Englisch als UI-Sprache, da Terms englisch; DE optional. |
| B6 | **Mehrbenutzer/Sync** nötig (Team teilt Cap Tables)? | Default: vorerst Single-User local-first; Sync später (Datei-Export oder Backend). |

## C. Fachlich – Cap Table & Waterfall

| # | Frage | Default-Vorschlag |
|---|---|---|
| C1 | Welche **Jurisdiktionen** vor allem? (DE GmbH-Geschäftsanteile vs. US C-Corp Shares verhalten sich anders) | Default: Modell unterstützt beides; UI/Begriffe generisch („Shares/Anteile"). |
| C2 | **SAFE-Varianten** relevant? (post-money YC SAFE, pre-money, Wandeldarlehen mit Cap+Discount+Zins) | Default: alle gängigen abbilden; deutsche Wandeldarlehen priorisiert. |
| C3 | Müssen **Vesting-Schedules** detailliert modelliert werden (Cliff/Monatlich)? | Default: ja, einfache Standard-Schedules; komplexe später. |
| C4 | Wie genau müssen **Down-Round-/Anti-Dilution**-Anpassungen sein? | Default: Full Ratchet + Broad-Based WA exakt; Narrow-Based optional. |
| C5 | **Transaktionskosten/Escrow/Earn-out** im Waterfall berücksichtigen? | Default: optionale Felder, standardmäßig 0. |

## D. Analyse

| # | Frage | Default-Vorschlag |
|---|---|---|
| D1 | Nach welchen **Kriterien + Gewichtung** Investoren ranken? | Default: konfigurierbar; Start mit Ownership, Kapital, Term-Aggressivität, Seniorität. |
| D2 | **Red-Flag-Schwellen**: deine Hausregeln/Standards? | Default: Branchenüblich (Doc 07), in Settings anpassbar. |
| D3 | **Patterns for Success**: Gibt es einen Referenzdatensatz (eigene Exits, Marktdaten)? | Default: startet deskriptiv mit eurem Portfolio; Modell erst bei genug Historie. |
| D4 | **Competitor-Cap-Tables**: Datenquelle? (öffentlich oft lückenhaft – manuell pflegen?) | Default: manuelle Pflege + was aus Quellen extrahierbar ist. |

## E. Daten & Betrieb

| # | Frage | Default-Vorschlag |
|---|---|---|
| E1 | Gibt es **Beispiel-Datenräume/Cap-Tables** zum Testen (anonymisiert)? | Default: ich baue synthetische Testfälle, bis echte kommen. |
| E2 | Bestehende **Excel-Cap-Table-Vorlage** des Funds, an der wir uns orientieren sollen? | Default: generisches Schema; an eure Vorlage anpassbar, falls vorhanden. |
| E3 | **Backup/Versionierung** der lokalen Daten gewünscht? | Default: lokale Backups + Snapshots; Cloud-Backup optional. |
| E4 | Brauchst du **Audit-Trail** (wer hat was geändert) für Compliance? | Default: ja, leichter Audit-Log lokal. |

## F. Nächste Entscheidung
Bitte mir mind. **B1, B2, B3, C1** beantworten – damit kann ich Phase 0 starten. Den Rest kläre ich
schrittweise. Defaults greifen, wo du nichts vorgibst.
