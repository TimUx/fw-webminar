# TipTap Editor - Benutzerhandbuch

## Neue Layout-Features

### 1. 2-Spalten-Layout ⬜⬜

**Verwendung:**
1. Klicken Sie auf den Button **⬜⬜** in der Toolbar
2. Ein 2-Spalten-Layout wird eingefügt
3. Klicken Sie in jede Spalte, um Inhalte hinzuzufügen
4. Jede Spalte unterstützt: Text, Bilder, Listen, Tabellen

**Anwendungsfälle:**
- Vergleiche (Vorher/Nachher)
- Pro/Contra-Listen
- Text neben Bild
- Feature-Übersichten

**Draggable:**
- Hover über das Layout → Griff-Symbol erscheint
- Klicken und ziehen zum Verschieben

### 2. 3-Spalten-Layout ⬜⬜⬜

**Verwendung:**
1. Klicken Sie auf den Button **⬜⬜⬜** in der Toolbar
2. Ein 3-Spalten-Layout wird eingefügt
3. Ideal für Feature-Vergleiche oder Schritt-für-Schritt-Anleitungen

**Anwendungsfälle:**
- Feature-Vergleiche (Basis/Standard/Premium)
- Schritt-für-Schritt-Prozesse
- Team-Vorstellungen mit Bildern
- Drei-Punkte-Argumentation

**Mobile Ansicht:**
- Spalten werden automatisch untereinander angezeigt

### 3. Hero-Slide 🎯

**Verwendung:**
1. Klicken Sie auf den Button **🎯** in der Toolbar
2. Eine Hero-Slide mit großem Titel und Untertitel wird eingefügt
3. Bearbeiten Sie Titel und Untertitel direkt

**Eigenschaften:**
- Großer, auffälliger Titel (3em)
- Untertitel mit reduzierter Opacity
- Gradient-Hintergrund (lila/violett)
- Zentrierte Ausrichtung
- Perfekt für Eröffnungs- und Abschluss-Slides

**Anwendungsfälle:**
- Webinar-Eröffnung
- Kapitel-Trenner
- Call-to-Action
- Abschluss-Slide

## Bestehende Features

### Textformatierung
- **Fett** (Strg/Cmd + B)
- *Kursiv* (Strg/Cmd + I)
- <u>Unterstrichen</u> (Strg/Cmd + U)
- ~~Durchgestrichen~~

### Überschriften
- H2, H3, H4 für verschiedene Hierarchiestufen
- Verwenden Sie H2 für Slide-Titel
- H3 für Untertitel
- H4 für kleinere Abschnitte

### Listen
- Aufzählungsliste (•)
- Nummerierte Liste (1., 2., 3.)

### Bilder
1. **Upload**: Klicken Sie auf 🖼️
2. **Größe anpassen**:
   - S = 25% Breite
   - M = 50% Breite (Standard)
   - L = 75% Breite
   - XL = 100% Breite
3. **Position**:
   - ◀️ = Bild links, Text fließt rechts
   - ▶️ = Bild rechts, Text fließt links
   - ⬛ = Normal (kein Text-Wrap)

### Tabellen
- Klicken Sie auf 📊 zum Einfügen
- Standard: 3x3 mit Header-Zeile
- Größenänderbar durch Ziehen
- Header-Zeile hat blauen Hintergrund

### Links
- Klicken Sie auf 🔗
- URL eingeben
- Links öffnen in neuem Tab

## Tipps & Best Practices

### Slide-Gestaltung
✅ **Kurz und prägnant**: Maximal 5-7 Bullet Points pro Slide
✅ **Visuelle Hierarchie**: Nutzen Sie Überschriften-Stufen
✅ **Bilder verwenden**: Ein Bild sagt mehr als 1000 Worte
✅ **Spalten für Struktur**: Organisieren Sie komplexe Inhalte
✅ **Hero-Slides sparsam**: Nur für wichtige Meilensteine

### Layout-Kombinationen

**Text + Bild (2-Spalten):**
```
┌────────────────┬────────────────┐
│ Text:          │ [Bild]         │
│ • Punkt 1      │                │
│ • Punkt 2      │                │
│ • Punkt 3      │                │
└────────────────┴────────────────┘
```

**Feature-Vergleich (3-Spalten):**
```
┌──────────┬──────────┬──────────┐
│ Feature A │ Feature B │ Feature C │
│ --------- │ --------- │ --------- │
│ Text...   │ Text...   │ Text...   │
└──────────┴──────────┴──────────┘
```

**Hero + Content-Slides:**
```
1. Hero-Slide (Eröffnung)
2. 3-Spalten (Übersicht)
3. 2-Spalten (Details)
4. Hero-Slide (Abschluss)
```

### Häufige Fehler vermeiden

❌ **Zu viel Text**: Slides sind Gedächtnisstützen, keine Essays
❌ **Zu kleine Bilder**: Verwenden Sie mindestens "M" (50%)
❌ **Zu viele Spalten**: Bei mobilen Geräten werden sie untereinander angezeigt
❌ **Inkonsistente Formatierung**: Nutzen Sie einheitliche Überschriften-Stufen

### Keyboard-Shortcuts

- **Strg/Cmd + B**: Fett
- **Strg/Cmd + I**: Kursiv
- **Strg/Cmd + U**: Unterstrichen
- **Strg/Cmd + Z**: Rückgängig
- **Strg/Cmd + Shift + Z**: Wiederholen

## Workflow-Empfehlung

### Neue Slide erstellen
1. **Titel setzen**: Kurz und prägnant
2. **Layout wählen**: Standard, 2-Spalten, 3-Spalten, oder Hero
3. **Inhalt hinzufügen**: Text, Bilder, Listen
4. **Sprechernotiz**: Für automatische Sprachausgabe
5. **Speichern**: Webinar speichern

### PPTX importieren
1. **Upload**: PPTX/PDF hochladen unter "Import"
2. **Webinar erstellen**: Datei auswählen bei Webinar-Erstellung
3. **Automatisch**: Slides werden als TipTap JSON generiert
4. **Nachbearbeiten**: Layouts und Formatierung anpassen

### Webinar präsentieren
1. **Webinar öffnen**: "Anzeigen" im Admin-Panel
2. **Reveal.js**: Vollständige Präsentation mit Navigation
3. **Keyboard**: Pfeiltasten für Navigation
4. **Speaker-Notes**: Automatische Sprachausgabe

## Troubleshooting

### Problem: Editor lädt nicht
**Lösung**: Seite neu laden (F5), Cache leeren (Strg+Shift+R)

### Problem: Bilder werden nicht angezeigt
**Lösung**: 
- Prüfen Sie die Dateigröße (max. 5MB)
- Unterstützte Formate: JPG, PNG, GIF, WEBP, SVG

### Problem: Layout wird nicht gespeichert
**Lösung**:
- Warten Sie, bis der Editor vollständig geladen ist
- Klicken Sie "Speichern" im Formular

### Problem: PPTX-Import funktioniert nicht
**Lösung**:
- Prüfen Sie das Dateiformat (.pptx, .ppt, .pdf)
- Max. Dateigröße: 50MB
- Komplexe Animationen werden nicht unterstützt

## Support

Bei weiteren Fragen:
- **GitHub Issues**: https://github.com/TimUx/fw-webminar/issues
- **Dokumentation**: TIPTAP_IMPLEMENTATION.md
- **README**: README.md

---

**Version**: 2.0.0
**Letzte Aktualisierung**: 2026-01-18
