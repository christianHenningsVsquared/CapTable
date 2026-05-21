# 02 – Architektur

## Leitprinzipien

- **Local-first**: Daten liegen primär auf dem Rechner des Nutzers (sensible Cap-Table-/Deal-Daten).
- **Provenance by design**: Jeder gespeicherte Wert verweist auf seine Quelle (Dokument + Stelle + Confidence).
- **Deterministische Engine, separat vom LLM**: Cap-Table-/Waterfall-Mathematik ist regelbasiert und testbar;
  das LLM macht nur Extraktion/Strukturierung, nie die Finanz-Rechnung.
- **Erklärbarkeit**: Ergebnisse sind aufschlüsselbar (Drill-down), nicht „Black Box".

## Empfohlener Tech-Stack (lokale Desktop-App)

| Schicht | Empfehlung | Begründung / Alternative |
|---|---|---|
| App-Shell | **Electron** (oder **Tauri**) | Electron = reifes Ökosystem für komplexe UIs; Tauri = leichter & sicherer (Rust), kleineres Bundle. Entscheidung: siehe offene Fragen. |
| Frontend | **React + TypeScript** | Interaktive Tabellen & Charts, große Komponenten-Auswahl. |
| Charts | **visx / D3** (Waterfall), **Recharts** (Standard-Charts) | Waterfall braucht Custom-Rendering + Interaktion. |
| Lokale DB | **SQLite** (`better-sqlite3`) | Eingebettet, transaktional, ideal local-first; gut für Audit/Provenance. |
| Finanz-Engine | **TypeScript** (eigene Module) | Cap-Table-/Waterfall-Logik, voll getestet, deterministisch. |
| Excel-Parsing | **SheetJS (xlsx)** | Liest .xlsx/.xls, Formeln & Werte. |
| PDF (Text) | **pdf.js / pdf-parse** | Text-Layer-Extraktion. |
| PDF (gescannt) / Legals | **Claude API (Vision + Text)** | Versteht unstrukturierte Legals, liefert strukturierte Felder + Konfidenz. |
| Geld/Zahlen | **decimal.js** (kein float) | Exakte Beträge, keine Rundungsfehler im Waterfall. |

> Hinweis: Falls einzelne Parser in Python einfacher sind (z. B. komplexe PDFs/Tabellen), kann ein
> **Python-Sidecar** gebündelt werden. Primärsprache bleibt TypeScript. Bei „Du entscheidest"-Stack
> ist obiges der Default.

## Komponenten

```
┌──────────────────────────────────────────────────────────────┐
│ Desktop-App (Electron/Tauri)                                   │
│                                                                │
│  ┌─────────────┐   ┌──────────────────┐   ┌────────────────┐  │
│  │ UI (React)  │◄─►│ App-Core / State │◄─►│ Local DB        │  │
│  │ - Cap Table │   │ - Companies      │   │ (SQLite)        │  │
│  │ - Waterfall │   │ - Scenarios      │   │ - Entities      │  │
│  │ - Analyse   │   │ - Provenance     │   │ - Documents     │  │
│  └─────────────┘   └──────────────────┘   │ - Provenance    │  │
│         ▲                   ▲              └────────────────┘  │
│         │                   │                                  │
│  ┌──────┴───────┐   ┌───────┴────────────────────────────┐    │
│  │ Engine (TS)  │   │ Ingestion-Pipeline                 │    │
│  │ - Dilution   │   │ - Source-Connectors                │    │
│  │ - Waterfall  │   │   (Folder/Upload/Drive/Datenraum)  │    │
│  │ - Returns    │   │ - Parser (Excel/PDF)               │    │
│  │ - Red Flags  │   │ - LLM-Extraktion (Claude API)      │    │
│  └──────────────┘   │ - Confidence & Mapping             │    │
│                     └─────────────┬──────────────────────┘    │
└───────────────────────────────────┼───────────────────────────┘
                                     │ (nur für Extraktion)
                              ┌──────▼──────┐
                              │ Claude API  │  ← externe Verbindung
                              └─────────────┘
```

## Datenfluss (Auslesen → Cap Table)

1. **Source-Connector** holt Dateien (lokaler Ordner / Upload / Google Drive / Datenraum-Export).
2. **Klassifizierer** ordnet jedes Dokument einem Typ zu (Excel-Cap-Table, SHA, Satzung, Term Sheet, …).
3. **Parser** extrahiert Rohinhalt (Excel-Zellen, PDF-Text, Seiten-Bilder).
4. **LLM-Extraktion** wandelt Rohinhalt in strukturierte Felder + **Confidence** + **Quellen-Mapping**.
5. **Reconciliation** führt Felder mehrerer Dokumente zusammen, erkennt Konflikte.
6. **Persistenz**: Entities + Provenance in SQLite.
7. **Engine** berechnet abgeleitete Werte (Ownership, Waterfall, Returns) on demand.

## Privacy & Security (wichtig – VC-Daten)

Lokale Desktop-App wurde u. a. wegen Datensensibilität gewählt. **Spannungsfeld**: Die LLM-Extraktion von
Legals/PDFs sendet Dokumentinhalte an die Claude API (externe Verbindung). Optionen:

- **A (Default-Vorschlag)**: Claude API mit Zero-Data-Retention/No-Training-Vereinbarung; nur die für die
  Extraktion nötigen Dokumentteile werden gesendet; alles andere bleibt lokal. Klar im UI kommuniziert.
- **B – „Local-only-Modus"**: Keine externe API; nur deterministische Parser (Excel + PDF-Text-Layer) und
  manuelle Eingabe. Geringere Extraktionsqualität bei komplexen Legals.
- **C – Lokales Modell**: On-device LLM (z. B. via Ollama) für Extraktion; höchste Vertraulichkeit, mehr
  Setup/Hardware, geringere Qualität.

→ Entscheidung in [11-open-questions.md](11-open-questions.md). Default: **A**, mit umschaltbarem **Local-only-Modus (B)**.

Weitere Maßnahmen:
- Lokale DB optional verschlüsselt (SQLCipher).
- Datei-Audit-Log: was wurde wann aus welchem Dokument extrahiert.
- Keine Telemetrie ohne Opt-in.
- Google-Drive- & Datenraum-Zugriff read-only, OAuth-Tokens lokal/sicher gespeichert.

## Teststrategie

- **Engine**: Unit-Tests mit handgerechneten Referenz-Waterfalls (inkl. Edge-Cases: participating cap,
  stacked prefs, anti-dilution, convertible-Conversion).
- **Golden Files**: Beispiel-Datenräume → erwartete strukturierte Cap Table.
- **Property-Tests**: Summen-Invarianten (Ownership = 100 %, Waterfall-Auszahlung = Exit-Erlös).
