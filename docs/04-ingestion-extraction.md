# 04 – Ingestion & Extraktion („Auslesen")

Ziel: **Ordner/Datenraum rein → fertige Cap Table raus**, mit Quellenangabe und Confidence pro Wert.

## Datenquellen (Connectors)

| Quelle | Zugriff | Hinweise |
|---|---|---|
| **Lokaler Ordner** | Pfad wählen, rekursiv scannen | Einfachster Fall; watch-on-change optional. |
| **Upload in der App** | Drag & Drop / Dateiauswahl | Für Einzeldokumente / Nachträge. |
| **Google Drive** | OAuth, read-only, Ordner wählen | Token lokal/sicher; nur lesen. |
| **Datenraum (VDR)** | Export/Download → wie lokaler Ordner | Drooms/Ansarada/DealRoom bieten meist nur Bulk-Export; direkte API selten. |
| **Weitere Quelle** | *(vom Nutzer noch zu spezifizieren – siehe offene Fragen)* | z. B. E-Mail-Postfach, Notion, Carta-Export? |

## Pipeline-Schritte

### 1. Klassifizierung
Jedes Dokument bekommt einen `docType` (Excel-Cap-Table, SHA, Satzung, Term Sheet, SAFE/Wandeldarlehen,
Side Letter, Board Resolution, …). Heuristik (Dateiname/Endung) + LLM-Klassifikation bei Unsicherheit.

### 2. Parsing (Rohextraktion)
- **Excel**: Zellen + Formeln via SheetJS; Tabellenbereiche erkennen; Cap-Table-typische Header matchen.
- **PDF mit Text-Layer**: Text + Position via pdf.js (für Provenance-Locator).
- **Gescanntes PDF / komplexe Legals**: Seitenbilder → Claude Vision.

### 3. LLM-Extraktion (strukturiert)
Das LLM erhält Rohinhalt + ein **Ziel-Schema** (die Entitäten aus `03-data-model.md`) und gibt zurück:
- strukturierte Felder,
- pro Feld eine **confidence** (0–1),
- einen **locator** (Seite + Stelle / Zellbezug), aus dem der Wert stammt,
- eine kurze **Begründung/Zitat** (für Drill-down).

Extraktions-Prinzipien:
- **Nie raten ohne Markierung**: Unsichere Werte → niedrige Confidence + Flag „needs review", nicht stillschweigend füllen.
- **Zitat-Pflicht**: Jeder extrahierte Term referenziert die Textstelle, aus der er stammt.
- **Schema-validiert**: Output gegen JSON-Schema prüfen; bei Verstoß erneut/markiert.

### 4. Reconciliation (Zusammenführen & Konflikte)
Mehrere Dokumente beschreiben oft dieselben Fakten (z. B. Term Sheet vs. final SHA).
- **Quellen-Priorität**: ausgeführter Vertrag (SHA/Satzung) > Term Sheet > Pitch/Excel.
- **Konflikt-Erkennung**: Abweichende Werte für dasselbe Feld → Konflikt-Flag, beide Quellen anzeigen, Nutzer entscheidet.
- **Recency**: neuere/finale Runde überschreibt ältere, aber Historie bleibt erhalten (event-sourced).

### 5. Review-Workflow
- Ergebnis-Tabelle mit Ampel: 🟢 hohe Confidence, 🟡 mittel/Konflikt, 🔴 fehlt/niedrig.
- Nutzer bestätigt/korrigiert (`reviewStatus`); Korrekturen werden als manuelle Provenance gespeichert.
- „Nur ungeprüfte/niedrige zeigen"-Filter, um schnell durchzugehen.

## Confidence Level

Pro Feld ein Wert 0–1, abgeleitet aus:
- Extraktionsmethode (Excel-Zelle/Manuell = sehr hoch; PDF-Text = hoch; Vision/LLM-Inferenz = variabel),
- LLM-Selbsteinschätzung,
- Vorhandensein eines klaren Zitats,
- Übereinstimmung über mehrere Quellen (Agreement erhöht, Konflikt senkt),
- Schema-/Plausibilitäts-Checks (z. B. Liq-Pref-Multiple zwischen 0.5–3 plausibel).

Aggregiert: pro Cap Table ein **Gesamt-Confidence**-Indikator + Liste der schwächsten Felder.

## Provenance (Hover + Drill-down)

- **Hover** über jeden Wert → Quelle (Dokument, Seite), Confidence, Methode, Extraktionsdatum.
- **Drill-down** (Klick) → öffnet das Originaldokument an der Stelle (Seite/Highlight/Zelle) + Zitat.
- Bei **berechneten** Werten: zeigt Formel + Eingangswerte, jeweils selbst wieder drill-down-bar
  (z. B. „Ownership 12,4 % = 1.240.000 / 10.000.000 Shares" → woher beide Zahlen kommen).

## Edge Cases

- Mehrere Excel-Versionen → neueste + Diff anzeigen.
- Gescannte/handschriftliche Dokumente → Vision, niedrigere Confidence.
- Fremdsprachige Legals (DE/EN gemischt) → mehrsprachige Extraktion.
- Wandeldarlehen/SAFE noch nicht gewandelt → als Instrument führen, Conversion erst bei Trigger rechnen.
- Fehlende Dokumente → Lücke explizit markieren („Pre-Seed-SHA fehlt"), nicht stillschweigend annehmen.
