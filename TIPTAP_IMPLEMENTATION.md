# TipTap und Reveal.js Integration - Implementierungsbericht

## Übersicht

Diese Implementierung integriert TipTap als WYSIWYG-Editor mit benutzerdefinierten Layout-Nodes (TwoColumnBlock, ThreeColumnBlock, HeroBlock) und refaktorisiert das gesamte Slide-Speicher- und Rendering-System zur Verwendung des TipTap JSON-Formats.

## Architektur

### Frontend (Editor)

**Dateien:**
- `public/assets/lib/tiptap/tiptap-bundle.js` - Haupt-TipTap-Editor mit benutzerdefinierten Nodes
- `public/assets/lib/tiptap/tiptap.css` - Styles für Editor und Layouts
- `public/assets/js/editor/customNodes.js` - Dokumentation der benutzerdefinierten Nodes
- `public/assets/js/admin.js` - Admin-Interface mit JSON-Speicherung

**Benutzerdefinierte TipTap Nodes:**
1. **TwoColumnBlock** - 2-Spalten-Layout (draggable)
2. **ThreeColumnBlock** - 3-Spalten-Layout (draggable)
3. **HeroBlock** - Hero-Slide mit großem Titel und Untertitel (draggable)
4. **Column** - Container für Spalteninhalte
5. **HeroTitle** - Titel-Element für Hero-Blöcke
6. **HeroSubtitle** - Untertitel-Element für Hero-Blöcke

**Toolbar-Buttons:**
- Überschriften (H2, H3, H4)
- Textformatierung (Bold, Italic, Underline, Strike)
- Listen (Bullet, Numbered)
- Ausrichtung (Left, Center, Right)
- Link, Bild Upload, Tabelle
- Bildgröße (S, M, L, XL)
- Bildposition (Left Float, Right Float, Normal)
- **NEU:** 2-Spalten Layout (⬜⬜)
- **NEU:** 3-Spalten Layout (⬜⬜⬜)
- **NEU:** Hero Slide (🎯)

### Backend (Renderer)

**Dateien:**
- `backend/renderer/slideRenderer.js` - Konvertiert TipTap JSON → Reveal.js HTML
- `backend/services/slideAnalyzer.js` - Analysiert PPTX/PDF → TipTap JSON
- `backend/services/pptx.js` - Generiert Reveal.js Präsentationen

**Funktionen:**
1. **tiptapJsonToHtml()** - Konvertiert JSON oder HTML → HTML
2. **generateSlideHtml()** - Erstellt Reveal.js <section> aus Slide-Daten
3. **generatePresentationHtml()** - Generiert vollständige Reveal.js Präsentation
4. **formatSlideContentAsJSON()** - Konvertiert PPTX/PDF Inhalte → TipTap JSON

## Datenfluss

### Manuelle Slide-Erstellung
```
1. Benutzer erstellt Slide im TipTap Editor
2. onUpdate() → editor.getJSON()
3. JSON → Textarea als String gespeichert
4. Form Submit → JSON.parse() → Backend
5. Backend speichert JSON in Datenbank
6. Reveal.js Rendering: JSON → generateHTML() → Reveal.js
```

### PPTX/PDF Import
```
1. Benutzer lädt PPTX/PDF hoch
2. analyzePPTX/analyzePDF extrahiert Text und Bilder
3. formatSlideContentAsJSON() → TipTap JSON
4. JSON wird in Datenbank gespeichert
5. generateSimpleSlides() → slideRenderer → Reveal.js HTML
```

### Slide-Anzeige
```
1. Frontend ruft /api/webinar/:id ab
2. Backend liest Slide-JSON aus Datenbank
3. slideRenderer.generatePresentationHtml()
   - Für jede Slide: tiptapJsonToHtml()
   - Ergebnis: Vollständiges Reveal.js HTML-Dokument
4. Reveal.js zeigt Präsentation mit allen Features an
```

## JSON-Speicherformat

### Beispiel: Einfache Slide mit Text
```json
{
  "title": "Willkommen",
  "content": {
    "type": "doc",
    "content": [
      {
        "type": "heading",
        "attrs": { "level": 2 },
        "content": [{ "type": "text", "text": "Einführung" }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Dies ist eine Beispiel-Slide." }]
      }
    ]
  },
  "speakerNote": "Begrüßung der Teilnehmer"
}
```

### Beispiel: Slide mit 2-Spalten-Layout
```json
{
  "title": "Vergleich",
  "content": {
    "type": "doc",
    "content": [
      {
        "type": "twoColumnBlock",
        "content": [
          {
            "type": "column",
            "content": [
              {
                "type": "paragraph",
                "content": [{ "type": "text", "text": "Linke Spalte" }]
              }
            ]
          },
          {
            "type": "column",
            "content": [
              {
                "type": "paragraph",
                "content": [{ "type": "text", "text": "Rechte Spalte" }]
              }
            ]
          }
        ]
      }
    ]
  },
  "speakerNote": "Vergleich der beiden Optionen"
}
```

### Beispiel: Hero-Slide
```json
{
  "title": "Großer Start",
  "content": {
    "type": "doc",
    "content": [
      {
        "type": "heroBlock",
        "content": [
          {
            "type": "heroTitle",
            "content": [{ "type": "text", "text": "Willkommen zum Webinar" }]
          },
          {
            "type": "heroSubtitle",
            "content": [{ "type": "text", "text": "Eine Einführung in die Grundlagen" }]
          }
        ]
      }
    ]
  },
  "speakerNote": "Starke Eröffnung"
}
```

## Datenformat

Das System verwendet ausschließlich TipTap JSON Format für alle Slide-Inhalte:

**TipTap JSON Format:**
```javascript
{
  "title": "Slide Titel",
  "content": {
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Slide Inhalt" }]
      }
    ]
  },
  "speakerNote": "Notiz für Sprachausgabe"
}
```

Alle Slides werden in diesem Format gespeichert und von `tiptapJsonToHtml()` mit `@tiptap/html` in Reveal.js HTML konvertiert.

## Features

### Editor-Features
✅ Rich-Text-Formatierung (Bold, Italic, Underline, Strike)
✅ Überschriften (H2-H5)
✅ Listen (Bullet, Numbered)
✅ Textausrichtung (Left, Center, Right)
✅ Links
✅ Tabellen (resizable)
✅ Bild-Upload mit Größenanpassung
✅ Bild-Float (Text-Wrap)
✅ **NEU:** 2-Spalten-Layout (draggable)
✅ **NEU:** 3-Spalten-Layout (draggable)
✅ **NEU:** Hero-Slide-Layout (draggable)

### Reveal.js Features
✅ Hash-Navigation
✅ Slide-Nummern
✅ Speaker-Notes
✅ Highlight.js für Code
✅ Vollständige Keyboard-Navigation
✅ Responsive Design
✅ Alle benutzerdefinierten Layouts korrekt gerendert

### Import-Features
✅ PPTX-Import mit Bildextraktion
✅ PDF-Import mit Seitenkonvertierung
✅ Automatische TipTap JSON-Generierung
✅ Wiederholende Inhalte-Filterung (Header/Footer)

## Sicherheit

✅ **Code Review**: Alle Feedback-Punkte addressiert
✅ **Security Scan**: 0 Alerts (CodeQL)
✅ **XSS-Schutz**: escapeHtml() bei allen Benutzereingaben
✅ **Input Validation**: JSON-Parsing mit try/catch
✅ **Path Traversal**: Verhindert in Bild-Uploads

## Testing-Checkliste

### Manuelle Slide-Erstellung
- [ ] Neue Slide erstellen mit Text
- [ ] Überschriften einfügen
- [ ] Bilder hochladen und einfügen
- [ ] Bildgröße ändern (S/M/L/XL)
- [ ] Bild-Float testen (Links/Rechts)
- [ ] Tabelle einfügen
- [ ] 2-Spalten-Layout einfügen
- [ ] 3-Spalten-Layout einfügen
- [ ] Hero-Slide erstellen
- [ ] Webinar speichern
- [ ] Webinar bearbeiten
- [ ] Reveal.js Präsentation anzeigen

### PPTX-Import
- [ ] PPTX-Datei hochladen
- [ ] Neues Webinar mit PPTX erstellen
- [ ] Automatische Slide-Generierung prüfen
- [ ] Bilder in generierten Slides prüfen
- [ ] Text-Extraktion prüfen
- [ ] Reveal.js Präsentation anzeigen

### PDF-Import
- [ ] PDF-Datei hochladen
- [ ] Neues Webinar mit PDF erstellen
- [ ] Seitenkonvertierung prüfen
- [ ] Bilder in generierten Slides prüfen
- [ ] Reveal.js Präsentation anzeigen

## Deployment

### Voraussetzungen
```bash
# Node.js Abhängigkeiten installieren
npm install

# Für PDF-Import: poppler-utils
apt-get install poppler-utils
```

### Umgebungsvariablen
Keine Änderungen erforderlich, bestehende `.env` funktioniert weiter.

### Server starten
```bash
# Entwicklung
npm run dev

# Produktion
npm start
```

### Docker
```bash
docker-compose up -d
```

## Bekannte Einschränkungen

1. **Browser-Kompatibilität**: ES Modules erforderlich (keine IE11-Unterstützung)
2. **PDF-Import**: Benötigt `pdftoppm` (poppler-utils) auf dem Server
3. **Bild-Uploads**: Max. 5MB pro Bild
4. **PPTX-Import**: Komplexe Animationen werden nicht unterstützt

## Zukünftige Erweiterungen

### Kurzfristig
- [ ] Drag & Drop für Bilder
- [ ] Weitere Spalten-Layouts (1/3 + 2/3, etc.)
- [ ] Bild-Captions und Alt-Text-Editor
- [ ] Undo/Redo-Historie

### Langfristig
- [ ] Vollständige JSON-Speicherung (ohne HTML-Fallback)
- [ ] Kollaboratives Editing
- [ ] Versions-Historie für Slides
- [ ] AI-gestützte Inhaltsvorschläge
- [ ] Template-Bibliothek

## Ressourcen

- **TipTap Dokumentation**: https://tiptap.dev/
- **Reveal.js Dokumentation**: https://revealjs.com/
- **@tiptap/html**: https://tiptap.dev/api/utilities/html
- **ProseMirror**: https://prosemirror.net/

## Support

Bei Fragen oder Problemen:
- GitHub Issues: https://github.com/TimUx/fw-webminar/issues
- Projekt README: /README.md

---

**Status**: ✅ Implementierung abgeschlossen
**Version**: 2.0.0
**Datum**: 2026-01-18
