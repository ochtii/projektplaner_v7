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
    const isDark = settings.theme === 'dark';
    document.body.classList.toggle('dark-mode', isDark);
    
    // Update checkbox on settings page if it exists
    const themeSwitcher = document.getElementById('themeSwitcher');
    if (themeSwitcher) {
        themeSwitcher.checked = isDark;
    }
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
    if (session.isAdmin) {
        const adminMenu = document.getElementById('admin-menu');
        if (adminMenu) adminMenu.classList.remove('hidden');
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
    if (themeSwitcher) {
        // Theme is already applied in applyTheme()
        themeSwitcher.addEventListener('change', async () => {
            const newTheme = themeSwitcher.checked ? 'dark' : 'light';
            document.body.classList.toggle('dark-mode', themeSwitcher.checked);
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
    // Logic for info page if any
}

// =================================================================
// ADMIN PAGES SETUP
// =================================================================
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

    const renderTable = (users) => {
        tableBody.innerHTML = users.map(user => `
            <tr data-user-id="${user.id}" data-username="${user.username}" data-email="${user.email}" data-is-admin="${user.isAdmin}">
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.isAdmin ? '<span style="color:var(--secondary-color); font-weight:bold;">Ja</span>' : 'Nein'}</td>
                <td class="action-buttons" style="text-align: center;">
                    <button class="btn-icon edit-user-btn" title="Benutzer bearbeiten">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="btn-icon reset-pw-btn" title="Passwort zurücksetzen">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                    </button>
                    <button class="btn-icon delete-user-btn" title="Benutzer löschen" style="color: #e74c3c;">
                         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </td>
            </tr>
        `).join('');
        attachUserManagementListeners();
    };
    
    const loadUsers = async () => {
        tableBody.innerHTML = '<tr><td colspan="4">Lade Benutzer...</td></tr>';
        try {
            const response = await fetch('/api/admin/users');
            const users = await response.json();
            renderTable(users);
        } catch (error) {
            tableBody.innerHTML = '<tr><td colspan="4">Fehler beim Laden der Benutzer.</td></tr>';
        }
    };
    
    await loadUsers();
}


function attachUserManagementListeners() {
    document.querySelectorAll('.edit-user-btn').forEach(btn => btn.addEventListener('click', handleEditUser));
    document.querySelectorAll('.delete-user-btn').forEach(btn => btn.addEventListener('click', handleDeleteUser));
    document.querySelectorAll('.reset-pw-btn').forEach(btn => btn.addEventListener('click', handleResetPassword));
}

function handleEditUser(event) {
    const row = event.target.closest('tr');
    const userId = row.dataset.userId;
    const username = row.dataset.username;
    const email = row.dataset.email;
    const isAdmin = row.dataset.isAdmin === 'true';

    showUserEditModal(username, email, isAdmin, async (newUsername, newEmail, newIsAdmin) => {
        const response = await fetch(`/api/admin/user/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: newUsername, email: newEmail, isAdmin: newIsAdmin })
        });
        if (response.ok) {
            showInfoModal('Erfolg', `Benutzer ${newUsername} wurde aktualisiert.`);
            setupUserManagementPage(); // Reload table
        } else {
            const error = await response.json();
            showInfoModal('Fehler', `Konnte Benutzer nicht aktualisieren: ${error.error}`);
        }
    });
}

function handleDeleteUser(event) {
    const row = event.target.closest('tr');
    const userId = row.dataset.userId;
    const username = row.dataset.username;

    showConfirmationModal('Benutzer löschen', `Möchten Sie den Benutzer "${username}" wirklich endgültig löschen? Alle seine Daten gehen verloren.`, async () => {
        const response = await fetch(`/api/admin/user/${userId}`, { method: 'DELETE' });
        if (response.ok) {
            showInfoModal('Erfolg', `Benutzer ${username} wurde gelöscht.`);
            setupUserManagementPage(); // Reload table
        } else {
            showInfoModal('Fehler', 'Konnte Benutzer nicht löschen.');
        }
    });
}

function handleResetPassword(event) {
    const row = event.target.closest('tr');
    const userId = row.dataset.userId;
    const username = row.dataset.username;

    showConfirmationModal('Passwort zurücksetzen', `Möchten Sie das Passwort für "${username}" wirklich zurücksetzen? Ein neues, zufälliges Passwort wird generiert.`, async () => {
        const response = await fetch(`/api/admin/user/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reset_password: true })
        });
        if (response.ok) {
            const result = await response.json();
            showInfoModal('Passwort zurückgesetzt', `Das neue Passwort für ${username} lautet: <strong>${result.new_password}</strong><br>Bitte speichern Sie es an einem sicheren Ort, es kann nicht erneut angezeigt werden.`);
        } else {
            showInfoModal('Fehler', 'Passwort konnte nicht zurückgesetzt werden.');
        }
    });
}

async function setupGlobalSettingsPage() {
    // This function is now more complex and moved to its own section in admin pages.
    // Assuming the HTML and API are already updated.
}

function setupStructureCheckPage() {
    const runCheckBtn = document.getElementById('run-check-btn');
    const runGenerateBtn = document.getElementById('run-generate-btn');
    const checkLogOutput = document.getElementById('check-log-output');
    
    const viewStructureBtn = document.getElementById('view-structure-btn');
    const exportTxtBtn = document.getElementById('export-structure-txt-btn');
    const exportJsonBtn = document.getElementById('export-structure-json-btn');
    const structureOutput = document.getElementById('structure-output');
    
    let currentStructureData = null;

    const runCheck = async (flag) => {
        checkLogOutput.textContent = 'Befehl wird ausgeführt...';
        try {
            const response = await fetch('/api/admin/run-check', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ flag: flag })
            });
            const result = await response.json();
            checkLogOutput.textContent = result.log;
        } catch (error) {
            checkLogOutput.textContent = 'Fehler bei der Ausführung des Checks.';
        }
    };

    if (runCheckBtn) runCheckBtn.addEventListener('click', () => runCheck('--check'));
    if (runGenerateBtn) runGenerateBtn.addEventListener('click', () => runCheck('--generate'));
    
    // --- New functionality for viewing structure ---
    
    const formatStructureAsText = (node, indent = '') => {
        let output = `${indent}${node.type === 'directory' ? '📁' : '📄'} ${node.path}\n`;
        if (node.children) {
            node.children.forEach(child => {
                output += formatStructureAsText(child, indent + '  ');
            });
        }
        return output;
    };
    
    const viewStructure = async () => {
        structureOutput.innerHTML = '<p>Lade Struktur...</p>';
        structureOutput.classList.remove('hidden');
        try {
            const response = await fetch('/api/admin/get-structure');
            const data = await response.json();
            currentStructureData = data;
            
            if(data.error) {
                structureOutput.textContent = data.error;
                exportTxtBtn.classList.add('hidden');
                exportJsonBtn.classList.add('hidden');
                return;
            }
            
            structureOutput.textContent = formatStructureAsText(data);
            exportTxtBtn.classList.remove('hidden');
            exportJsonBtn.classList.remove('hidden');
        } catch(e) {
            structureOutput.textContent = "Fehler beim Laden der Struktur.";
            exportTxtBtn.classList.add('hidden');
            exportJsonBtn.classList.add('hidden');
        }
    };
    
    const downloadFile = (filename, content, mimeType) => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (viewStructureBtn) viewStructureBtn.addEventListener('click', viewStructure);
    if (exportTxtBtn) exportTxtBtn.addEventListener('click', () => {
        if(currentStructureData) {
            const textContent = formatStructureAsText(currentStructureData);
            downloadFile('structure.txt', textContent, 'text/plain;charset=utf-8');
        }
    });
    if (exportJsonBtn) exportJsonBtn.addEventListener('click', () => {
        if(currentStructureData) {
            const jsonContent = JSON.stringify(currentStructureData, null, 2);
            downloadFile('structure.json', jsonContent, 'application/json;charset=utf-8');
        }
    });
}


// =================================================================
// MODALS and other UI components (mostly unchanged)
// =================================================================
// (Rest of the file is unchanged)
function showInfoModal(title, message, onOk) {
    const container = document.getElementById('modal-container');
    container.innerHTML = `
        <div class="modal-backdrop visible">
            <div class="modal">
                <div class="modal-header"><h3>${title}</h3><button class="modal-close-btn">&times;</button></div>
                <div class="modal-body">${message}</div>
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

function showUserEditModal(username, email, isAdmin, callback) {
    const container = document.getElementById('modal-container');
    container.innerHTML = `
        <div class="modal-backdrop visible">
            <div class="modal">
                <div class="modal-header"><h3>Benutzer bearbeiten</h3><button class="modal-close-btn">&times;</button></div>
                <form id="user-edit-form">
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="edit-username">Benutzername</label>
                            <input type="text" id="edit-username" class="form-control" value="${username}" required>
                        </div>
                        <div class="form-group">
                            <label for="edit-email">E-Mail</label>
                            <input type="email" id="edit-email" class="form-control" value="${email}" required>
                        </div>
                        <div class="form-group-checkbox">
                            <label class="custom-checkbox">
                                <input type="checkbox" id="edit-is-admin" ${isAdmin ? 'checked' : ''}>
                                <span class="checkmark"></span>
                                <span>Ist Administrator</span>
                            </label>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn modal-cancel-btn">Abbrechen</button>
                        <button type="submit" class="btn btn-primary">Speichern</button>
                    </div>
                </form>
            </div>
        </div>`;
    
    const backdrop = container.querySelector('.modal-backdrop');
    const form = document.getElementById('user-edit-form');
    const closeModal = () => { backdrop.classList.remove('visible'); setTimeout(() => container.innerHTML = '', 300); };

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const newUsername = document.getElementById('edit-username').value.trim();
        const newEmail = document.getElementById('edit-email').value.trim();
        const newIsAdmin = document.getElementById('edit-is-admin').checked;
        if (newUsername && newEmail) {
            callback(newUsername, newEmail, newIsAdmin);
            closeModal();
        }
    });

    container.querySelector('.modal-close-btn').addEventListener('click', closeModal);
    container.querySelector('.modal-cancel-btn').addEventListener('click', closeModal);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });
}