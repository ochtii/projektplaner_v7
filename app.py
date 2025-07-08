import os
import json
import re
import uuid
import subprocess
import sys
from functools import wraps
from datetime import datetime
from flask import Flask, render_template, jsonify, request, session, redirect, url_for, flash

# HINWEIS: Diese Print-Anweisung dient nur zur Bestätigung, welche Version der Datei ausgeführt wird.
# Sie können sie entfernen, sobald das Problem behoben ist.
print(f"--- app.py Version BESTÄTIGUNG {datetime.now()} ---", file=sys.stderr)

app = Flask(__name__)
app.secret_key = 'your_very_secret_key_12345'

# --- Konfiguration ---
DATA_ROOT = os.path.join('static', 'data')
USER_DATA_DIR = os.path.join(DATA_ROOT, 'user_data')
USERS_FILE = os.path.join(DATA_ROOT, 'users.json')
SETTINGS_FILE = os.path.join('api', 'global_settings.json') 
STRUCTURE_FILE = 'structure.json' 
TEMPLATES_DIR = os.path.join(DATA_ROOT, 'templates') 
os.makedirs(USER_DATA_DIR, exist_ok=True)
os.makedirs(TEMPLATES_DIR, exist_ok=True) 

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
        return default_data # WICHTIG: default_data auch im Fehlerfall zurückgeben

def _save_json(filepath, data):
    """
    Speichert JSON-Daten in einer Datei.
    Erstellt bei Bedarf die Verzeichnisse.
    """
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def is_valid_email(email):
    """Prüft, ob eine E-Mail-Adresse ein gültiges Format hat."""
    return re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email)

def get_user_data_path(user_id, data_type="projects"):
    """Gibt den Pfad zu den benutzerspezifischen Daten zurück und erstellt das Verzeichnis, falls nötig."""
    if not user_id: return None
    user_dir = os.path.join(USER_DATA_DIR, str(user_id))
    os.makedirs(user_dir, exist_ok=True)
    return os.path.join(user_dir, f"{data_type}.json")

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
    template_path = os.path.join(TEMPLATES_DIR, f"{template_id}.json")
    if not os.path.exists(template_path) or template_id == 'bsp': 
        return jsonify({"error": "Template not found."}), 404
    try:
        template_data = _load_json(template_path)
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
        return jsonify({"error": "Error loading initial project template."}), 500


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
    return redirect(url_for('dashboard'))

@app.route('/login', methods=['GET', 'POST'])
def login_route():
    """Login-Seite für Benutzer."""
    if 'user_id' in session: return redirect(url_for('dashboard'))
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register_route():
    """Registrierungsseite für neue Benutzer."""
    # Globale Einstellungen hier laden, um Registrierung zu steuern
    global_app_settings = _load_json(SETTINGS_FILE, {"registration_enabled": True}) 

    if 'user_id' in session: return redirect(url_for('dashboard'))

    # Überprüfen, ob Registrierung erlaubt ist
    if not global_app_settings.get('registration_enabled', True): 
        # Wenn JavaScript nicht aktiviert ist, wird diese Meldung angezeigt
        return render_template('register.html', registration_disabled=True)
        
    if request.method == 'POST':
        # Auch hier prüfen, falls jemand direkt POST-Request sendet
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
            
            _save_json(get_user_data_path(new_user_id, 'projects'), {})
            # ÄNDERUNG: Standard-Theme für neue Benutzer von 'light' zu 'dark'
            _save_json(get_user_data_path(new_user_id, 'settings'), {"theme": "dark"})
            _save_json(get_user_data_path(new_user_id, 'logs'), [])
            
            flash('Registrierung erfolgreich! Sie können sich jetzt anmelden.', 'success')
            return redirect(url_for('login_route'))
    return render_template('register.html', registration_disabled=False) # Übergib den Status an das Template

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

@app.route('/api/admin/structure-check')
@login_required
@admin_required
def admin_structure_check():
    """Admin-Seite für den Struktur-Check."""
    return render_template('admin_run_check.html')

# --- API-Endpunkte ---
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
    # Für GET-Anfragen ist kein Login erforderlich, da Theme-Einstellungen auch für nicht eingeloggte Benutzer relevant sind.
    # Für POST-Anfragen (Speichern von Einstellungen) ist ein Login erforderlich.
    if request.method == 'GET':
        # Wenn der Benutzer nicht angemeldet ist, geben Sie Standardeinstellungen zurück
        if 'user_id' not in session and not session.get('is_guest'):
            return jsonify({"theme": "dark"}) # Standard-Theme für nicht eingeloggte Benutzer
        
        user_settings_path = get_user_data_path(session['user_id'], 'settings')
        # ÄNDERUNG: Standard-Theme für GET-Anfragen von 'light' zu 'dark'
        return jsonify(_load_json(user_settings_path, {"theme": "dark"}))
    
    if request.method == 'POST':
        # Für POST-Anfragen (Speichern) ist ein Login erforderlich
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
        # Für POST-Anfragen bleiben die Admin-Rechte erforderlich
        if not session.get('isAdmin'):
            return jsonify({"error": "Zugriff verweigert. Sie benötigen Administratorrechte."}), 403
        
        # Lade aktuelle Einstellungen, um nur die übermittelten zu aktualisieren
        current_settings = _load_json(SETTINGS_FILE)
        updated_data = request.get_json()
        
        # Merge the incoming data with existing settings
        # This handles nested structures like guest_limits
        for key, value in updated_data.items():
            if isinstance(value, dict) and key in current_settings and isinstance(current_settings[key], dict):
                current_settings[key].update(value)
            else:
                current_settings[key] = value
                
        _save_json(SETTINGS_FILE, current_settings) # Speichere die gemergten Einstellungen
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
        # Führt das Skript im selben Verzeichnis wie app.py aus
        result = subprocess.run(
            [sys.executable, 'check_structure.py', command_flag],
            capture_output=True,
            text=True,
            encoding='utf-8',
            cwd=os.path.dirname(os.path.abspath(__file__))
        )
        log_output = result.stdout + result.stderr
        return jsonify({"log": log_output})
    except Exception as e:
        return jsonify({"log": f"Fehler bei der Ausführung des Skripts: {e}"}), 500


if __name__ == '__main__':
    app.run(debug=True)
