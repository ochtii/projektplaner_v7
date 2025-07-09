import os
import json
from datetime import datetime

# --- Konfiguration ---
# Das Skript wird im Verzeichnis ausgeführt, in dem es sich befindet.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Verzeichnisse, die bei der Analyse ignoriert werden sollen.
IGNORED_DIRS = {'__pycache__', '.git', '.vscode', 'venv', 'structure_backup'}
# Dateinamen für die JSON-Ausgaben
STRUCTURE_OUTPUT_FILE = 'project_structure.json'
JSON_PROFILE_OUTPUT_FILE = 'project_json.json'

# --- Globale Zähler ---
stats = {
    "folder_count": 0,
    "file_count": 0,
    "file_types": {},
    "json_analysis": []
}

def print_log(message, indent=0):
    """Gibt eine formatierte Log-Nachricht auf der Konsole aus."""
    print('  ' * indent + message)

def analyze_json_content(filepath):
    """Analysiert den Inhalt einer einzelnen JSON-Datei."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        key_count = 0
        max_depth = 0

        def traverse(node, depth):
            """Durchläuft rekursiv die JSON-Struktur, um Schlüssel zu zählen und die Tiefe zu messen."""
            nonlocal key_count, max_depth
            max_depth = max(max_depth, depth)
            if isinstance(node, dict):
                for key, value in node.items():
                    key_count += 1
                    traverse(value, depth + 1)
            elif isinstance(node, list):
                for item in node:
                    traverse(item, depth + 1)

        traverse(data, 1)
        
        return {
            "path": os.path.relpath(filepath, BASE_DIR).replace('\\', '/'),
            "keys": key_count,
            "max_depth": max_depth
        }
    except (json.JSONDecodeError, IOError) as e:
        print_log(f"[FEHLER] Konnte JSON-Datei nicht analysieren: {os.path.relpath(filepath, BASE_DIR)} - {e}", 1)
        return None

def get_structure_dict(path):
    """
    Durchläuft rekursiv einen Pfad und erstellt ein Dictionary, das die Struktur repräsentiert.
    """
    base_name = os.path.basename(path)
    # Ignoriert spezifische Verzeichnisse und die Ausgabedateien selbst
    if base_name in IGNORED_DIRS or base_name in [STRUCTURE_OUTPUT_FILE, JSON_PROFILE_OUTPUT_FILE]:
        return None

    rel_path = os.path.relpath(path, BASE_DIR).replace('\\', '/')
    
    if os.path.isdir(path):
        item = {"path": rel_path, "type": "directory", "children": []}
        try:
            for child_name in sorted(os.listdir(path)):
                child_path = os.path.join(path, child_name)
                child_item = get_structure_dict(child_path)
                if child_item:
                    item["children"].append(child_item)
            return item
        except PermissionError:
            print_log(f"[WARNUNG] Keine Berechtigung für das Verzeichnis: {rel_path}", 1)
            return None
    else:
        return {"path": rel_path, "type": "file"}

def scan_directory(path):
    """Durchsucht das Projektverzeichnis und sammelt Statistiken."""
    print_log(f"Starte Scan im Verzeichnis: {path}")
    
    for root, dirs, files in os.walk(path, topdown=True):
        # Ignorierte Verzeichnisse aus der weiteren Verarbeitung ausschließen
        dirs[:] = [d for d in dirs if d not in IGNORED_DIRS]
        
        # Zähle die gültigen Verzeichnisse
        stats["folder_count"] += len(dirs)
        print_log(f"Untersuche: {os.path.relpath(root, BASE_DIR)} - {len(dirs)} Unterordner, {len(files)} Dateien", 1)

        for filename in files:
            # Ignoriert die Ausgabedateien selbst
            if filename in [STRUCTURE_OUTPUT_FILE, JSON_PROFILE_OUTPUT_FILE]:
                continue

            stats["file_count"] += 1
            # Dateityp-Statistik
            file_ext = os.path.splitext(filename)[1].lower()
            if not file_ext:
                file_ext = ".<keine>"
            stats["file_types"][file_ext] = stats["file_types"].get(file_ext, 0) + 1
            
            # Spezifische Analyse für JSON-Dateien
            if file_ext == '.json':
                filepath = os.path.join(root, filename)
                json_data = analyze_json_content(filepath)
                if json_data:
                    stats["json_analysis"].append(json_data)

def write_output_files():
    """Generiert die finalen Berichte und speichert sie in den jeweiligen JSON-Dateien."""
    
    # 1. Projektstruktur generieren und speichern
    print_log("\nGeneriere Projektstruktur...")
    project_structure_data = {
        "project_name": os.path.basename(BASE_DIR),
        "analysis_date": datetime.now().isoformat(),
        "structure": get_structure_dict(BASE_DIR)
    }
    try:
        with open(STRUCTURE_OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(project_structure_data, f, indent=2, ensure_ascii=False)
        print_log(f"Projektstruktur erfolgreich in '{STRUCTURE_OUTPUT_FILE}' gespeichert.", 1)
    except IOError as e:
        print_log(f"[FEHLER] Konnte '{STRUCTURE_OUTPUT_FILE}' nicht schreiben: {e}", 1)

    # 2. JSON-Profil generieren und speichern
    print_log("\nGeneriere JSON-Profil...")
    json_profile_data = {
        "analysis_date": datetime.now().isoformat(),
        "total_json_files": len(stats["json_analysis"]),
        "files": sorted(stats["json_analysis"], key=lambda x: x['path'])
    }
    try:
        with open(JSON_PROFILE_OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(json_profile_data, f, indent=2, ensure_ascii=False)
        print_log(f"JSON-Profil erfolgreich in '{JSON_PROFILE_OUTPUT_FILE}' gespeichert.", 1)
    except IOError as e:
        print_log(f"[FEHLER] Konnte '{JSON_PROFILE_OUTPUT_FILE}' nicht schreiben: {e}", 1)

    # 3. Zusammenfassung in der Konsole ausgeben
    print_log("\n" + "="*50)
    print_log("ANALYSE-ZUSAMMENFASSUNG")
    print_log("="*50)
    print_log(f"\nGesamtzahl der Verzeichnisse: {stats['folder_count']}")
    print_log(f"Gesamtzahl der Dateien: {stats['file_count']}")
    
    print_log("\nDateitypen-Übersicht:")
    for ext, count in sorted(stats["file_types"].items()):
        print_log(f"  - {ext}: {count} Datei(en)", 1)
        
    if stats["json_analysis"]:
        print_log(f"\n{len(stats['json_analysis'])} JSON-Dateien analysiert.")


if __name__ == "__main__":
    scan_directory(BASE_DIR)
    write_output_files()
