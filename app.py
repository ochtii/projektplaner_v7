import os
import json
import re
import uuid
from functools import wraps
from datetime import datetime
from flask import Flask, render_template, jsonify, request, session, redirect, url_for, flash

app = Flask(__name__)
app.secret_key = 'your_very_secret_key_12345'

# --- Konfiguration ---
DATA_ROOT = os.path.join('static', 'data')
USER_DATA_DIR = os.path.join(DATA_ROOT, 'user_data')
USERS_FILE = os.path.join(DATA_ROOT, 'users.json')
SETTINGS_FILE = os.path.join(DATA_ROOT, 'global_settings.json')
os.makedirs(USER_DATA_DIR, exist_ok=True)

# --- Helper-Funktionen ---

def _load_json(filepath, default_data={}):
    if not os.path.exists(filepath): return default_data
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            return json.loads(content) if content else default_data
    except (json.JSONDecodeError, FileNotFoundError):
        return default_data

def _save_json(filepath, data):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def is_valid_email(email):
    return re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email)

def get_user_data_path(user_id, data_type="projects"):
    if not user_id: return None
    user_dir = os.path.join(USER_DATA_DIR, str(user_id))
    os.makedirs(user_dir, exist_ok=True)
    return os.path.join(user_dir, f"{data_type}.json")

# --- Decorators ---

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session and not session.get('is_guest'):
            flash("Sie müssen angemeldet sein, um diese Seite zu sehen.", "error")
            return redirect(url_for('login_route'))
        return f(*args, **kwargs)
    return decorated_function

# --- Routen für Seiten ---

@app.route('/')
def index():
    if 'user_id' in session: return redirect(url_for('dashboard'))
    return render_template('index.html')

@app.route('/guest')
def guest_login():
    session.clear()
    session['is_guest'] = True
    session['username'] = 'Gast'
    return redirect(url_for('dashboard'))

@app.route('/login', methods=['GET', 'POST'])
def login_route():
    if 'user_id' in session: return redirect(url_for('dashboard'))
    if request.method == 'POST':
        identifier = request.form.get('identifier')
        password = request.form.get('password')
        users = _load_json(USERS_FILE)
        user_info, username = None, None
        
        for name, info in users.items():
            if info.get('email') == identifier or name == identifier:
                user_info = info
                username = name
                break
        
        if user_info and user_info.get('password') == password:
            session.clear()
            session['user_id'] = user_info['id']
            session['username'] = username
            session['isAdmin'] = user_info.get('isAdmin', False)
            return redirect(url_for('dashboard'))
        else:
            flash('Ungültige Anmeldedaten.', 'error')
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register_route():
    if 'user_id' in session: return redirect(url_for('dashboard'))
    if request.method == 'POST':
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
            _save_json(get_user_data_path(new_user_id, 'settings'), {"theme": "light"})
            _save_json(get_user_data_path(new_user_id, 'logs'), [])
            
            flash('Registrierung erfolgreich! Sie können sich jetzt anmelden.', 'success')
            return redirect(url_for('login_route'))
    return render_template('register.html')

@app.route('/logout')
def logout():
    session.clear()
    flash("Sie wurden erfolgreich abgemeldet.", "success")
    return redirect(url_for('index'))

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html')

@app.route('/project/<project_id>')
@login_required
def project_manager(project_id):
    return render_template('project_manager.html', project_id=project_id)

@app.route('/settings')
@login_required
def settings():
    return render_template('settings.html')

@app.route('/info')
def info():
    return render_template('info.html')

@app.route('/agb')
def agb():
    return render_template('agb.html')

# --- API-Endpunkte ---

@app.route('/api/session', methods=['GET'])
def get_session():
    if session.get('is_guest'):
        return jsonify({"logged_in": False, "is_guest": True, "username": "Gast"})
    if 'user_id' in session:
        return jsonify({"logged_in": True, "is_guest": False, "username": session.get('username')})
    return jsonify({"logged_in": False, "is_guest": False})

@app.route('/api/settings', methods=['GET', 'POST'])
@login_required
def handle_settings():
    if session.get('is_guest'):
        return jsonify({"error": "Guests cannot access server settings"}), 403
    
    user_settings_path = get_user_data_path(session['user_id'], 'settings')
    if request.method == 'GET':
        return jsonify(_load_json(user_settings_path, {"theme": "light"}))
    if request.method == 'POST':
        _save_json(user_settings_path, request.get_json())
        return jsonify({"success": True})

@app.route('/api/global-settings', methods=['GET'])
def get_global_settings():
    return jsonify(_load_json(SETTINGS_FILE))

@app.route('/api/projects', methods=['GET'])
@login_required
def get_all_projects():
    if session.get('is_guest'): return jsonify([])
    user_projects_path = get_user_data_path(session['user_id'], 'projects')
    return jsonify(list(_load_json(user_projects_path).values()))

@app.route('/api/project', methods=['POST'])
@login_required
def create_project():
    if session.get('is_guest'): return jsonify({"error": "Guests cannot create server projects"}), 403
    user_projects_path = get_user_data_path(session['user_id'], 'projects')
    projects = _load_json(user_projects_path)
    new_project = request.get_json()
    projects[new_project['projectId']] = new_project
    _save_json(user_projects_path, projects)
    return jsonify(new_project)

@app.route('/api/project/<project_id>', methods=['GET', 'POST', 'DELETE'])
@login_required
def handle_project(project_id):
    if session.get('is_guest'): return jsonify({"error": "Guests cannot access server projects"}), 403
    user_projects_path = get_user_data_path(session['user_id'], 'projects')
    projects = _load_json(user_projects_path)
    
    if request.method == 'GET':
        return jsonify(projects.get(project_id, {}))
    if request.method == 'POST':
        projects[project_id] = request.get_json()
        _save_json(user_projects_path, projects)
        return jsonify({"success": True})
    if request.method == 'DELETE':
        if project_id in projects:
            del projects[project_id]
            _save_json(user_projects_path, projects)
        return jsonify({"success": True})

if __name__ == '__main__':
    app.run(debug=True)
