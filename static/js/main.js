"use strict";

// =================================================================
// GLOBAL STATE & INITIALIZATION
// =================================================================
let currentProjectData = null;
let currentProjectId = null;
let currentlySelectedItem = null;
let currentlySelectedType = null;
let db; // This will be our database interface (either API or LocalStorage)
let currentUser = null; // Holds session info like { username, is_guest, isAdmin }
let globalSettings = {}; // Guest limits etc.

// =================================================================
// DATABASE ABSTRACTION
// =================================================================
const apiDb = {
    async getProjects() { return (await fetch('/api/projects')).json(); },
    async getProject(id) { return (await fetch(`/api/project/${id}`)).json(); },
    async saveProject(id, data) { return fetch(`/api/project/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); },
    async createProject(data) { return fetch('/api/project', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); },
    async deleteProject(id) { return fetch(`/api/project/${id}`, { method: 'DELETE' }); },
    async getSettings() { return (await fetch('/api/settings')).json(); },
    async saveSettings(data) { return fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); },
    async resetAllData() { return fetch('/api/reset-all-data', { method: 'POST' }); }
};

const guestDb = {
    _getProjects() { try { return JSON.parse(localStorage.getItem('guestProjects') || '{}'); } catch (e) { return {}; } },
    _saveProjects(p) { localStorage.setItem('guestProjects', JSON.stringify(p)); },
    async getProjects() { 
        const projects = this._getProjects();
        return Object.values(projects).map(p => ({ ...p, id: p.projectId, name: p.projectName, progress: this._calculateProgress(p) }));
    },
    async getProject(id) { return this._getProjects()[id] || null; },
    async saveProject(id, data) {
        const projects = this._getProjects();
        projects[id] = data;
        this._saveProjects(projects);
        return { ok: true };
    },
    async createProject(data) {
        const projects = this._getProjects();
        if (Object.keys(projects).length >= (globalSettings?.guest_limits?.projects || 1)) {
            showInfoModal('Limit erreicht', `Als Gast können Sie maximal ${globalSettings.guest_limits.projects} Projekte erstellen.`);
            return { ok: false };
        }
        projects[data.projectId] = data;
        this._saveProjects(projects);
        return { ok: true, json: async () => data };
    },
    async deleteProject(id) {
        const projects = this._getProjects();
        delete projects[id];
        this._saveProjects(projects);
        return { ok: true };
    },
    _calculateProgress(project) {
        let total = 0, completed = 0;
        (project.phases || []).forEach(phase => {
            (phase.tasks || []).forEach(task => {
                const items = task.subtasks && task.subtasks.length > 0 ? task.subtasks : [task];
                total += items.length;
                completed += items.filter(i => i.done).length;
            });
        });
        return total > 0 ? Math.round((completed / total) * 100) : 0;
    },
    async getSettings() { return { theme: localStorage.getItem('theme') || 'light' }; },
    async saveSettings(s) { 
        localStorage.setItem('theme', s.theme);
        return { ok: true };
    },
    async resetAllData() {
        localStorage.removeItem('guestProjects');
        return { ok: true };
    }
};

// =================================================================
// INITIALIZATION
// =================================================================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const [session, settings] = await Promise.all([
            fetch('/api/session').then(res => res.json()),
            fetch('/api/global-settings').then(res => res.json())
        ]);
        
        currentUser = session;
        globalSettings = settings;
        db = session.is_guest ? guestDb : apiDb;

        const publicPages = ['/', '/login', '/register', '/info', '/agb'];
        if (!session.logged_in && !session.is_guest && !publicPages.includes(window.location.pathname)) {
            window.location.href = '/login';
            return;
        }
        
        await applyTheme();
        runPageSpecificSetup();

    } catch (error) {
        console.error("Initialization failed:", error);
    }
});

async function applyTheme() {
    const settings = await db.getSettings();
    document.body.classList.toggle('dark-mode', settings.theme === 'dark');
}

function runPageSpecificSetup() {
    setupGlobalUI(currentUser);
    const path = window.location.pathname;
    if (path.startsWith('/project/')) {
        const projectId = path.split('/')[2];
        setupProjectManagerPage(projectId);
    } else if (path.startsWith('/dashboard')) {
        setupDashboardPage();
    } else if (path.startsWith('/settings')) {
        setupSettingsPage();
    } else if (path.startsWith('/info') || path.startsWith('/agb')) {
        setupInfoPage();
    } else if (path.startsWith('/admin')) {
        setupAdminPages();
    }
}

// =================================================================
// PAGE-SPECIFIC SETUP
// =================================================================
function setupGlobalUI(session) {
    const headerActions = document.getElementById('header-actions');
    if (headerActions) {
        if (session.logged_in) {
            headerActions.innerHTML = `<span>Willkommen, <strong>${session.username}</strong></span><a href="/logout" class="btn btn-secondary btn-sm">Logout</a>`;
        } else if (session.is_guest) {
            headerActions.innerHTML = `<span><strong>Gast-Modus</strong></span><a href="/login" class="btn btn-primary btn-sm">Anmelden</a>`;
        } else {
            headerActions.innerHTML = `<a href="/login" class="btn btn-secondary">Anmelden</a><a href="/register" class="btn btn-primary">Registrieren</a>`;
        }
    }
    document.querySelectorAll('.main-nav .submenu-toggle').forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            toggle.classList.toggle('open');
            toggle.nextElementSibling.classList.toggle('open');
        });
    });
    // Admin-Menü anzeigen, wenn der Benutzer Admin ist
    if (session.isAdmin) {
        const adminMenu = document.getElementById('admin-menu');
        if (adminMenu) {
            adminMenu.classList.remove('hidden');
        }
    }
}

async function setupDashboardPage() {
    document.getElementById('create-project-btn')?.addEventListener('click', createNewProject);
    renderProjectGrid();
}

async function setupProjectManagerPage(projectId) {
    currentProjectId = projectId;
    await loadProjectData(projectId);
    document.getElementById('add-phase-btn')?.addEventListener('click', () => addNewItem(null, 'Phase'));
    document.getElementById('delete-project-btn')?.addEventListener('click', deleteCurrentProject);
}

async function setupSettingsPage() {
    const themeSwitcher = document.getElementById('themeSwitcher');
    const themeLabel = document.getElementById('theme-label');

    if (themeSwitcher && themeLabel) {
        const isDark = document.body.classList.contains('dark-mode');
        themeSwitcher.checked = isDark;
        themeLabel.textContent = isDark ? 'Dark Mode' : 'Light Mode';

        themeSwitcher.addEventListener('change', async () => {
            const newTheme = themeSwitcher.checked ? 'dark' : 'light';
            document.body.classList.toggle('dark-mode', themeSwitcher.checked);
            themeLabel.textContent = newTheme === 'dark' ? 'Dark Mode' : 'Light Mode';
            await db.saveSettings({ theme: newTheme });
        });
    }

    const deleteAppDataBtn = document.getElementById('delete-app-data-btn');
    if (deleteAppDataBtn) {
        deleteAppDataBtn.addEventListener('click', () => {
            const message = currentUser.is_guest 
                ? 'Möchten Sie wirklich alle Ihre im Browser gespeicherten Projekte löschen?'
                : 'Möchten Sie wirklich alle Ihre Projekte und Einstellungen auf dem Server unwiderruflich löschen?';
            
            showConfirmationModal('Alle Daten löschen?', message, async () => {
                await db.resetAllData();
                showInfoModal('Erfolg', 'Alle Ihre Daten wurden gelöscht.', () => {
                    window.location.href = '/dashboard';
                });
            });
        });
    }
}

function setupInfoPage() {
    const supportForm = document.getElementById('support-form');
    if (supportForm) {
        if (currentUser && currentUser.logged_in) {
            document.getElementById('support-name').value = currentUser.username;
        }
        supportForm.addEventListener('submit', (e) => {
            e.preventDefault();
            showInfoModal('Nachricht gesendet', 'Vielen Dank für Ihre Nachricht (dies ist eine Demo).');
            supportForm.reset();
        });
    }
}

function setupAdminPages() {
    const path = window.location.pathname;
    if (path.endsWith('/users')) {
        setupUserManagementPage();
    } else if (path.endsWith('/settings')) {
        setupGlobalSettingsPage();
    } else if (path.endsWith('/structure-check')) {
        setupStructureCheckPage();
    }
}

async function setupUserManagementPage() {
    const tableBody = document.querySelector('#user-table tbody');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="4">Lade Benutzer...</td></tr>';

    try {
        const response = await fetch('/api/admin/users');
        const users = await response.json();
        
        tableBody.innerHTML = Object.entries(users).map(([username, data]) => `
            <tr>
                <td>${username}</td>
                <td>${data.email}</td>
                <td>${data.isAdmin ? 'Ja' : 'Nein'}</td>
                <td>
                    <button class="btn btn-secondary btn-sm">Bearbeiten</button>
                    <button class="btn btn-danger btn-sm">Löschen</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        tableBody.innerHTML = '<tr><td colspan="4">Fehler beim Laden der Benutzer.</td></tr>';
    }
}

async function setupGlobalSettingsPage() {
    const container = document.getElementById('global-settings-form-container');
    if (!container) return;
    container.innerHTML = '<p>Lade globale Einstellungen...</p>';
    try {
        const response = await fetch('/api/admin/global-settings');
        const settings = await response.json();
        
        container.innerHTML = `
            <form id="global-settings-form">
                <div class="form-group">
                    <label for="guest-projects-limit">Max. Projekte für Gäste</label>
                    <input type="number" id="guest-projects-limit" class="form-control" value="${settings.guest_limits.projects}">
                </div>
                 <div class="form-group">
                    <label class="custom-checkbox">
                        <input type="checkbox" id="general-debug" ${settings.general_debug ? 'checked' : ''}>
                        <span class="checkmark"></span>
                        <span>Allgemeines Debugging aktivieren</span>
                    </label>
                </div>
                <button type="submit" class="btn btn-primary">Einstellungen speichern</button>
            </form>
        `;

        document.getElementById('global-settings-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const newSettings = {
                guest_limits: {
                    projects: parseInt(document.getElementById('guest-projects-limit').value)
                },
                general_debug: document.getElementById('general-debug').checked
            };
            await fetch('/api/admin/global-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSettings)
            });
            showInfoModal('Gespeichert', 'Die globalen Einstellungen wurden aktualisiert.');
        });

    } catch (error) {
        container.innerHTML = '<p>Fehler beim Laden der Einstellungen.</p>';
    }
}

function setupStructureCheckPage() {
    const runCheckBtn = document.getElementById('run-check-btn');
    const runGenerateBtn = document.getElementById('run-generate-btn');
    const output = document.getElementById('check-log-output');
    
    const runCheck = async (flag) => {
        output.textContent = 'Befehl wird ausgeführt...';
        try {
            const response = await fetch('/api/admin/run-check', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ flag: flag })
            });
            const result = await response.json();
            output.textContent = result.log;
        } catch (error) {
            output.textContent = 'Fehler bei der Ausführung des Checks.';
        }
    };

    if (runCheckBtn) runCheckBtn.addEventListener('click', () => runCheck('--check'));
    if (runGenerateBtn) runGenerateBtn.addEventListener('click', () => runCheck('--generate'));
}


// =================================================================
// DYNAMIC CONTENT RENDERING
// =================================================================
async function renderProjectGrid() {
    const grid = document.getElementById('project-grid');
    if (!grid) return;
    grid.innerHTML = '<p>Lade Projekte...</p>';
    try {
        const projects = await db.getProjects();
        if (projects.length === 0) {
            grid.innerHTML = '<p>Noch keine Projekte erstellt.</p>';
            return;
        }
        grid.innerHTML = projects.map(p => `
            <div class="project-card">
                <h3>${p.projectName || 'Unbenanntes Projekt'}</h3>
                <div class="project-card-actions">
                    <a href="/project/${p.projectId}" class="btn btn-primary btn-sm">Öffnen</a>
                </div>
            </div>`).join('');
    } catch (error) {
        grid.innerHTML = '<p>Projekte konnten nicht geladen werden.</p>';
    }
}

function renderProjectTree() {
    const container = document.getElementById('projectTree');
    if (!container) return;
    container.innerHTML = '';
    if (!currentProjectData || !currentProjectData.phases || currentProjectData.phases.length === 0) {
        container.innerHTML = '<li>Klicken Sie unten auf "Neue Phase hinzufügen", um zu beginnen.</li>';
        return;
    }
    currentProjectData.phases.forEach((phase, i) => {
        container.appendChild(createTreeItem(phase, 'Phase', `${i + 1}.`));
    });
}

function createTreeItem(item, type, prefix) {
    const li = document.createElement('li');
    const id = item.phaseId || item.taskId || item.subtaskId;
    li.dataset.id = id;
    
    const itemContainer = document.createElement('div');
    itemContainer.className = 'tree-item';
    
    const label = document.createElement('span');
    label.className = 'tree-item-label';
    label.textContent = `${prefix} ${item.phaseName || item.taskName || item.subtaskName}`;
    itemContainer.appendChild(label);

    li.appendChild(itemContainer);
    return li;
}

// =================================================================
// DATA MANAGEMENT & PERSISTENCE
// =================================================================
async function loadProjectData(projectId) {
    try {
        const data = await db.getProject(projectId);
        if (!data) {
            showInfoModal("Fehler", "Projekt nicht gefunden.");
            window.location.href = '/dashboard';
            return;
        }
        currentProjectData = data;
        document.getElementById('page-main-title').textContent = `Projekt: ${currentProjectData.projectName}`;
        renderProjectTree();
    } catch (error) {
        console.error('Fehler beim Laden der Projektdaten:', error);
    }
}

async function updateProjectData() {
    if (!currentProjectData || !currentProjectId) return;
    await db.saveProject(currentProjectId, currentProjectData);
    renderProjectTree();
}

async function deleteCurrentProject() {
    if (!currentProjectId || !currentProjectData) return;
    showConfirmationModal('Projekt löschen', `Möchten Sie das Projekt "${currentProjectData.projectName}" wirklich löschen?`, async () => {
        await db.deleteProject(currentProjectId);
        window.location.href = '/dashboard';
    });
}

async function createNewProject() {
    showInputModal('Neues Projekt erstellen', 'Projektname', async (name) => {
        const newProjectId = 'proj_' + Date.now();
        const newProject = {
            projectId: newProjectId,
            projectName: name,
            phases: []
        };
        const response = await db.createProject(newProject);
        if (response.ok) {
            const created = await response.json();
            window.location.href = `/project/${created.projectId}`;
        }
    });
}

function addNewItem(parent, typeToAdd) {
    showInputModal(`Neue ${typeToAdd} erstellen`, 'Name', (name) => {
        const keyPrefix = typeToAdd === 'Phase' ? 'phase' : 'task';
        const newItem = {
            [`${keyPrefix}Id`]: `${keyPrefix}_${Date.now()}`,
            [`${keyPrefix}Name`]: name,
            done: false,
            isExpanded: true,
            tasks: []
        };
        
        if (typeToAdd === 'Phase') {
            if (!currentProjectData.phases) currentProjectData.phases = [];
            currentProjectData.phases.push(newItem);
        } else if (typeToAdd === 'Aufgabe' && parent) {
            if (!parent.tasks) parent.tasks = [];
            parent.tasks.push(newItem);
        }
        updateProjectData();
    });
}

// =================================================================
// MODALS
// =================================================================
function showInputModal(title, label, callback, defaultValue = '') {
    const container = document.getElementById('modal-container');
    container.innerHTML = `
        <div class="modal-backdrop visible">
            <div class="modal">
                <div class="modal-header"><h3>${title}</h3><button class="modal-close-btn">&times;</button></div>
                <form id="modal-form">
                    <div class="modal-body"><div class="form-group"><label for="modal-input">${label}</label><input type="text" id="modal-input" class="form-control" value="${defaultValue}" required autofocus></div></div>
                    <div class="modal-footer"><button type="button" class="btn modal-cancel-btn">Abbrechen</button><button type="submit" class="btn btn-primary">Speichern</button></div>
                </form>
            </div>
        </div>`;
    const backdrop = container.querySelector('.modal-backdrop');
    const form = document.getElementById('modal-form');
    const input = document.getElementById('modal-input');
    input.select();
    const closeModal = () => { backdrop.classList.remove('visible'); setTimeout(() => container.innerHTML = '', 300); };
    form.addEventListener('submit', (e) => { e.preventDefault(); const value = input.value.trim(); if (value) { callback(value); closeModal(); } });
    container.querySelector('.modal-close-btn').addEventListener('click', closeModal);
    container.querySelector('.modal-cancel-btn').addEventListener('click', closeModal);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });
}

function showConfirmationModal(title, message, onConfirm) {
    const container = document.getElementById('modal-container');
    container.innerHTML = `
        <div class="modal-backdrop visible">
            <div class="modal">
                <div class="modal-header"><h3>${title}</h3><button class="modal-close-btn">&times;</button></div>
                <div class="modal-body"><p>${message}</p></div>
                <div class="modal-footer"><button type="button" class="btn modal-cancel-btn">Abbrechen</button><button type="button" class="btn btn-danger modal-confirm-btn">Bestätigen</button></div>
            </div>
        </div>`;
    const backdrop = container.querySelector('.modal-backdrop');
    const closeModal = () => { backdrop.classList.remove('visible'); setTimeout(() => container.innerHTML = '', 300); };
    container.querySelector('.modal-confirm-btn').addEventListener('click', () => { onConfirm(); closeModal(); });
    container.querySelector('.modal-close-btn').addEventListener('click', closeModal);
    container.querySelector('.modal-cancel-btn').addEventListener('click', closeModal);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });
}

function showInfoModal(title, message, onOk) {
    const container = document.getElementById('modal-container');
    container.innerHTML = `
        <div class="modal-backdrop visible">
            <div class="modal">
                <div class="modal-header"><h3>${title}</h3><button class="modal-close-btn">&times;</button></div>
                <div class="modal-body"><p>${message}</p></div>
                <div class="modal-footer"><button type="button" class="btn btn-primary modal-ok-btn">OK</button></div>
            </div>
        </div>`;
    const backdrop = container.querySelector('.modal-backdrop');
    const closeModal = () => {
        backdrop.classList.remove('visible');
        setTimeout(() => { container.innerHTML = ''; if(onOk) onOk(); }, 300);
    };
    container.querySelector('.modal-ok-btn').addEventListener('click', closeModal);
    container.querySelector('.modal-close-btn').addEventListener('click', closeModal);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });
}
