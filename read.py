# read_project_structure.py
import os
import json

def generate_structure_dict(path, base_dir):
    """
    Durchläuft rekursiv einen Pfad und erstellt ein Dictionary, das die Struktur repräsentiert.
    Ignoriert bestimmte Verzeichnisse und Dateien.
    """
    # Ignoriere irrelevante Verzeichnisse
    if os.path.isdir(path):
        if os.path.basename(path) in ['__pycache__', '.git', '.vscode', 'venv', 'structure_backup']:
            return None
            
        item = {
            "path": os.path.relpath(path, base_dir).replace('\\', '/'),
            "type": "directory",
            "children": []
        }
        for child_name in sorted(os.listdir(path)):
            child_path = os.path.join(path, child_name)
            child_item = generate_structure_dict(child_path, base_dir)
            if child_item:
                item["children"].append(child_item)
        return item
    elif os.path.isfile(path):
        # Ignoriere die Zieldatei und Backup-Dateien
        if os.path.basename(path) == "project_structure.json" or ".backup" in os.path.basename(path) or os.path.basename(path) == "read_project_structure.py":
            return None
        return {"path": os.path.relpath(path, base_dir).replace('\\', '/'), "type": "file"}
    return None

def read_and_save_project_structure(output_filename="project_structure.json"):
    """
    Liest die aktuelle Projektstruktur und speichert sie in einer JSON-Datei.
    """
    base_dir = os.path.dirname(os.path.abspath(__file__)) # Das Verzeichnis, in dem das Skript liegt
    
    print(f"Lese Projektstruktur ab '{base_dir}'...")

    project_structure = {
        "name": os.path.basename(base_dir),
        "type": "project_root",
        "children": []
    }

    # Gehe durch alle Elemente im Basisverzeichnis
    for entry_name in sorted(os.listdir(base_dir)):
        full_path = os.path.join(base_dir, entry_name)
        structure_dict = generate_structure_dict(full_path, base_dir)
        if structure_dict:
            project_structure["children"].append(structure_dict)

    # Speichere die Struktur in einer JSON-Datei
    output_path = os.path.join(base_dir, output_filename)
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(project_structure, f, indent=2, ensure_ascii=False)
        print(f"Projektstruktur erfolgreich gespeichert in: '{output_path}'")
    except IOError as e:
        print(f"Fehler beim Speichern der Projektstruktur in '{output_path}': {e}")

if __name__ == "__main__":
    read_and_save_project_structure()