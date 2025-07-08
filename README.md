# Projektplaner

Dies ist eine einfache, webbasierte Projektplanungsanwendung, die mit Flask (Python) für das Backend und reinem JavaScript für das Frontend erstellt wurde. Sie ermöglicht das Erstellen, Verwalten und Visualisieren von Projekten in einer hierarchischen Struktur.

---

## 1. Voraussetzungen

Stellen Sie sicher, dass die folgende Software auf Ihrem System installiert ist:

* **Python 3.x**
* **pip** (der Paket-Installer für Python)

## 2. Installation

Folgen Sie diesen Schritten, um das Projekt einzurichten.

### Schritt 1: Ordnerstruktur erstellen

Öffnen Sie ein Terminal (Eingabeaufforderung oder PowerShell unter Windows) und erstellen Sie die benötigte Ordnerstruktur.

**Für PowerShell:**
```powershell
mkdir projektplaner\templates, projektplaner\static\css, projektplaner\static\js, projektplaner\static\data\templates
```

**Für CMD (Eingabeaufforderung):**
```bash
mkdir projektplaner\templates && mkdir projektplaner\static\css && mkdir projektplaner\static\js && mkdir projektplaner\static\data\templates
```

### Schritt 2: Dateien erstellen und Code einfügen

Erstellen Sie die folgenden leeren Dateien in den entsprechenden Ordnern und kopieren Sie den Code aus den vorherigen Antworten in jede Datei.

* `projektplaner/app.py`
* `projektplaner/templates/base.html`
* `projektplaner/templates/dashboard.html`
* `projektplaner/templates/index.html`
* `projektplaner/templates/info.html`
* `projektplaner/templates/project_manager.html`
* `projektplaner/templates/project_overview.html`
* `projektplaner/templates/settings.html`
* `projektplaner/static/css/style.css`
* `projektplaner/static/js/main.js`
* `projektplaner/static/data/bsp.json`
* `projektplaner/static/data/templates/software.json`
* `projektplaner/static/data/templates/marketing.json`
* `projektplaner/static/data/templates/event_planning.json`
* `projektplaner/static/data/templates/book_writing.json`

### Schritt 3: Abhängigkeiten installieren

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
