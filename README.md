# Projektplaner v7

Dies ist eine einfache, webbasierte Projektplanungsanwendung, die mit Flask (Python) für das Backend und reinem JavaScript für das Frontend erstellt wurde. Sie ermöglicht das Erstellen, Verwalten und Visualisieren von Projekten in einer hierarchischen Struktur.

---

## 1. Voraussetzungen

Stellen Sie sicher, dass die folgende Software auf Ihrem System installiert ist:

* **Python 3.x**
* **pip** (der Paket-Installer für Python)
* **Git** (für die empfohlene Installationsmethode)

## 2. Installation

Sie haben zwei Möglichkeiten, das Projekt zu installieren. **Möglichkeit 1 wird empfohlen.**

### Möglichkeit 1: Von GitHub klonen (Empfohlen)

Diese Methode ist am einfachsten und schnellsten, da alle Dateien bereits vorhanden sind.

#### Schritt 1: Repository klonen

Öffnen Sie Ihr Terminal und führen Sie den folgenden Befehl aus, um das Projekt von GitHub herunterzuladen.

```bash
git clone [https://github.com/ochtii/projektplaner_v7.git](https://github.com/ochtii/projektplaner_v7.git) projektplaner_v7
```

#### Schritt 2: Verzeichnis wechseln

```bash
cd projektplaner_v7
```

#### Schritt 3: Abhängigkeiten installieren

```bash
pip install Flask
```

---

### Möglichkeit 2: Manuelle Installation

Folgen Sie diesen Schritten, wenn Sie das Projekt nicht von GitHub klonen können oder möchten.

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

Wählen Sie die passende Anleitung für Ihr Betriebssystem.

---

##### **Für Linux (Ubuntu, Debian, etc.) oder macOS**

Führen Sie die folgenden beiden Befehle nacheinander in Ihrem Terminal aus.

1.  **Ordner erstellen:**
    ```bash
    mkdir -p projektplaner_v7/templates projektplaner_v7/static/css projektplaner_v7/static/js projektplaner_v7/static/data/templates
    ```

2.  **Leere Dateien erstellen:**
    ```bash
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

---

##### **Für Windows**

Wählen Sie **eine** der folgenden Methoden: PowerShell, Eingabeaufforderung (CMD) oder eine Batch-Datei.

**Methode A: PowerShell**

Führen Sie die folgenden beiden Befehle nacheinander in PowerShell aus.

1.  **Ordner erstellen:**
    ```powershell
    mkdir projektplaner_v7\templates, projektplaner_v7\static\css, projektplaner_v7\static\js, projektplaner_v7\static\data\templates
    ```

2.  **Leere Dateien erstellen:**
    ```powershell
    $files = "app.py", "README.md", "templates\base.html", "templates\dashboard.html", "templates\index.html", "templates\info.html", "templates\login.html", "templates\project_manager.html", "templates\project_overview.html", "templates\project_checklist.html", "templates\settings.html", "static\css\style.css", "static\js\main.js", "static\js\ui.js", "static\data\bsp.json", "static\data\templates\software.json", "static\data\templates\marketing.json", "static\data\templates\event_planning.json", "static\data\templates\book_writing.json"
    foreach ($file in $files) { New-Item -ItemType File -Path "projektplaner_v7\$file" }
    ```

**Methode B: Eingabeaufforderung (CMD)**

Führen Sie die folgenden Befehle nacheinander in der Eingabeaufforderung aus.

1.  **Hauptordner erstellen und hineinwechseln:**
    ```cmd
    mkdir projektplaner_v7 && cd projektplaner_v7
    ```

2.  **Unterordner erstellen:**
    ```cmd
    mkdir templates static\css static\js static\data\templates
    ```

3.  **Leere Dateien erstellen:**
    ```cmd
    type nul > app.py && type nul > README.md && type nul > templates\base.html && type nul > templates\dashboard.html && type nul > templates\index.html && type nul > templates\info.html && type nul > templates\login.html && type nul > templates\project_manager.html && type nul > templates\project_overview.html && type nul > templates\project_checklist.html && type nul > templates\settings.html && type nul > static\css\style.css && type nul > static\js\main.js && type nul > static\js\ui.js && type nul > static\data\bsp.json && type nul > static\data\templates\software.json && type nul > static\data\templates\marketing.json && type nul > static\data\templates\event_planning.json && type nul > static\data\templates\book_writing.json
    ```

**Methode C: Batch-Datei (.bat)**

Erstellen Sie eine Datei mit dem Namen `projektplaner_v7_install.bat` und fügen Sie den folgenden Code ein. Führen Sie die Datei anschließend per Doppelklick aus.

```batch
@echo off
echo Erstelle Ordnerstruktur...
mkdir projektplaner_v7\templates
mkdir projektplaner_v7\static\css
mkdir projektplaner_v7\static\js
mkdir projektplaner_v7\static\data\templates

echo Erstelle leere Dateien...
cd projektplaner_v7
type nul > app.py
type nul > README.md
type nul > templates\base.html
type nul > templates\dashboard.html
type nul > templates\index.html
type nul > templates\info.html
type nul > templates\login.html
type nul > templates\project_manager.html
type nul > templates\project_overview.html
type nul > templates\project_checklist.html
type nul > templates\settings.html
type nul > static\css\style.css
type nul > static\js\main.js
type nul > static\js\ui.js
type nul > static\data\bsp.json
type nul > static\data\templates\software.json
type nul > static\data\templates\marketing.json
type nul > static\data\templates\event_planning.json
type nul > static\data\templates\book_writing.json
cd ..
echo Fertig!
pause
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

Unabhängig von der Installationsmethode, führen Sie die Hauptanwendungsdatei aus dem `projektplaner_v7`-Verzeichnis aus. Der Befehl startet einen lokalen Webserver, der für die Entwicklung gedacht ist.

```bash
python app.py
```

Sie sollten eine Ausgabe sehen, die in etwa so aussieht. Die URL ist die Adresse, unter der Sie die Anwendung in Ihrem Browser aufrufen können.

```
 * Running on [http://127.0.0.1:5000/](http://127.0.0.1:5000/) (Press CTRL+C to quit)
 * Restarting with stat
 * Debugger is active!
```

## 4. Anwendung nutzen

Öffnen Sie einen Webbrowser und navigieren Sie zu der folgenden Adresse:

[http://127.0.0.1:5000/](http://127.0.0.1:5000/)

Sie sollten nun die Startseite der Projektplaner-Anwendung sehen.
