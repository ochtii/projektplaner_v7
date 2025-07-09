import os
import shutil
import json
import uuid

# --- KONFIGURATION ---
# Das Skript geht davon aus, dass es im Hauptverzeichnis des Projekts ausgeführt wird.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
USER_DATA_DIR = os.path.join(BASE_DIR, 'static', 'data', 'user_data')
USERS_FILE = os.path.join(BASE_DIR, 'static', 'data', 'users.json')
STANDARD_PROFILE_PICTURE = 'static/img/standard_profile_picture.png'

def print_status(message, level="INFO"):
    """Druckt eine formatierte Statusmeldung."""
    color_map = {
        "INFO": "\033[94m", 
        "SUCCESS": "\033[92m", 
        "WARN": "\033[93m", 
        "ERROR": "\033[91m", 
        "RESET": "\033[0m"
    }
    print(f"{color_map.get(level, '')}[{level.upper()}]: {message}{color_map['RESET']}")

def _save_json(filepath, data):
    """Speichert JSON-Daten sicher in einer Datei."""
    try:
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except IOError as e:
        print_status(f"Fehler beim Speichern von JSON in {filepath}: {e}", "ERROR")
        return False

def delete_all_user_data():
    """Löscht den gesamten `user_data`-Ordner."""
    print_status("Versuche, alle Benutzerdaten zu löschen...", "INFO")
    if os.path.exists(USER_DATA_DIR):
        try:
            shutil.rmtree(USER_DATA_DIR)
            print_status(f"Verzeichnis '{USER_DATA_DIR}' und sein gesamter Inhalt wurden erfolgreich gelöscht.", "SUCCESS")
        except OSError as e:
            print_status(f"Fehler beim Löschen des Verzeichnisses {USER_DATA_DIR}: {e}", "ERROR")
    else:
        print_status(f"Verzeichnis '{USER_DATA_DIR}' existiert nicht, keine Aktion erforderlich.", "WARN")

def create_initial_users():
    """Erstellt die `users.json` mit zwei initialen Testbenutzern."""
    print_status("Erstelle initiale Testbenutzer...", "INFO")
    
    admin_id = str(uuid.uuid4())
    testuser_id = str(uuid.uuid4())
    
    initial_users = {
        "admin": {
            "id": admin_id,
            "email": "admin@example.com",
            "password": "password123",
            "isAdmin": True
        },
        "testuser": {
            "id": testuser_id,
            "email": "test@example.com",
            "password": "test",
            "isAdmin": False
        }
    }
    
    if _save_json(USERS_FILE, initial_users):
        print_status(f"Datei '{USERS_FILE}' wurde erfolgreich mit 2 Testbenutzern erstellt.", "SUCCESS")
        return [admin_id, testuser_id]
    else:
        print_status(f"Konnte die Datei '{USERS_FILE}' nicht erstellen.", "ERROR")
        return []

def create_user_directories(user_ids):
    """Erstellt die notwendigen Verzeichnisse und leeren Datendateien für die initialen Benutzer."""
    print_status("Erstelle Verzeichnisstrukturen für neue Benutzer...", "INFO")
    if not user_ids:
        print_status("Keine Benutzer-IDs zum Erstellen von Verzeichnissen vorhanden.", "WARN")
        return
        
    for user_id in user_ids:
        user_dir = os.path.join(USER_DATA_DIR, user_id)
        try:
            os.makedirs(os.path.join(user_dir, 'img'), exist_ok=True)
            
            # Leere JSON-Dateien erstellen
            _save_json(os.path.join(user_dir, 'projects.json'), {})
            _save_json(os.path.join(user_dir, 'settings.json'), {"design": "default"})
            _save_json(os.path.join(user_dir, 'logs.json'), [])
            _save_json(os.path.join(user_dir, 'profile.json'), {
                "profilbild": STANDARD_PROFILE_PICTURE,
                "alter": 0,
                "wohnort": "",
                "land": "",
                "plz": "",
                "aboutme": ""
            })
            print_status(f"Verzeichnis und Standarddateien für Benutzer {user_id} erstellt.", "SUCCESS")
        except OSError as e:
            print_status(f"Fehler beim Erstellen des Verzeichnisses für Benutzer {user_id}: {e}", "ERROR")

def factory_reset():
    """Führt den kompletten Reset-Vorgang aus."""
    print("\n" + "="*60)
    print_status("WARNUNG: Werkseinstellungen wiederherstellen", "WARN")
    print("="*60)
    print("Dieses Skript wird die folgenden Aktionen durchführen:")
    print("  1. Alle bestehenden Benutzerdaten und Projekte unwiderruflich löschen.")
    print("     (Der Ordner 'static/data/user_data/' wird entfernt)")
    print("  2. Alle Benutzerkonten entfernen.")
    print("  3. Zwei neue Standardbenutzer erstellen:")
    print("     - admin (Passwort: password123)")
    print("     - testuser (Passwort: test)")
    print("\nProjektvorlagen unter 'static/data/templates/' bleiben erhalten.")
    print("="*60)

    try:
        confirm = input("Sind Sie absolut sicher? Geben Sie 'JA' ein, um fortzufahren: ")
        if confirm.strip() == "JA":
            print_status("\nBestätigung erhalten. Starte den Reset-Vorgang...", "INFO")
            
            # Schritte ausführen
            delete_all_user_data()
            new_user_ids = create_initial_users()
            create_user_directories(new_user_ids)
            
            print_status("\nWerkseinstellungen erfolgreich wiederhergestellt.", "SUCCESS")
        else:
            print_status("\nAktion abgebrochen. Keine Änderungen vorgenommen.", "INFO")
    except KeyboardInterrupt:
        print_status("\nReset durch Benutzer unterbrochen.", "WARN")

if __name__ == "__main__":
    factory_reset()
