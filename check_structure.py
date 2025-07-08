import os
import json
import sys
import shutil
from datetime import datetime

# =================================================================
# SKRIPT-KONFIGURATION
# =================================================================
STRUCTURE_FILE = 'structure.json'
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKUP_DIR = os.path.join(BASE_DIR, 'structure_backup')

# =================================================================
# HELPER-FUNKTIONEN
# =================================================================

def print_status(message, level="INFO"):
    """Druckt eine formatierte Statusmeldung."""
    color_map = {"INFO": "\033[94m", "SUCCESS": "\033[92m", "WARN": "\033[93m", "ERROR": "\033[91m", "RESET": "\033[0m"}
    print(f"{color_map.get(level, '')}[{level.upper()}]: {message}{color_map['RESET']}")

def get_user_confirmation(prompt):
    """Fragt den Benutzer nach einer Ja/Nein-Bestätigung."""
    while True:
        response = input(f"{prompt} (j/n): ").lower().strip()
        if response in ['j', 'ja']: return True
        if response in ['n', 'nein']: return False
        print_status("Ungültige Eingabe.", "WARN")

def create_backup_session_folder():
    """Erstellt einen eindeutigen Backup-Ordner für die aktuelle Sitzung."""
    os.makedirs(BACKUP_DIR, exist_ok=True)
    
    existing_backups = [d for d in os.listdir(BACKUP_DIR) if os.path.isdir(os.path.join(BACKUP_DIR, d)) and d.startswith('backup_')]
    next_num = len(existing_backups) + 1
    
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    session_folder_name = f"backup_{next_num}_{timestamp}"
    session_path = os.path.join(BACKUP_DIR, session_folder_name)
    os.makedirs(session_path)
    return session_path

def backup_item(path, backup_session_path):
    """Sichert eine Datei oder einen Ordner in den Backup-Sitzungsordner."""
    if not os.path.exists(path):
        return
    
    rel_path = os.path.relpath(path, BASE_DIR)
    backup_dest = os.path.join(backup_session_path, rel_path)
    
    try:
        os.makedirs(os.path.dirname(backup_dest), exist_ok=True)
        if os.path.isdir(path):
            shutil.copytree(path, backup_dest)
        else:
            # Suffix .backup hinzufügen, um die Originaldatei zu kennzeichnen
            shutil.copy2(path, backup_dest + '.backup')
        print_status(f"'{rel_path}' gesichert.", "INFO")
    except Exception as e:
        print_status(f"Sicherung von '{rel_path}' fehlgeschlagen: {e}", "ERROR")

# =================================================================
# STRUKTUR-GENERIERUNG
# =================================================================

def generate_structure_dict(path):
    """
    Durchläuft rekursiv einen Pfad und erstellt ein Dictionary, das die Struktur repräsentiert.
    """
    if os.path.isdir(path):
        # Ignoriere irrelevante Verzeichnisse
        if os.path.basename(path) in ['__pycache__', '.git', '.vscode', 'venv', 'structure_backup']:
            return None
            
        item = {"path": os.path.relpath(path, BASE_DIR).replace('\\', '/'), "type": "directory", "children": []}
        for child_name in sorted(os.listdir(path)):
            child_path = os.path.join(path, child_name)
            child_item = generate_structure_dict(child_path)
            if child_item:
                item["children"].append(child_item)
        return item
    elif os.path.isfile(path):
        # Ignoriere die Zieldatei und Backup-Dateien
        if os.path.basename(path) == STRUCTURE_FILE or ".backup" in os.path.basename(path):
            return None
        return {"path": os.path.relpath(path, BASE_DIR).replace('\\', '/'), "type": "file"}
    return None

def generate_structure_file():
    """
    Generiert die `structure.json`-Datei aus der aktuellen Verzeichnisstruktur.
    Sichert eine eventuell vorhandene alte Datei.
    """
    print_status(f"Generiere neue `{STRUCTURE_FILE}` aus der aktuellen Projektstruktur...")

    if os.path.exists(STRUCTURE_FILE):
        backup_session_path = create_backup_session_folder()
        backup_item(os.path.join(BASE_DIR, STRUCTURE_FILE), backup_session_path)
        print_status(f"Bestehende `{STRUCTURE_FILE}` in `{os.path.relpath(backup_session_path)}` gesichert.", "INFO")

    scan_paths = [p for p in os.listdir(BASE_DIR) if not p.startswith('.') and p not in ['__pycache__', 'venv', '.git', 'structure_backup']]
    
    project_structure = {
        "name": os.path.basename(BASE_DIR),
        "type": "project_root",
        "children": []
    }

    for path in sorted(scan_paths):
        full_path = os.path.join(BASE_DIR, path)
        structure_dict = generate_structure_dict(full_path)
        if structure_dict:
            project_structure["children"].append(structure_dict)

    try:
        with open(STRUCTURE_FILE, 'w', encoding='utf-8') as f:
            json.dump(project_structure, f, indent=2, ensure_ascii=False)
        print_status(f"`{STRUCTURE_FILE}` erfolgreich erstellt/aktualisiert.", "SUCCESS")
    except IOError as e:
        print_status(f"Konnte `{STRUCTURE_FILE}` nicht schreiben. Fehler: {e}", "ERROR")

# =================================================================
# STRUKTUR-VALIDIERUNG & REPARATUR (OPTIMIERT)
# =================================================================

def check_structure_from_file():
    """Liest structure.json und vergleicht sie mit dem Dateisystem."""
    if not os.path.exists(STRUCTURE_FILE):
        print_status(f"`{STRUCTURE_FILE}` nicht gefunden.", "ERROR")
        return

    print_status(f"Validiere Projektstruktur anhand von `{STRUCTURE_FILE}`...")
    with open(STRUCTURE_FILE, 'r', encoding='utf-8') as f:
        structure_def = json.load(f)

    actions = []
    defined_paths = set()

    # 1. Sammle alle in structure.json definierten Pfade
    def collect_defined_paths(node):
        # Verwende immer forward slashes für interne Konsistenz
        path = node['path'].replace('\\', '/')
        defined_paths.add(path)
        if node.get('type') == 'directory' and 'children' in node:
            for child in node['children']:
                collect_defined_paths(child)

    for item in structure_def.get('children', []):
        collect_defined_paths(item)

    # 2. Prüfe, ob definierte Elemente im Dateisystem fehlen
    def find_missing_items(node):
        full_path = os.path.join(BASE_DIR, node['path'].replace('/', os.sep))
        if not os.path.exists(full_path):
            actions.append({'type': 'create', 'node': node, 'path': full_path})
        
        if node.get('type') == 'directory' and 'children' in node:
            for child in node['children']:
                find_missing_items(child)

    for item in structure_def.get('children', []):
        find_missing_items(item)

    # 3. Finde verwaiste Dateien/Ordner im Dateisystem
    for root, dirs, files in os.walk(BASE_DIR):
        # Schließe spezielle Verzeichnisse von der Prüfung aus
        dirs[:] = [d for d in dirs if d not in ['.git', '.vscode', '__pycache__', 'venv', 'structure_backup']]
        
        for name in dirs + files:
            path = os.path.join(root, name)
            rel_path = os.path.relpath(path, BASE_DIR).replace('\\', '/')
            if rel_path not in defined_paths and rel_path != STRUCTURE_FILE:
                actions.append({'type': 'delete_orphan', 'path': path, 'is_dir': os.path.isdir(path)})

    # 4. Bericht und Reparatur
    if not actions:
        print_status("Projektstruktur ist vollständig und korrekt.", "SUCCESS")
    else:
        print("\n" + "="*50 + "\n Analysebericht\n" + "="*50)
        for action in actions:
            action_type = action['type']
            path_str = os.path.relpath(action.get('path'), BASE_DIR)
            if action_type == 'create':
                print_status(f"Fehlend: [{action['node']['type'].upper()}] {path_str}", "WARN")
            elif action_type == 'delete_orphan':
                print_status(f"Verwaist: '{path_str}' ist nicht in structure.json definiert.", "WARN")
        
        if get_user_confirmation("\nMöchten Sie die notwendigen Änderungen jetzt durchführen?"):
            apply_fixes(actions)

def apply_fixes(actions):
    """Führt die notwendigen Änderungen durch und sichert betroffene Dateien."""
    backup_path = create_backup_session_folder()
    print_status(f"Backup-Sitzung erstellt in: {os.path.relpath(backup_path)}", "INFO")

    for action in actions:
        path = action['path']
        try:
            if action['type'] == 'delete_orphan':
                backup_item(path, backup_path)
                if action['is_dir']:
                    shutil.rmtree(path)
                else:
                    os.remove(path)
                print_status(f"'{os.path.relpath(path)}' entfernt.", "SUCCESS")
            
            if action['type'] == 'create':
                node = action['node']
                if node['type'] == 'directory':
                    os.makedirs(path, exist_ok=True)
                elif node['type'] == 'file':
                    os.makedirs(os.path.dirname(path), exist_ok=True)
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(node.get('content', ''))
                print_status(f"'{os.path.relpath(path)}' erstellt.", "SUCCESS")
        except Exception as e:
            print_status(f"Fehler bei der Verarbeitung von '{os.path.relpath(path)}': {e}", "ERROR")

# =================================================================
# WIEDERHERSTELLUNGS-FUNKTION
# =================================================================

def restore_from_backup():
    """Interaktive Funktion zur Wiederherstellung von Dateien aus einem Backup."""
    if not os.path.exists(BACKUP_DIR) or not os.listdir(BACKUP_DIR):
        print_status("Keine Backups gefunden.", "INFO")
        return

    backups = sorted([d for d in os.listdir(BACKUP_DIR) if os.path.isdir(os.path.join(BACKUP_DIR, d))])
    print("\nVerfügbare Backups:")
    for i, backup_name in enumerate(backups):
        print(f"  {i + 1}: {backup_name}")

    try:
        choice = int(input("Wählen Sie ein Backup zur Wiederherstellung (Nummer): ")) - 1
        if not 0 <= choice < len(backups): raise ValueError
        selected_backup = backups[choice]
    except (ValueError, IndexError):
        print_status("Ungültige Auswahl.", "ERROR")
        return

    backup_path = os.path.join(BACKUP_DIR, selected_backup)
    files_to_restore = []
    for root, _, files in os.walk(backup_path):
        for file in files:
            if file.endswith('.backup'):
                backup_file_path = os.path.join(root, file)
                original_rel_path = os.path.relpath(backup_file_path, backup_path)[:-7] # .backup entfernen
                files_to_restore.append({'backup_path': backup_file_path, 'original_path': original_rel_path})
    
    if not files_to_restore:
        print_status("Dieses Backup enthält keine wiederherstellbaren Dateien.", "INFO")
        return

    print("\nDateien in diesem Backup:")
    for i, file_info in enumerate(files_to_restore):
        print(f"  {i + 1}: {file_info['original_path']}")
    
    try:
        file_choices_str = input("Welche Dateien wiederherstellen? (Nummern, getrennt durch Komma, oder 'alle'): ")
        if file_choices_str.lower() == 'alle':
            selected_files = files_to_restore
        else:
            file_indices = [int(i.strip()) - 1 for i in file_choices_str.split(',')]
            selected_files = [files_to_restore[i] for i in file_indices if 0 <= i < len(files_to_restore)]
    except ValueError:
        print_status("Ungültige Eingabe.", "ERROR")
        return

    if not selected_files:
        print_status("Keine gültigen Dateien zur Wiederherstellung ausgewählt.", "INFO")
        return

    if get_user_confirmation(f"{len(selected_files)} Datei(en) werden wiederhergestellt. Bestehende Dateien werden überschrieben. Fortfahren?"):
        for file_info in selected_files:
            dest_path = os.path.join(BASE_DIR, file_info['original_path'])
            try:
                os.makedirs(os.path.dirname(dest_path), exist_ok=True)
                shutil.copy2(file_info['backup_path'], dest_path)
                print_status(f"'{file_info['original_path']}' wiederhergestellt.", "SUCCESS")
            except Exception as e:
                print_status(f"Wiederherstellung von '{file_info['original_path']}' fehlgeschlagen: {e}", "ERROR")

# =================================================================
# HAUPTMENÜ
# =================================================================
def main():
    """Zeigt das Hauptmenü an und steuert den Skriptablauf."""
    if '--check' in sys.argv:
        check_structure_from_file()
        return
    if '--generate' in sys.argv:
        generate_structure_file()
        return

    while True:
        print("\n" + "="*50)
        print(" Struktur-Werkzeug Hauptmenü")
        print("="*50)
        print("1. Projektstruktur validieren & reparieren")
        print("2. Neue `structure.json` aus Verzeichnis generieren")
        print("3. Aus Backup wiederherstellen")
        print("q. Beenden")
        print("="*50)
        
        choice = input("Ihre Wahl: ").strip().lower()

        if choice == '1':
            check_structure_from_file()
        elif choice == '2':
            generate_structure_file()
        elif choice == '3':
            restore_from_backup()
        elif choice == 'q':
            print_status("Skript wird beendet.", "INFO")
            break
        else:
            print_status("Ungültige Auswahl.", "WARN")

if __name__ == "__main__":
    main()
