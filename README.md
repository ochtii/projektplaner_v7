# Projektplaner

Dies ist eine einfache, webbasierte Projektplanungsanwendung, die mit Flask (Python) für das Backend und reinem JavaScript für das Frontend erstellt wurde. Sie ermöglicht das Erstellen, Verwalten und Visualisieren von Projekten in einer hierarchischen Struktur.

---

## 1. Voraussetzungen

Stellen Sie sicher, dass die folgende Software auf Ihrem System installiert ist:

* **Python 3.x**
* **pip** (der Paket-Installer für Python)

## 2. Installation

Folgen Sie diesen Schritten, um das Projekt einzurichten.

### Schritt 1: Ordnerstruktur

Die Anwendung verwendet die folgende Ordnerstruktur:

```
/projektplaner/
|
├── app.py                   # Flask-Anwendung (Backend)
|
├── static/                  # Statische Dateien (CSS, JS, Daten)
|   ├── css/style.css        # Stylesheets
|   ├── js/main.js           # Frontend-Logik
|   └── data/
|       ├── bsp.json         # Datenbank-Datei (wird zur Laufzeit erstellt/gelesen)
|       └── templates/       # Projekt-Vorlagen (*.json)
|
└── templates/               # HTML-Vorlagen für Flask
    ├── base.html
    ├── dashboard.html
    └── ... (weitere .html Dateien)
```

-   **`app.py`**: Das Herz der Anwendung, enthält die gesamte Backend-Logik und die Routen.
-   **`static/`**: Enthält alle Dateien, die direkt an den Browser gesendet werden.
    -   **`css/`**: Enthält die Stylesheet-Dateien.
    -   **`js/`**: Enthält die JavaScript-Dateien für die Frontend-Logik.
    -   **`data/`**: Dient als Speicher für die JSON-basierte "Datenbank" und die Projektvorlagen.
-   **`templates/`**: Enthält die HTML-Dateien, die von Flask gerendert werden.

### Schritt 2: Ordnerstruktur erstellen

Öffnen Sie ein Terminal und verwenden Sie den für Ihr Betriebssystem passenden Befehl, um die gesamte Ordnerstruktur auf einmal zu erstellen.

**Für Linux (Ubuntu, Debian, etc.) oder macOS:**
```bash
mkdir -p projektplaner/templates projektplaner/static/css projektplaner/static/js projektplaner/static/data/templates
```

**Für Windows (PowerShell):**
```powershell
mkdir projektplaner\templates, projektplaner\static\css, projektplaner\static\js, projektplaner\static\data\templates
```

**Für Windows (CMD):**
```cmd
mkdir projektplaner\templates && mkdir projektplaner\static\css && mkdir projektplaner\static\js && mkdir projektplaner\static\data\templates
```

### Schritt 3: Dateien erstellen und Code einfügen

Erstellen Sie die leeren Dateien gemäß der oben gezeigten Struktur und kopieren Sie den Code aus den bereitgestellten Canvas-Dokumenten in die jeweilige Datei.

### Schritt 4: Abhängigkeiten installieren

Navigieren Sie im Terminal in das Hauptverzeichnis des Projekts (`projektplaner`) und installieren Sie die erforderliche Flask-Bibliothek:

```bash
cd projektplaner
pip install Flask
```

## 3. Anwendung starten

Führen Sie die Hauptanwendungsdatei aus, um den lokalen Entwicklungsserver zu starten:

```bash
python app.py
```

Sie sollten eine Ausgabe sehen, die in etwa so aussieht:
```
 * Running on [http://127.0.0.1:5000/](http://127.0.0.1:5000/) (Press CTRL+C to quit)
 * Restarting with stat
 * Debugger is active!
```

## 4. Anwendung nutzen

Öffnen Sie einen Webbrowser und navigieren Sie zu der folgenden Adresse:

[http://127.0.0.1:5000/](http://127.0.0.1:5000/)

Sie sollten nun die Startseite der Projektplaner-Anwendung sehen.
