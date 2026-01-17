# WYSIWYG Editor - Neue Funktionen / New Features

## 📋 Übersicht / Overview

Die folgenden Funktionen wurden zum WYSIWYG-Editor hinzugefügt:
The following features have been added to the WYSIWYG editor:

### ✅ Implementierte Funktionen / Implemented Features

1. **Bildgrößenanpassung** / Image Size Adjustment
2. **Text und Bild nebeneinander** / Text and Image Side-by-Side
3. **Mehrspaltiges Layout** / Multi-Column Layout

---

## 🖼️ 1. Bildgrößenanpassung / Image Size Adjustment

### Verwendung / Usage:

1. **Bild auswählen** / Select an image:
   - Klicken Sie auf ein Bild im Editor / Click on an image in the editor
   - Das Bild wird mit einem blauen Rahmen hervorgehoben / Image will be highlighted with a blue outline

2. **Größe anpassen** / Adjust size:
   - **S** = Klein (25% Breite) / Small (25% width)
   - **M** = Mittel (50% Breite) / Medium (50% width)
   - **L** = Groß (75% Breite) / Large (75% width)
   - **XL** = Volle Breite (100%) / Full width (100%)

### Beispiel / Example:

```
[Toolbar Buttons]
... | 🖼️ | 📊 | S | M | L | XL | ◀️ | ▶️ | ⬛ | ⬜⬜ | ⬜⬜⬜ |
```

**Hinweis:** Neu hochgeladene Bilder werden automatisch auf "Mittel" (M) gesetzt.  
**Note:** Newly uploaded images are automatically set to "Medium" (M).

---

## ↔️ 2. Text und Bild nebeneinander / Text and Image Side-by-Side

### Verwendung / Usage:

1. **Bild auswählen** / Select an image
2. **Ausrichtung wählen** / Choose alignment:
   - **◀️** = Bild links, Text rechts / Image left, text wraps right
   - **▶️** = Bild rechts, Text links / Image right, text wraps left
   - **⬛** = Textumfluss entfernen / Remove text wrap

### Visuelles Beispiel / Visual Example:

**Mit Float Left (◀️):**
```
┌─────────┐  Lorem ipsum dolor sit amet,
│  Bild   │  consectetur adipiscing elit.
│         │  Sed do eiusmod tempor
└─────────┘  incididunt ut labore et
             dolore magna aliqua.
```

**Mit Float Right (▶️):**
```
Lorem ipsum dolor sit  ┌─────────┐
amet, consectetur      │  Bild   │
adipiscing elit. Sed   │         │
do eiusmod tempor      └─────────┘
incididunt ut labore
```

---

## 📊 3. Mehrspaltiges Layout / Multi-Column Layout

### Verwendung / Usage:

1. **Cursor positionieren** / Position cursor where you want columns
2. **Layout auswählen** / Choose layout:
   - **⬜⬜** = 2-Spalten-Layout / 2-column layout
   - **⬜⬜⬜** = 3-Spalten-Layout / 3-column layout

### Beispiel / Example:

**2-Spalten-Layout:**
```
┌───────────────┬───────────────┐
│   Spalte 1    │   Spalte 2    │
│               │               │
│  Text, Bilder │  Text, Bilder │
│  Listen, etc. │  Listen, etc. │
└───────────────┴───────────────┘
```

**3-Spalten-Layout:**
```
┌──────────┬──────────┬──────────┐
│ Spalte 1 │ Spalte 2 │ Spalte 3 │
│          │          │          │
│  Inhalt  │  Inhalt  │  Inhalt  │
└──────────┴──────────┴──────────┘
```

**Hinweis:** Jede Spalte kann unabhängig bearbeitet werden und unterstützt:
- Text mit Formatierung
- Bilder
- Listen
- Links
- Tabellen

---

## 🔧 Technische Details / Technical Details

### CSS-Klassen / CSS Classes:

**Bildgrößen:**
- `.img-small` - 25% Breite
- `.img-medium` - 50% Breite (Standard)
- `.img-large` - 75% Breite
- `.img-full` - 100% Breite

**Bildausrichtung:**
- `.img-float-left` - Bild links, Text rechts
- `.img-float-right` - Bild rechts, Text links

**Spalten-Layouts:**
- `.columns-2` - Container für 2 Spalten
- `.columns-3` - Container für 3 Spalten
- `.column` - Einzelne Spalte

### Dateiänderungen / File Changes:

```
/public/assets/js/admin.js
  - Erweiterte createQuillEditor() Funktion
  - 10 neue Toolbar-Buttons
  - Bildauswahl-Tracking
  - Event Handler für alle Funktionen

/public/assets/css/admin.css
  - 100+ Zeilen neue Styles
  - Responsive Grid-Layout
  - Float-Positionierung
  - Bildauswahl-Highlighting
```

---

## 💡 Tipps / Tips

1. **Bilder kombinieren:** Sie können Bildgröße UND Float gleichzeitig verwenden  
   **Combine features:** You can use image size AND float alignment together

2. **Spalten befüllen:** Kopieren Sie Text aus Word/Google Docs direkt in Spalten  
   **Fill columns:** Copy-paste text from Word/Google Docs directly into columns

3. **Responsive:** Alle Layouts passen sich automatisch an mobile Geräte an  
   **Responsive:** All layouts automatically adapt to mobile devices

4. **Rückgängig:** Strg+Z / Cmd+Z funktioniert für alle Änderungen  
   **Undo:** Ctrl+Z / Cmd+Z works for all changes

---

## ❓ Fehlerbehebung / Troubleshooting

**Problem:** Buttons werden nicht angezeigt  
**Lösung:** Seite neu laden (F5) und Cache leeren (Strg+Shift+R)

**Problem:** Bild kann nicht ausgewählt werden  
**Lösung:** Stellen Sie sicher, dass Sie auf das Bild selbst klicken (blauer Rahmen erscheint)

**Problem:** Spalten werden nicht korrekt angezeigt  
**Lösung:** Browser auf neueste Version aktualisieren (CSS Grid erforderlich)

---

## 📞 Support

Bei Fragen oder Problemen:
- GitHub Issues: https://github.com/TimUx/fw-webminar/issues
- Pull Request: copilot/add-image-size-adjustment

---

**Version:** 1.0  
**Datum:** 2024-01-17  
**Kompatibilität:** Alle modernen Browser (Chrome, Firefox, Safari, Edge)
