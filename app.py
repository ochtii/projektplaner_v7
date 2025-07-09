import os
import json
import re
import uuid
import sys
import subprocess
from functools import wraps
from flask import Flask, render_template, jsonify, request, session, redirect, url_for, flash
import shutil

app = Flask(__name__)
app.secret_key = 'your_very_secret_key_12345'

# --- Konfiguration ---
DATA_ROOT = os.path.join('static', 'data')
USER_DATA_DIR = os.path.join(DATA_ROOT, 'user_data')
USERS_FILE = os.path.join(DATA_ROOT, 'users.json')
SETTINGS_FILE = os.path.join('api', 'global_settings.json')
TEMPLATES_DIR = os.path.join(DATA_ROOT, 'templates') 
STRUCTURE_FILE = 'structure.json'
os.makedirs(USER_DATA_DIR, exist_ok=True)
os.makedirs(TEMPLATES_DIR, exist_ok=True) 

# NEU: Standard-Profilbild und Profil-Datei-Pfade
STANDARD_PROFILE_PICTURE = 'static/img/standard_profile_picture.png'
PROFILE_FILE_NAME = 'profile.json'

# --- Helper-Funktionen ---

def _load_json(filepath, default_data={}):
    """
    Lädt JSON-Daten aus einer Datei.
    Wenn die Datei nicht existiert, leer ist oder fehlerhaftes JSON enthält, wird default_data zurückgegeben.
    """
    if not os.path.exists(filepath):
        print(f"DEBUG: Datei nicht gefunden: {filepath}", file=sys.stderr)
        return default_data
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            if not content:
                print(f"DEBUG: Datei ist leer: {filepath}", file=sys.stderr)
                return default_data
            return json.loads(content)
    except (json.JSONDecodeError, FileNotFoundError) as e:
        print(f"FEHLER: Beim Laden von JSON aus {filepath}: {e}", file=sys.stderr)
        return default_data

def _save_json(filepath, data):
    """
    Speichert JSON-Daten in einer Datei.
    Erstellt bei Bedarf die Verzeichnisse.
    """
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    return True

def is_valid_email(email):
    """Prüft, ob eine E-Mail-Adresse ein gültiges Format hat."""
    return re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email)

def get_user_data_path(user_id, data_type="projects"):
    """Gibt den Pfad zu den benutzerspezifischen Daten zurück und erstellt das Verzeichnis, falls nötig."""
    if not user_id: return None
    user_dir = os.path.join(USER_DATA_DIR, str(user_id))
    os.makedirs(user_dir, exist_ok=True)
    return os.path.join(user_dir, f"{data_type}.json")

def get_user_img_path(user_id):
    """Gibt den Pfad zum Bildverzeichnis des Benutzers zurück und erstellt es, falls nötig."""
    if not user_id: return None
    user_img_dir = os.path.join(USER_DATA_DIR, str(user_id), 'img')
    os.makedirs(user_img_dir, exist_ok=True)
    return user_img_dir

def get_user_profile_path(user_id):
    """Gibt den Pfad zur Profildatei des Benutzers zurück."""
    if not user_id: return None
    user_dir = os.path.join(USER_DATA_DIR, str(user_id))
    os.makedirs(user_dir, exist_ok=True)
    return os.path.join(user_dir, PROFILE_FILE_NAME)


# --- Decorators ---

def login_required(f):
    """Decorator, der sicherstellt, dass ein Benutzer angemeldet ist (oder Gast)."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session and not session.get('is_guest'):
            flash("Sie müssen angemeldet sein, um diese Seite zu sehen.", "error")
            return redirect(url_for('login_route'))
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    """Decorator, der sicherstellt, dass der angemeldete Benutzer ein Administrator ist."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('isAdmin'):
            flash("Zugriff verweigert. Sie benötigen Administratorrechte.", "error")
            return redirect(url_for('dashboard'))
        return f(*args, **kwargs)
    return decorated_function

# --- New API Endpoints for Templates ---
@app.route('/api/templates', methods=['GET'])
def get_templates():
    """Gibt eine Liste verfügbarer Projektvorlagen zurück."""
    templates = []
    for filename in os.listdir(TEMPLATES_DIR):
        if filename.endswith('.json') and filename != 'bsp.json': 
            template_path = os.path.join(TEMPLATES_DIR, filename)
            try:
                data = _load_json(template_path)
                templates.append({
                    'id': filename.replace('.json', ''),
                    'name': data.get('name', filename.replace('.json', '')),
                    'description': data.get('description', '')
                })
            except Exception:
                continue 
    return jsonify(templates)

@app.route('/api/template/<template_id>', methods=['GET'])
def get_template_content(template_id):
    """Gibt den Inhalt einer spezifischen Projektvorlage zurück."""
    base_path = os.path.abspath(TEMPLATES_DIR)
    requested_path = os.path.abspath(os.path.join(base_path, f"{template_id}.json"))

    if not requested_path.startswith(base_path):
        return jsonify({"error": "Invalid template ID."}), 400

    if not os.path.exists(requested_path) or template_id == 'bsp': 
        return jsonify({"error": "Template not found."}), 404
    try:
        template_data = _load_json(requested_path)
        return jsonify(template_data)
    except Exception:
        return jsonify({"error": "Error loading template content."}), 500

@app.route('/api/initial-project', methods=['GET'])
def get_initial_project():
    """Gibt den Inhalt des initialen Beispielprojekts (bsp.json) zurück."""
    bsp_path = os.path.join(TEMPLATES_DIR, 'bsp.json')
    if not os.path.exists(bsp_path):
        return jsonify({"error": "Initial project template not found."}), 404
    try:
        project_data = _load_json(bsp_path)
        return jsonify(project_data)
    except Exception:
        return jsonify({"error": "Error loading initial project content."}), 500


# --- Routen für Seiten ---
@app.route('/')
def index():
    """Startseite der Anwendung. Leitet angemeldete Benutzer zum Dashboard weiter."""
    if 'user_id' in session: return redirect(url_for('dashboard'))
    return render_template('index.html')

@app.route('/guest')
def guest_login():
    """Meldet einen Benutzer als Gast an."""
    session.clear()
    session['is_guest'] = True
    session['username'] = 'Gast'
    session['user_id'] = f"guest_{uuid.uuid4()}"
    return redirect(url_for('dashboard'))

@app.route('/login', methods=['GET', 'POST'])
def login_route():
    """Login-Seite für Benutzer."""
    if 'user_id' in session: 
        return redirect(url_for('dashboard'))

    if request.method == 'POST':
        identifier = request.form.get('identifier')
        password = request.form.get('password')
        users = _load_json(USERS_FILE)

        user_found = None
        for username, user_data in users.items():
            if identifier == username or identifier == user_data.get('email'):
                user_found = user_data
                user_found['username'] = username
                break
        
        if user_found and user_found['password'] == password:
            session.clear()
            session['user_id'] = user_found['id']
            session['username'] = user_found['username']
            session['isAdmin'] = user_found.get('isAdmin', False)
            flash(f"Willkommen zurück, {session['username']}!", "success")
            return redirect(url_for('dashboard'))
        else:
            flash("Ungültiger Benutzername/E-Mail oder Passwort.", "error")
            return render_template('login.html', identifier=identifier)

    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register_route():
    """Registrierungsseite für neue Benutzer."""
    global_app_settings = _load_json(SETTINGS_FILE, {"registration_enabled": True}) 

    if 'user_id' in session: return redirect(url_for('dashboard'))

    if not global_app_settings.get('registration_enabled', True): 
        return render_template('register.html', registration_disabled=True)
        
    if request.method == 'POST':
        if not global_app_settings.get('registration_enabled', True):
            flash('Registrierung ist momentan nicht möglich. Bitte versuchen Sie es zu einem späteren Zeitpunkt.', 'error')
            return render_template('register.html', registration_disabled=True)

        username = request.form.get('username')
        password = request.form.get('password')
        email = request.form.get('email')
        agb = request.form.get('agb')
        users = _load_json(USERS_FILE)

        if not agb:
            flash('Sie müssen den AGB zustimmen.', 'error')
        elif not is_valid_email(email):
            flash('Geben Sie eine gültige E-Mail-Adresse ein.', 'error')
        elif username in users:
            flash('Benutzername bereits vergeben.', 'error')
        elif any(u.get('email') == email for u in users.values()):
            flash('Diese E-Mail-Adresse wird bereits verwendet.', 'error')
        else:
            new_user_id = str(uuid.uuid4())
            users[username] = {"id": new_user_id, "email": email, "password": password, "isAdmin": False}
            _save_json(USERS_FILE, users)
            
            get_user_img_path(new_user_id)
            user_profile_path = get_user_profile_path(new_user_id)
            default_profile_data = {
                "profilbild": STANDARD_PROFILE_PICTURE, "alter": 0, "wohnort": "", "land": "", "plz": "", "aboutme": ""
            }
            _save_json(user_profile_path, default_profile_data)

            _save_json(get_user_data_path(new_user_id, 'projects'), {})
            _save_json(get_user_data_path(new_user_id, 'settings'), {"design": "default"})
            _save_json(get_user_data_path(new_user_id, 'logs'), [])
            
            flash('Registrierung erfolgreich! Sie können sich jetzt anmelden.', 'success')
            return redirect(url_for('login_route'))
    return render_template('register.html', registration_disabled=False)

@app.route('/logout')
def logout():
    """Meldet den Benutzer ab und löscht die Session."""
    session.clear()
    flash("Sie wurden erfolgreich abgemeldet.", "success")
    return redirect(url_for('index'))

@app.route('/dashboard')
@login_required
def dashboard():
    """Dashboard-Seite für angemeldete Benutzer."""
    return render_template('dashboard.html')

@app.route('/project/<project_id>')
@login_required
def project_manager(project_id):
    """Projektmanager-Seite zum Bearbeiten von Projekten."""
    return render_template('project_manager.html', project_id=project_id)

@app.route('/project-overview/<project_id>')
@login_required
def project_overview(project_id):
    """Projektübersichtsseite."""
    return render_template('project_overview.html', project_id=project_id)

@app.route('/project-checklist/<project_id>')
@login_required
def project_checklist(project_id):
    """Projekt-Checklisten-Seite."""
    return render_template('project_checklist.html', project_id=project_id)

@app.route('/settings')
@login_required
def settings():
    """Benutzereinstellungen-Seite."""
    return render_template('settings.html')

@app.route('/info')
def info():
    """Informations- und Hilfeseite."""
    return render_template('info.html')

@app.route('/agb')
def agb():
    """Allgemeine Geschäftsbedingungen Seite."""
    return render_template('agb.html')

# --- Admin-Routen ---
@app.route('/admin')
@login_required
@admin_required
def admin_dashboard():
    """Admin-Dashboard-Seite."""
    return render_template('admin_dashboard.html')

@app.route('/admin/users')
@login_required
@admin_required
def admin_user_management():
    """Admin-Seite zur Benutzerverwaltung."""
    return render_template('admin_user_management.html')

@app.route('/admin/settings')
@login_required
@admin_required
def admin_global_settings():
    """Admin-Seite für globale Einstellungen."""
    return render_template('admin_global_settings.html')

@app.route('/admin/structure-check')
@login_required
@admin_required
def admin_structure_check():
    """Admin-Seite für den Struktur-Check."""
    return render_template('admin_run_check.html')

@app.route('/admin/factory-reset')
@login_required
@admin_required
def admin_factory_reset():
    """Rendert die Seite, von der aus der Reset gestartet werden kann."""
    return render_template('admin_factory_reset.html')

# --- API-Endpunkte ---
@app.route('/api/admin/users', methods=['GET'])
@login_required
@admin_required
def admin_user_management_api():
    """Gibt eine Liste aller Benutzer zurück (nur für Admins)."""
    users = _load_json(USERS_FILE)
    users_safe = []
    for username, user_data in users.items():
        user_copy = user_data.copy()
        user_copy['username'] = username
        user_copy.pop('password', None)
        users_safe.append(user_copy)
    return jsonify(users_safe)

@app.route('/api/user/profile', methods=['GET'])
@login_required
def get_user_profile():
    """Gibt die Profildaten des aktuellen Benutzers zurück."""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"error": "Benutzer nicht angemeldet"}), 401
    
    profile_path = get_user_profile_path(user_id)
    profile_data = _load_json(profile_path, {
        "profilbild": STANDARD_PROFILE_PICTURE, "alter": 0, "wohnort": "", "land": "", "plz": "", "aboutme": ""
    })
    return jsonify(profile_data)

@app.route('/api/user/profile', methods=['POST'])
@login_required
def update_user_profile():
    """Aktualisiert die Profildaten des aktuellen Benutzers."""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"error": "Benutzer nicht angemeldet"}), 401
    
    if session.get('is_guest'):
        return jsonify({"error": "Gäste können keine Profileinstellungen speichern"}), 403

    profile_path = get_user_profile_path(user_id)
    current_profile_data = _load_json(profile_path, {})
    
    updated_data = request.get_json()
    current_profile_data.update(updated_data)
    
    _save_json(profile_path, current_profile_data)
    return jsonify({"message": "Profile updated successfully"}), 200

@app.route('/api/projects', methods=['GET'])
@login_required
def get_all_projects():
    """Gibt alle Projekte des aktuellen Benutzers zurück."""
    user_projects_path = get_user_data_path(session['user_id'], 'projects')
    projects = _load_json(user_projects_path, {})
    return jsonify(list(projects.values()))

@app.route('/api/project/<project_id>', methods=['GET'])
@login_required
def get_single_project(project_id):
    """Gibt ein spezifisches Projekt des aktuellen Benutzers zurück."""
    user_projects_path = get_user_data_path(session['user_id'], 'projects')
    projects = _load_json(user_projects_path, {})
    project = projects.get(project_id)
    if project:
        return jsonify(project)
    return jsonify({"error": "Project not found"}), 404

@app.route('/api/project', methods=['POST'])
@login_required
def create_project():
    """Erstellt ein neues Projekt für den aktuellen Benutzer."""
    user_id = session.get('user_id')
    is_guest = session.get('is_guest', False)
    
    if not user_id:
        return jsonify({"error": "Benutzer nicht identifiziert."}), 400

    new_project_data = request.get_json()
    project_id = new_project_data.get('projectId', str(uuid.uuid4()))
    
    user_projects_path = get_user_data_path(user_id, 'projects')
    projects = _load_json(user_projects_path, {})

    if is_guest:
        global_app_settings = _load_json(SETTINGS_FILE, {})
        guest_limits = global_app_settings.get('guest_limits', {})
        max_projects = guest_limits.get('projects', 1)
        if len(projects) >= max_projects:
            return jsonify({"error": f"Als Gast können Sie maximal {max_projects} Projekte erstellen."}), 403

    projects[project_id] = new_project_data
    _save_json(user_projects_path, projects)
    return jsonify({"message": "Project created successfully", "projectId": project_id}), 201

@app.route('/api/project/<project_id>', methods=['POST'])
@login_required
def save_project(project_id):
    """Speichert ein bestehendes Projekt des aktuellen Benutzers."""
    user_projects_path = get_user_data_path(session['user_id'], 'projects')
    projects = _load_json(user_projects_path, {})
    
    if project_id not in projects:
        return jsonify({"error": "Project not found"}), 404
    
    updated_project_data = request.get_json()

    if session.get('is_guest', False):
        global_app_settings = _load_json(SETTINGS_FILE, {})
        guest_limits = global_app_settings.get('guest_limits', {})
        max_phases = guest_limits.get('phases_per_project', 5)
        max_tasks = guest_limits.get('tasks_per_phase', 10)
        max_subtasks = guest_limits.get('subtasks_per_task', 10)

        if len(updated_project_data.get('phases', [])) > max_phases:
            return jsonify({"error": f"Als Gast können Sie maximal {max_phases} Phasen pro Projekt erstellen."}), 403
        for phase in updated_project_data.get('phases', []):
            if len(phase.get('tasks', [])) > max_tasks:
                return jsonify({"error": f"Als Gast können Sie maximal {max_tasks} Aufgaben pro Phase erstellen."}), 403
            for task in phase.get('tasks', []):
                if len(task.get('subtasks', [])) > max_subtasks:
                    return jsonify({"error": f"Als Gast können Sie maximal {max_subtasks} Unteraufgaben pro Aufgabe erstellen."}), 403

    projects[project_id] = updated_project_data
    _save_json(user_projects_path, projects)
    return jsonify({"message": "Project saved successfully"}), 200

@app.route('/api/project/<project_id>', methods=['DELETE'])
@login_required
def delete_project(project_id):
    """Löscht ein Projekt des aktuellen Benutzers."""
    user_projects_path = get_user_data_path(session['user_id'], 'projects')
    projects = _load_json(user_projects_path, {})
    
    if project_id in projects:
        del projects[project_id]
        _save_json(user_projects_path, projects)
        return jsonify({"message": "Project deleted successfully"}), 200
    return jsonify({"error": "Project not found"}), 404

@app.route('/api/session', methods=['GET'])
def get_session():
    """Gibt die aktuelle Benutzersession-Informationen zurück."""
    if session.get('is_guest'):
        return jsonify({"logged_in": False, "is_guest": True, "username": "Gast"})
    if 'user_id' in session:
        return jsonify({"logged_in": True, "is_guest": False, "username": session.get('username'), "isAdmin": session.get('isAdmin', False)})
    return jsonify({"logged_in": False, "is_guest": False})

@app.route('/api/settings', methods=['GET', 'POST'])
def handle_settings():
    """Behandelt das Abrufen und Speichern von Benutzereinstellungen."""
    if request.method == 'GET':
        if 'user_id' not in session and not session.get('is_guest'):
            return jsonify({"design": "default"})
        user_settings_path = get_user_data_path(session['user_id'], 'settings')
        return jsonify(_load_json(user_settings_path, {"design": "default"}))
    
    if request.method == 'POST':
        if 'user_id' not in session and not session.get('is_guest'):
            return jsonify({"error": "Sie müssen angemeldet sein, um Einstellungen zu speichern."}), 403
        if session.get('is_guest'):
            return jsonify({"error": "Gäste können keine Servereinstellungen speichern"}), 403
        user_settings_path = get_user_data_path(session['user_id'], 'settings')
        _save_json(user_settings_path, request.get_json())
        return jsonify({"success": True})

@app.route('/api/global-settings', methods=['GET', 'POST'])
def handle_global_settings_api():
    """Behandelt das Abrufen und Speichern globaler Anwendungseinstellungen (nur für Admins)."""
    if request.method == 'GET':
        return jsonify(_load_json(SETTINGS_FILE))
    if request.method == 'POST':
        if not session.get('isAdmin'):
            return jsonify({"error": "Zugriff verweigert. Sie benötigen Administratorrechte."}), 403
        current_settings = _load_json(SETTINGS_FILE)
        updated_data = request.get_json()
        for key, value in updated_data.items():
            if isinstance(value, dict) and key in current_settings and isinstance(current_settings[key], dict):
                current_settings[key].update(value)
            else:
                current_settings[key] = value
        _save_json(SETTINGS_FILE, current_settings)
        return jsonify({"success": True})

@app.route('/api/admin/get-structure', methods=['GET'])
@login_required
@admin_required
def get_structure_api():
    """Gibt die gespeicherte Projektstruktur aus structure.json zurück (nur für Admins)."""
    structure_data = _load_json(STRUCTURE_FILE, {"error": "structure.json nicht gefunden oder leer."})
    return jsonify(structure_data)

@app.route('/api/admin/run-check', methods=['POST'])
@login_required
@admin_required
def run_structure_check_api():
    """Führt das externe Skript check_structure.py aus (nur für Admins)."""
    command_flag = request.json.get('flag')
    if command_flag not in ['--check', '--generate']:
        return jsonify({"log": "Ungültiges Kommando."}), 400

    try:
        result = subprocess.run(
            [sys.executable, 'check_structure.py', command_flag],
            capture_output=True, text=True, encoding='utf-8',
            cwd=os.path.dirname(os.path.abspath(__file__))
        )
        log_output = result.stdout + result.stderr
        return jsonify({"log": log_output})
    except Exception as e:
        return jsonify({"log": f"Fehler bei der Ausführung des Skripts: {e}"}), 500

# --- NEUE LOGIK FÜR FACTORY RESET ---

def _delete_all_user_data_logic():
    """Logik zum Löschen des user_data Ordners. Gibt einen Log-String zurück."""
    log_messages = []
    if os.path.exists(USER_DATA_DIR):
        try:
            shutil.rmtree(USER_DATA_DIR)
            log_messages.append(f"[SUCCESS]: Verzeichnis '{USER_DATA_DIR}' und sein gesamter Inhalt wurden gelöscht.")
        except OSError as e:
            log_messages.append(f"[FEHLER]: Fehler beim Löschen des Verzeichnisses {USER_DATA_DIR}: {e}")
    else:
        log_messages.append(f"[INFO]: Verzeichnis '{USER_DATA_DIR}' existiert nicht, keine Aktion erforderlich.")
    return "\n".join(log_messages)

def _create_initial_users_logic():
    """Logik zum Erstellen der initialen Benutzer. Gibt Log-String und neue IDs zurück."""
    log_messages = []
    admin_id = str(uuid.uuid4())
    testuser_id = str(uuid.uuid4())
    
    initial_users = {
        "admin": {"id": admin_id, "email": "admin@example.com", "password": "password123", "isAdmin": True},
        "testuser": {"id": testuser_id, "email": "test@example.com", "password": "test", "isAdmin": False}
    }
    
    if _save_json(USERS_FILE, initial_users):
        log_messages.append(f"[SUCCESS]: Datei '{USERS_FILE}' wurde erfolgreich mit 2 Testbenutzern erstellt.")
        return "\n".join(log_messages), [admin_id, testuser_id]
    else:
        log_messages.append(f"[FEHLER]: Konnte die Datei '{USERS_FILE}' nicht erstellen.")
        return "\n".join(log_messages), []

def _create_user_directories_logic(user_ids):
    """Logik zum Erstellen der Verzeichnisse für neue Benutzer. Gibt einen Log-String zurück."""
    log_messages = []
    if not user_ids:
        log_messages.append("[WARNUNG]: Keine Benutzer-IDs zum Erstellen von Verzeichnissen vorhanden.")
        return "\n".join(log_messages)
        
    for user_id in user_ids:
        user_dir = os.path.join(USER_DATA_DIR, user_id)
        try:
            os.makedirs(os.path.join(user_dir, 'img'), exist_ok=True)
            _save_json(os.path.join(user_dir, 'projects.json'), {})
            _save_json(os.path.join(user_dir, 'settings.json'), {"design": "default"})
            _save_json(os.path.join(user_dir, 'logs.json'), [])
            _save_json(os.path.join(user_dir, 'profile.json'), {
                "profilbild": STANDARD_PROFILE_PICTURE, "alter": 0, "wohnort": "", "land": "", "plz": "", "aboutme": ""
            })
            log_messages.append(f"[SUCCESS]: Verzeichnis und Standarddateien für Benutzer {user_id} erstellt.")
        except OSError as e:
            log_messages.append(f"[FEHLER]: Fehler beim Erstellen des Verzeichnisses für Benutzer {user_id}: {e}")
    return "\n".join(log_messages)

# NEUER API-ENDPUNKT zum Ausführen des Resets
@app.route('/api/admin/run-factory-reset', methods=['POST'])
@login_required
@admin_required
def run_factory_reset_api():
    """Führt den kompletten Reset-Vorgang aus und gibt ein Log zurück."""
    log = []
    try:
        log.append("--- Starte Werkseinstellungen ---")
        log.append(_delete_all_user_data_logic())
        log_users, user_ids = _create_initial_users_logic()
        log.append(log_users)
        log.append(_create_user_directories_logic(user_ids))
        log.append("\n[SUCCESS]: Werkseinstellungen erfolgreich wiederhergestellt.")
        return jsonify({"log": "\n".join(log)})
    except Exception as e:
        return jsonify({"log": f"Ein unerwarteter Fehler ist aufgetreten: {e}"}), 500

if __name__ == '__main__':
    app.run(debug=True)
