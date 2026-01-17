# Webinar Platform - Self-Hosted E-Learning System

Eine vollständig selbst gehostete, automatisierte Webinar- und E-Learning-Plattform mit Präsentationen, automatischer Sprachausgabe und Quiz-System.

## Features

✨ **Vollständig selbst gehostet** - Keine externen Abhängigkeiten  
🐳 **Docker-basiert** - Einfache Bereitstellung mit Docker Compose  
🔒 **Sicher** - JWT-Authentifizierung, bcrypt-Passwort-Hashing, Rate Limiting  
📊 **Admin-Panel** - Vollständige Verwaltung von Webinaren, PPTX/PDF, Quiz und Ergebnissen  
🎯 **Quiz-System** - Multiple-Choice-Tests mit automatischer Bewertung  
📧 **E-Mail-Benachrichtigungen** - Automatischer Versand von Ergebnissen  
🗣️ **Sprachausgabe** - Verbesserte Text-to-Speech mit Stimmauswahl und Geschwindigkeitsregelung  
🎨 **Modernes Design** - Basierend auf fw-fragenkatalog Design  
📱 **Responsive** - Funktioniert auf Desktop, Tablet und Mobile  
🌐 **Deutsch** - Vollständig auf Deutsch lokalisiert  
📄 **PDF & PPTX Support** - Import von PDF- und PowerPoint-Präsentationen  

## Tech Stack

- **Backend**: Node.js mit Express
- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Präsentation**: Reveal.js
- **Authentifizierung**: JWT + bcrypt
- **E-Mail**: Nodemailer (SMTP)
- **Reverse Proxy**: Caddy
- **PPTX/PDF-Konvertierung**: LibreOffice (optional), pdftoppm für PDF
- **Speicher**: Dateibasiert (JSON)
- **Container**: Docker & Docker Compose

## Schnellstart

### Voraussetzungen

- Docker & Docker Compose installiert
- Mindestens 1GB RAM
- Port 80 und 443 verfügbar

### Installation

1. **Repository klonen**
```bash
git clone https://github.com/TimUx/fw-webminar.git
cd fw-webminar
```

2. **Umgebungsvariablen konfigurieren**
```bash
cp .env.example .env
# .env bearbeiten und JWT_SECRET ändern
# Optional: PUID und PGID anpassen (Standard: 1000)
```

3. **Verzeichnisse erstellen und Berechtigungen setzen**
```bash
mkdir -p data uploads slides assets
# Optional: Berechtigungen für den konfigurierten Benutzer setzen
# sudo chown -R $PUID:$PGID data uploads slides assets
```

4. **Starten**
```bash
docker-compose up -d
```

5. **Zugriff**
- Webinar-Frontend: http://localhost
- Admin-Panel: http://localhost/admin/

### Erstes Login

1. Öffnen Sie http://localhost/admin/login.html
2. Benutzername: `admin`
3. Passwort: Beliebiges Passwort (wird beim ersten Login gesetzt)

Das erste eingegebene Passwort wird zum Admin-Passwort.

## Konfiguration

### Benutzer- und Gruppen-IDs (UID/GID)

Alle Container können mit spezifischen Benutzer- und Gruppen-IDs ausgeführt werden. Dies ist besonders wichtig für korrekte Dateiberechtigungen auf dem Host-System.

1. `.env` Datei bearbeiten:
```bash
# User/Group IDs für Container-Prozesse
PUID=1000
PGID=1000
```

2. UID/GID des aktuellen Benutzers ermitteln (optional):
```bash
id -u  # Zeigt UID
id -g  # Zeigt GID
```

3. Container neu starten, damit Änderungen wirksam werden:
```bash
docker-compose down
docker-compose up -d
```

**Hinweis:** Die Standardwerte sind PUID=1000 und PGID=1000. Dies funktioniert für die meisten Benutzer. Wenn Sie Probleme mit Dateiberechtigungen haben, passen Sie diese Werte entsprechend Ihrem System an.

### SMTP E-Mail

1. Im Admin-Panel zu "E-Mail (SMTP)" navigieren
2. SMTP-Server-Details eingeben:
   - Host: z.B. `smtp.gmail.com`
   - Port: `587` (TLS) oder `465` (SSL)
   - Benutzername: Ihre E-Mail-Adresse
   - Passwort: Ihr E-Mail-Passwort oder App-Passwort
   - Absender E-Mail: E-Mail-Adresse für ausgehende Nachrichten

3. Test-E-Mail senden zur Überprüfung

### Header und Logo anpassen

1. Im Admin-Panel zu "Einstellungen" navigieren
2. Header-Titel eingeben
3. Logo hochladen (PNG, JPG, SVG)
4. Speichern

### Caddy für HTTPS konfigurieren

Für Produktion mit HTTPS:

1. `Caddyfile` bearbeiten:
```
your-domain.com {
    reverse_proxy backend:3000
    encode gzip zstd
    
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}
```

2. Container neu starten:
```bash
docker-compose restart caddy
```

Caddy richtet automatisch Let's Encrypt HTTPS ein.

## Webinar erstellen

### Methode 1: Manuelle Slides

1. Im Admin-Panel zu "Webinare" navigieren
2. "Neues Webinar erstellen" klicken
3. Titel eingeben
4. Folien hinzufügen:
   - Titel
   - Inhalt (HTML erlaubt)
   - Sprechernotiz (für automatische Sprachausgabe)
5. Quiz-Fragen hinzufügen:
   - Frage
   - 4 Antwortmöglichkeiten
   - Richtige Antwort markieren
6. Speichern

### Methode 2: PPTX/PDF-Upload (optional)

1. Präsentationsdatei (PPTX oder PDF) im Bereich "Präsentationen" hochladen
2. Bei Webinar-Erstellung Präsentationsdatei auswählen
3. System konvertiert automatisch:
   - **PDF**: Seiten werden als Bilder extrahiert (mit pdftoppm) und in `uploads/` gespeichert
   - **PPTX**: Bilder und Grafiken werden extrahiert und in `uploads/` gespeichert
   - Alle extrahierten Bilder werden automatisch den entsprechenden Folien zugeordnet
   - **Intelligente Filterung**: Wiederkehrende Inhalte (Kopf-/Fußzeilen, Logos, Seitenzahlen, Datumsangaben) werden automatisch erkannt und entfernt
   - Bei fehlenden Tools (pdftoppm): Fallback auf Textextraktion

#### Automatische Filterung von wiederkehrenden Inhalten

Das System erkennt und entfernt automatisch:
- **Kopf- und Fußzeilen**: Text, der auf mehreren Folien/Seiten wiederholt wird
- **Logos und Hintergrundbilder**: Bilder, die auf den meisten Folien erscheinen
- **Seitenzahlen**: Muster wie "Seite 1", "Page 2", "1/10", reine Zahlen
- **Datumsangaben**: Verschiedene Datumsformate (01.01.2024, 12/31/2024)
- **Copyright-Hinweise**: z.B. "© 2024"
- **Firmen-/Organisationsnamen**: Die auf allen Folien erscheinen

Die Filterung erfolgt intelligent:
- Nur Inhalte, die auf mindestens 60% der Folien vorkommen, werden als repetitiv erkannt
- Für bekannte Muster (Seitenzahlen, Datum) gilt eine niedrigere Schwelle von 30%
- Themenspezifische Inhalte (Titel, Texte, Listen, Tabellen, Grafiken) bleiben erhalten

## Sprachausgabe-Einstellungen

Die Webinar-Plattform bietet eine verbesserte Text-to-Speech-Funktion für eine natürlichere und angenehmere Sprachausgabe.

### Funktionen

- **Automatische Stimmauswahl**: Das System wählt automatisch die beste verfügbare deutsche Stimme aus
- **Manuelle Stimmauswahl**: Benutzer können aus allen verfügbaren deutschen Stimmen ihres Systems wählen
- **Geschwindigkeitsregelung**: Passen Sie die Sprechgeschwindigkeit zwischen 0.5x (langsam) und 1.2x (schnell) an
- **Intelligente Pausierung**: Automatische Pausen zwischen Sätzen für bessere Verständlichkeit
- **Natürlicher Klang**: Optimierte Sprachparameter für menschlichere Aussprache

### Verwendung

1. Starten Sie ein Webinar mit Sprechernotizen
2. Die Sprachausgabe beginnt automatisch bei jeder Folie
3. Passen Sie die **Stimme** über das Dropdown-Menü an
4. Regeln Sie die **Geschwindigkeit** mit dem Schieberegler
5. Änderungen werden sofort auf die aktuelle Sprachausgabe angewendet

### Tipps für beste Qualität

- **Sprechernotizen**: Schreiben Sie klare, vollständige Sätze
- **Interpunktion**: Verwenden Sie Punkte, Kommas und Semikolons für natürliche Pausen
- **Länge**: Halten Sie Notizen übersichtlich (empfohlen: 2-4 Sätze pro Folie)
- **Geschwindigkeit**: Beginnen Sie mit 0.85x für optimales Verständnis
- **Stimme**: Testen Sie verschiedene Stimmen, um die angenehmste zu finden

### Technische Details

- Verwendet die Web Speech API des Browsers
- Keine externen Dienste erforderlich (vollständig selbst gehostet)
- Funktioniert mit allen Browsern, die SpeechSynthesis unterstützen
- Automatische Fehlerbehandlung bei Sprachproblemen

## Dateistruktur

```
fw-webminar/
├── backend/              # Node.js Backend
│   ├── routes/          # API-Routen
│   ├── services/        # Business-Logik
│   ├── middleware/      # Express-Middleware
│   ├── utils/           # Hilfsfunktionen
│   └── server.js        # Haupt-Server
├── public/              # Frontend
│   ├── admin/           # Admin-Panel
│   ├── webinar/         # Öffentliche Webinar-Seite
│   └── assets/          # CSS, JS, Bilder
├── data/                # JSON-Dateispeicher
│   ├── users.json
│   ├── settings.json
│   ├── smtp.json
│   ├── webinars.json
│   ├── results.json
│   └── audit.log
├── uploads/             # Hochgeladene PPTX/PDF und extrahierte Bilder
│   ├── file.pptx        # Hochgeladene Präsentationsdateien
│   └── webinar-id/      # Extrahierte Bilder pro Webinar
├── slides/              # Generierte Präsentationen (HTML)
├── assets/              # Logos, Theme-Bilder
├── docker-compose.yml   # Docker-Konfiguration
├── Dockerfile           # Backend-Container
├── Caddyfile           # Caddy-Konfiguration
└── README.md
```

## API-Endpunkte

### Authentifizierung
- `POST /api/auth/login` - Admin-Login
- `POST /api/auth/setup` - Initiales Passwort setzen

### Admin (authentifiziert)
- `GET/PUT /api/admin/settings` - Einstellungen
- `POST /api/admin/settings/logo` - Logo hochladen
- `GET/PUT /api/admin/smtp` - SMTP-Konfiguration
- `POST /api/admin/smtp/test` - Test-E-Mail
- `GET /api/admin/pptx` - PPTX-Liste
- `POST /api/admin/pptx/upload` - PPTX hochladen
- `DELETE /api/admin/pptx/:filename` - PPTX löschen
- `GET/POST/PUT/DELETE /api/admin/webinars` - Webinar-Verwaltung
- `GET /api/admin/results` - Ergebnisse abrufen
- `GET /api/admin/results/export` - CSV-Export

### Öffentlich
- `GET /api/webinar/settings` - Öffentliche Einstellungen
- `GET /api/webinar/list` - Webinar-Liste
- `GET /api/webinar/:id` - Webinar-Details
- `POST /api/webinar/:id/submit` - Quiz-Ergebnis einreichen

## Sicherheit

- ✅ JWT-Token-Authentifizierung
- ✅ bcrypt-Passwort-Hashing (10 Runden)
- ✅ Rate Limiting (100 Anfragen/15 Min)
- ✅ Helmet.js Security Headers
- ✅ Input-Validierung
- ✅ Datei-Upload-Validierung
- ✅ CSRF-Schutz durch SameSite-Cookies
- ✅ Audit-Logging

## Datensicherung

Wichtige Daten liegen in:
- `./data/` - Alle JSON-Dateien
- `./uploads/` - Hochgeladene PPTX/PDF und extrahierte Bilder
- `./slides/` - Generierte Präsentationen
- `./assets/` - Logos und Assets

Backup-Befehl:
```bash
tar -czf backup-$(date +%Y%m%d).tar.gz data/ uploads/ slides/ assets/
```

## Updates durchführen

Nach einem `git pull` müssen die Docker-Container neu gebaut werden, um Code-Änderungen zu laden:

```bash
# Container stoppen
docker compose down

# Code aktualisieren
git pull

# Container mit neuem Code bauen und starten
docker compose up -d --build

# Oder falls Probleme auftreten, zuerst die Images löschen:
docker compose down
docker compose build --no-cache
docker compose up -d
```

**Wichtig**: Der Browser cached JavaScript- und CSS-Dateien. Nach einem Update:
1. Browser-Cache leeren (Strg+Shift+R oder Strg+F5)
2. Oder im Browser-DevTools "Disable cache" aktivieren
3. Die Anwendung nutzt automatisches Cache-Busting mit Versions-Parametern

**Hinweis für Entwickler**: Die Cache-Busting-Version ist aktuell manuell in HTML-Dateien gesetzt. Bei Änderungen an JS/CSS-Dateien sollte die Version aktualisiert werden, um Browser-Cache-Probleme zu vermeiden.

## Fehlerbehebung

### Häufige Docker-Warnungen

**"version attribute is obsolete"**:
- Falls diese Warnung erscheint, verwenden Sie eine veraltete Version der docker-compose.yml
- Die aktuelle Version enthält kein `version`-Attribut mehr (wurde in Docker Compose v2 entfernt)
- Aktualisieren Sie Ihre Dateien mit `git pull`

**Caddy-Formatierungswarnungen**:
- Caddy erwartet Tab-Einrückung im Caddyfile (nicht Leerzeichen)
- Die aktuelle Version ist bereits korrekt formatiert
- Bei Änderungen am Caddyfile: Verwenden Sie Tabs für Einrückungen

**Caddy-Berechtigungsfehler** ("/config/caddy/autosave.json: permission denied"):
- Tritt auf, wenn Caddy mit falschen Benutzerrechten läuft
- Die aktuelle Konfiguration läuft mit Standard-Caddy-Benutzer (hat die richtigen Berechtigungen)
- Ändern Sie nicht das `user`-Attribut im Caddy-Service

### Container starten nicht
```bash
docker-compose logs -f
```

### LibreOffice-Warnungen (optional)

Wenn der LibreOffice-Container aktiviert ist, können folgende Warnungen auftreten:

**XKEYBOARD-Warnungen** (z.B. "Could not resolve keysym XF86OK"):
- Diese Warnungen sind **harmlos** und beeinträchtigen die Funktionalität nicht
- Sie treten auf, weil der X11-Server im Container einige spezielle Tastenzuordnungen nicht kennt
- Die PPTX-Konvertierung funktioniert trotz dieser Meldungen einwandfrei
- Diese Warnungen können ignoriert werden

**xsettingsd-Verbindungsfehler**:
- Ebenfalls harmlos; der Container startet trotzdem korrekt
- Tritt während der Initialisierungsphase auf

### Admin-Passwort zurücksetzen
```bash
# users.json bearbeiten und passwordHash löschen
# Beim nächsten Login wird neues Passwort gesetzt
```

### SMTP funktioniert nicht
- SMTP-Zugangsdaten überprüfen
- Firewall-Regeln überprüfen (Port 587/465)
- Test-E-Mail im Admin-Panel senden
- Bei Gmail: App-Passwort verwenden

### LibreOffice-Konvertierung fehlschlägt
- LibreOffice-Container in docker-compose.yml aktivieren
- Alternative: Manuelle Slides verwenden

## Entwicklung

### Lokale Entwicklung ohne Docker

1. Dependencies installieren:
```bash
npm install
```

2. Umgebungsvariablen setzen:
```bash
cp .env.example .env
```

3. Development-Server starten:
```bash
npm run dev
```

4. Zugriff auf http://localhost:3000

### Logs anzeigen
```bash
docker-compose logs -f backend
```

### Container neu starten
```bash
docker-compose restart
```

## Lizenz

MIT License

## Support

Bei Fragen oder Problemen:
- GitHub Issues: https://github.com/TimUx/fw-webminar/issues

## Mitwirken

Pull Requests sind willkommen!

## Credits

Design basiert auf: https://github.com/TimUx/fw-fragenkatalog

## Changelog

### Version 1.2.0 (2026)
- **Intelligente Filterung von wiederkehrenden Inhalten**
  - Automatische Erkennung von Kopf- und Fußzeilen in PPTX/PDF
  - Entfernung von wiederkehrenden Logos und Hintergrundbildern
  - Filterung von Seitenzahlen, Datumsangaben und Copyright-Hinweisen
  - Erkennung von Firmen-/Organisationsnamen auf allen Folien
  - Konfigurierbare Erkennungsschwellen (60% für allgemeine Inhalte, 30% für bekannte Muster)
  - Erhaltung aller themenspezifischen Inhalte (Titel, Texte, Listen, Tabellen, Grafiken)

### Version 1.1.0 (2026)
- **Verbesserte Sprachausgabe**
  - Intelligente Auswahl der besten deutschen Stimme
  - Benutzer-Kontrollen für Stimmauswahl
  - Geschwindigkeitsregelung (0.5x - 1.2x)
  - Natürlichere Sprachausgabe durch Text-Chunking
  - Automatische Pausen zwischen Sätzen
  - Optimierte Standard-Sprechgeschwindigkeit (0.85x)
  - Fehlerbehandlung und Wiederholungslogik

### Version 1.0.0 (2024)
- Initiales Release
- Admin-Panel
- Webinar-Verwaltung
- Quiz-System
- E-Mail-Benachrichtigungen
- Sprachausgabe
- Docker-Deployment