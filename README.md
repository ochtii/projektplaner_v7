# Projektplaner v7

Dies ist eine einfache, webbasierte Projektplanungsanwendung, die mit Flask (Python) für das Backend und reinem JavaScript für das Frontend erstellt wurde. Sie ermöglicht das Erstellen, Verwalten und Visualisieren von Projekten in einer hierarchischen Struktur.

---

## 1. Voraussetzungen

Stellen Sie sicher, dass die folgende Software auf Ihrem System installiert ist:

* **Python 3.x**
* **pip** (der Paket-Installer für Python)
* **Git** (für die empfohlene Installationsmethode)

## 2. Installation

Sie haben zwei Möglichkeiten, das Projekt zu installieren. Die Installation via Git wird empfohlen.

### Möglichkeit 1: Von GitHub klonen (Empfohlen)

#### Schritt 1: Repository klonen

Öffnen Sie Ihr Terminal und führen Sie den folgenden Befehl aus, um das Projekt von GitHub herunterzuladen.

```bash
git clone [https://github.com/ochtii/projektplaner_v7.git](https://github.com/ochtii/projektplaner_v7.git) projektplaner_v7
```

#### Schritt 2: Abhängigkeiten installieren

Navigieren Sie in das neu erstellte Verzeichnis und installieren Sie die notwendigen Pakete.

```bash
cd projektplaner_v7
pip install Flask
```

---

### Möglichkeit 2: Manuelle Installation

Folgen Sie diesen Schritten, um das Projekt manuell einzurichten.

#### Schritt 1: Ordnerstruktur

Die Anwendung verwendet die folgende Ordnerstruktur:

```
/projektplaner_v7/
|
├── app.py                   # Flask-Anwendung (Backend)
|
├── static/                  # Statische Dateien (CSS, JS, Daten)
|   ├── css/style.css        # Stylesheets
|   ├── js/                  # Frontend-Logik
|   |   ├── main.js
|   |   └── ui.js
|   └── data/
|       ├── bsp.json         # Datenbank-Datei (wird zur Laufzeit erstellt/gelesen)
|       └── templates/       # Projekt-Vorlagen (*.json)
|
└── templates/               # HTML-Vorlagen für Flask
    ├── base.html
    ├── dashboard.html
    ├── index.html
    ├── info.html
    ├── login.html
    ├── project_checklist.html
    ├── project_manager.html
    ├── project_overview.html
    └── settings.html
```

#### Schritt 2: Ordner- und Dateistruktur erstellen

Öffnen Sie ein Terminal und verwenden Sie den für Ihr Betriebssystem passenden Befehl, um die gesamte Ordner- und Dateistruktur auf einmal zu erstellen.

**Für Linux (Ubuntu, Debian, etc.) oder macOS:**
```bash
# Ordner erstellen
mkdir -p projektplaner_v7/templates projektplaner_v7/static/css projektplaner_v7/static/js projektplaner_v7/static/data/templates

# Leere Dateien erstellen
touch projektplaner_v7/app.py \
      projektplaner_v7/README.md \
      projektplaner_v7/templates/base.html \
      projektplaner_v7/templates/dashboard.html \
      projektplaner_v7/templates/index.html \
      projektplaner_v7/templates/info.html \
      projektplaner_v7/templates/login.html \
      projektplaner_v7/templates/project_manager.html \
      projektplaner_v7/templates/project_overview.html \
      projektplaner_v7/templates/project_checklist.html \
      projektplaner_v7/templates/settings.html \
      projektplaner_v7/static/css/style.css \
      projektplaner_v7/static/js/main.js \
      projektplaner_v7/static/js/ui.js \
      projektplaner_v7/static/data/bsp.json \
      projektplaner_v7/static/data/templates/software.json \
      projektplaner_v7/static/data/templates/marketing.json \
      projektplaner_v7/static/data/templates/event_planning.json \
      projektplaner_v7/static/data/templates/book_writing.json
```

**Für Windows (PowerShell):**
```powershell
# Ordner erstellen
mkdir projektplaner_v7\templates, projektplaner_v7\static\css, projektplaner_v7\static\js, projektplaner_v7\static\data\templates

# Leere Dateien erstellen
$files = "app.py", "README.md", "templates\base.html", "templates\dashboard.html", "templates\index.html", "templates\info.html", "templates\login.html", "templates\project_manager.html", "templates\project_overview.html", "templates\project_checklist.html", "templates\settings.html", "static\css\style.css", "static\js\main.js", "static\js\ui.js", "static\data\bsp.json", "static\data\templates\software.json", "static\data\templates\marketing.json", "static\data\templates\event_planning.json", "static\data\templates\book_writing.json"
foreach ($file in $files) { New-Item -ItemType File -Path "projektplaner_v7\$file" }
```

**Für Windows (CMD):**
```cmd
:: Ordner erstellen
mkdir projektplaner_v7\templates && mkdir projektplaner_v7\static\css && mkdir projektplaner_v7\static\js && mkdir projektplaner_v7\static\data\templates

:: Leere Dateien erstellen
cd projektplaner_v7
type nul > app.py
type nul > README.md
cd templates
type nul > base.html && type nul > dashboard.html && type nul > index.html && type nul > info.html && type nul > login.html && type nul > project_manager.html && type nul > project_overview.html && type nul > project_checklist.html && type nul > settings.html
cd ..\static\css
type nul > style.css
cd ..\js
type nul > main.js && type nul > ui.js
cd ..\data
type nul > bsp.json
cd templates
type nul > software.json && type nul > marketing.json && type nul > event_planning.json && type nul > book_writing.json
cd ..\..\..
```

#### Schritt 3: Code einfügen

Kopieren Sie den Code aus den bereitgestellten Canvas-Dokumenten in die jeweilige leere Datei.

#### Schritt 4: Abhängigkeiten installieren

Navigieren Sie im Terminal in das Verzeichnis `projektplaner_v7` und installieren Sie die erforderliche Flask-Bibliothek direkt:

```bash
cd projektplaner_v7
pip install Flask
```

---

## 3. Anwendung starten

Unabhängig von der Installationsmethode, führen Sie die Hauptanwendungsdatei aus dem `projektplaner_v7`-Verzeichnis aus, um den lokalen Entwicklungsserver zu starten:

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
