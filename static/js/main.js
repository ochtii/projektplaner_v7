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
        const path = window.location.pathname;
        if (!session.logged_in && !session.is_guest && !publicPages.some(p => path.startsWith(p))) {
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

    const themeSwitcher = document.getElementById('themeSwitcher');
    if (themeSwitcher) {
        themeSwitcher.checked = isDark;
    }
}


function runPageSpecificSetup() {
    setupGlobalUI(currentUser);
    const path = window.location.pathname;
    
    // Check if we are on a project page
    const projectPageMatch = path.match(/^\/project(?:-overview|-checklist)?\/([a-zA-Z0-9_]+)/);

    if (projectPageMatch) {
        const projectId = projectPageMatch[1];
        setupProjectPages(projectId, path);
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
            const submenu = toggle.nextElementSibling;
            if (submenu.classList.contains('open')) {
                submenu.classList.remove('open');
                toggle.classList.remove('open');
            } else {
                document.querySelectorAll('.main-nav .submenu.open').forEach(openSubmenu => {
                    openSubmenu.classList.remove('open');
                    openSubmenu.previousElementSibling.classList.remove('open');
                });
                submenu.classList.add('open');
                toggle.classList.add('open');
            }
        });
    });
    if (session.isAdmin) {
        const adminMenu = document.getElementById('admin-menu');
        if (adminMenu) adminMenu.classList.remove('hidden');
    }
}

// Setup for all project-related pages
async function setupProjectPages(projectId, currentPath) {
    currentProjectId = projectId;
    const projectMenu = document.getElementById('current-project-menu');

    if (projectMenu) {
        projectMenu.classList.remove('hidden');
        document.getElementById('current-project-overview-link').href = `/project-overview/${projectId}`;
        document.getElementById('current-project-editor-link').href = `/project/${projectId}`;
        document.getElementById('current-project-checklist-link').href = `/project-checklist/${projectId}`;
        
        projectMenu.querySelector('.submenu-toggle').classList.add('open');
        projectMenu.querySelector('.submenu').classList.add('open');
    }

    if (currentPath.startsWith('/project/')) {
        await setupProjectManagerPage();
    }
}

async function setupDashboardPage() {
    document.getElementById('create-project-btn')?.addEventListener('click', createNewProject);
    renderProjectGrid();
}

async function setupProjectManagerPage() {
    const projectData = await db.getProject(currentProjectId);
    if (projectData) {
        currentProjectData = projectData;
        document.getElementById('page-main-title').textContent = `Projekt: ${projectData.projectName}`;
        renderProjectTree(currentProjectData, document.getElementById('projectTree'));
    }
    document.getElementById('add-phase-btn')?.addEventListener('click', () => addNewItem('phase'));
    document.getElementById('delete-project-btn')?.addEventListener('click', deleteCurrentProject);
}


async function setupSettingsPage() {
    const themeSwitcher = document.getElementById('themeSwitcher');
    if (themeSwitcher) {
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
// PROJECT HANDLING
// =================================================================
async function renderProjectGrid() {
    const grid = document.getElementById('project-grid');
    if (!grid) return;
    grid.innerHTML = '<p>Lade Projekte...</p>';
    const projects = await db.getProjects();
    if (!projects || projects.length === 0) {
        grid.innerHTML = '<p>Sie haben noch keine Projekte erstellt. Klicken Sie oben auf "Neues Projekt erstellen", um loszulegen.</p>';
        return;
    }
    grid.innerHTML = projects.map(p => `
        <div class="project-card">
            <h3>${p.name || p.projectName}</h3>
            <div class="project-card-actions">
                <a href="/project/${p.id || p.projectId}" class="btn btn-primary">Öffnen</a>
            </div>
        </div>
    `).join('');
}

async function createNewProject() {
    const projectName = prompt('Wie soll Ihr neues Projekt heißen?');
    if (!projectName || projectName.trim() === '') return;

    const newProject = {
        projectId: `proj_${Date.now()}`,
        projectName: projectName.trim(),
        phases: []
    };

    const response = await db.createProject(newProject);
    if (response.ok) {
        const createdProject = await response.json();
        window.location.href = `/project/${createdProject.projectId}`;
    } else {
        showInfoModal('Fehler', 'Das Projekt konnte nicht erstellt werden.');
    }
}

async function deleteCurrentProject() {
    if (!currentProjectId) return;
    showConfirmationModal('Projekt löschen', `Möchten Sie das Projekt "${currentProjectData.projectName}" wirklich endgültig löschen?`, async () => {
        const response = await db.deleteProject(currentProjectId);
        if (response.ok) {
            window.location.href = '/dashboard';
        } else {
            showInfoModal('Fehler', 'Das Projekt konnte nicht gelöscht werden.');
        }
    });
}

async function addNewItem(type, parentId = null) {
    const name = prompt(`Name für neue(s/n) ${type}:`);
    if (!name || !name.trim()) return;

    let newItem;

    if (type === 'phase') {
        newItem = {
            phaseId: `phase_${Date.now()}`,
            phaseName: name.trim(),
            isExpanded: true,
            tasks: []
        };
        if (!currentProjectData.phases) {
            currentProjectData.phases = [];
        }
        currentProjectData.phases.push(newItem);
    } 
    // 'task' and 'subtask' can be added here later

    await db.saveProject(currentProjectId, currentProjectData);
    renderProjectTree(currentProjectData, document.getElementById('projectTree'));
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
    // Logic for global settings page
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