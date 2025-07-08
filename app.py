# -*- coding: utf-8 -*-
from flask import Flask, render_template, jsonify, request, session, redirect, url_for, flash
import json
import os
import glob

app = Flask(__name__)
# A secret key is required to use sessions
app.secret_key = 'your_very_secret_key_12345'

# --- Simple User "Database" for demonstration ---
USERS = {
    "admin": "password123",
    "user": "test"
}

DATA_FILE = os.path.join('static', 'data', 'temp_data.json')
TEMPLATES_DIR = os.path.join('static', 'data', 'templates')

# Define the default state for the data file
DEFAULT_DATA = {
  "p1": {
    "projectId": "p1",
    "projectName": "Beispielprojekt",
    "phases": [
      {
        "phaseId": "phase01", "phaseName": "Planungsphase", "isExpanded": True, "tasks": [
          { "taskId": "task01", "taskName": "Analyse", "isExpanded": True, "completed": False, "subtasks": [
              { "subtaskId": "sub01", "subtaskName": "Anforderungen definieren", "completed": True },
              { "subtaskId": "sub02", "subtaskName": "Stakeholder befragen", "completed": False }
          ]}
        ]
      }
    ]
  }
}

def load_data():
    """Lädt die Projektdatenbank (ein Dictionary von Projekten)."""
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            content = f.read()
            if not content:
                # If file is empty, initialize with default
                save_data(DEFAULT_DATA)
                return DEFAULT_DATA
            return json.loads(content)
    except (FileNotFoundError, json.JSONDecodeError):
        # If file is missing or corrupt, initialize with default data
        save_data(DEFAULT_DATA)
        return DEFAULT_DATA

def save_data(data):
    """Speichert die gesamte Projektdatenbank."""
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def calculate_progress(project):
    """Berechnet den Fortschritt eines Projekts."""
    total_items, completed_items = 0, 0
    for phase in project.get("phases", []):
        for task in phase.get("tasks", []):
            subtasks = task.get("subtasks", [])
            if len(subtasks) > 0:
                for subtask in subtasks:
                    total_items += 1
                    if subtask.get("completed"): completed_items += 1
            else:
                total_items += 1
                if task.get("completed"): completed_items += 1
    return round((completed_items / total_items) * 100) if total_items > 0 else 0

# --- Routen für die HTML-Seiten ---

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@app.route('/project/<project_id>')
def project_manager(project_id):
    return render_template('project_manager.html', project_id=project_id)

@app.route('/project/<project_id>/overview')
def project_overview(project_id):
    return render_template('project_overview.html', project_id=project_id)

@app.route('/project/<project_id>/checklist')
def project_checklist(project_id):
    return render_template('project_checklist.html', project_id=project_id)

@app.route('/settings')
def settings():
    return render_template('settings.html')

@app.route('/info')
def info():
    return render_template('info.html')

@app.route('/login', methods=['GET', 'POST'])
def login_route():
    if 'username' in session:
        return redirect(url_for('dashboard'))
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        if username in USERS and USERS[username] == password:
            session['username'] = username
            return redirect(url_for('dashboard'))
        else:
            flash('Ungültiger Benutzername oder Passwort.', 'error')
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

# --- API-Endpunkte ---

@app.route('/api/session', methods=['GET'])
def get_session():
    if 'username' in session:
        return jsonify({"logged_in": True, "username": session['username']})
    return jsonify({"logged_in": False})

@app.route('/api/projects', methods=['GET'])
def get_all_projects():
    all_data = load_data()
    project_list = [{"id": key, "name": value.get("projectName"), "progress": calculate_progress(value)} for key, value in all_data.items()]
    return jsonify(project_list)

@app.route('/api/project/<project_id>', methods=['GET'])
def get_project_data(project_id):
    all_data = load_data()
    return jsonify(all_data.get(project_id, {}))

@app.route('/api/project', methods=['POST'])
def create_project():
    new_project = request.get_json()
    project_id = new_project.get("projectId")
    if not project_id: return jsonify({"error": "Project ID is required"}), 400
    all_data = load_data()
    all_data[project_id] = new_project
    save_data(all_data)
    return jsonify({"success": True, "id": project_id})

@app.route('/api/project/<project_id>', methods=['POST'])
def update_project_data(project_id):
    all_data = load_data()
    all_data[project_id] = request.get_json()
    save_data(all_data)
    return jsonify({"success": True})

@app.route('/api/project/<project_id>', methods=['DELETE'])
def delete_project_data(project_id):
    all_data = load_data()
    if project_id in all_data: del all_data[project_id]
    save_data(all_data)
    return jsonify({"success": True})

@app.route('/api/reset-all-data', methods=['POST'])
def reset_all_data():
    save_data(DEFAULT_DATA)
    return jsonify({"success": True})

@app.route('/api/templates', methods=['GET'])
def get_templates():
    templates = []
    if not os.path.exists(TEMPLATES_DIR): return jsonify([])
    for filepath in glob.glob(os.path.join(TEMPLATES_DIR, '*.json')):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                template_data = json.load(f)
                if template_data.get("name"):
                    templates.append({"id": os.path.splitext(os.path.basename(filepath))[0], "name": template_data.get("name")})
        except Exception as e:
            print(f"Error loading template {filepath}: {e}")
    return jsonify(templates)

@app.route('/api/template/<template_id>', methods=['GET'])
def get_template_data(template_id):
    filepath = os.path.join(TEMPLATES_DIR, f"{template_id}.json")
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return jsonify(json.load(f).get("data", {}))
    except FileNotFoundError:
        return jsonify({"error": "Vorlage nicht gefunden"}), 404

# --- Main Execution ---
if __name__ == '__main__':
    app.run(debug=True)
