// =================================================================
// GLOBAL STATE & INITIALIZATION
// =================================================================
let currentProjectData = null;
let currentProjectId = null;
let currentlySelectedItem = null;
let currentlySelectedType = null;
let currentUser = null;

const GUEST_LIMITS = {
    projects: 3,
    phases: 3,
    tasks: 2,
    subtasks: 2
};

// =================================================================
// DATABASE ABSTRACTION (LocalStorage or API)
// =================================================================
const db = {
    _isLoggedIn: false,
    _projects: null,

    init(isLoggedIn) {
        this._isLoggedIn = isLoggedIn;
        if (!isLoggedIn) {
            try {
                const localData = localStorage.getItem('guestProjects');
                this._projects = localData ? JSON.parse(localData) : {};
            } catch (e) {
                console.error("Could not parse guest projects from localStorage", e);
                this._projects = {};
            }
        }
    },

    async getAllProjects() {
        if (this._isLoggedIn) {
            const response = await fetch('/api/projects');
            return await response.json();
        } else {
            return Object.keys(this._projects).map(key => ({
                id: key,
                name: this._projects[key].projectName,
                progress: this.calculateProgress(this._projects[key])
            }));
        }
    },

    async getProject(id) {
        if (this._isLoggedIn) {
            const response = await fetch(`/api/project/${id}`);
            return await response.json();
        } else {
            return this._projects[id] || {};
        }
    },

    async saveProject(id, data) {
        if (this._isLoggedIn) {
            await fetch(`/api/project/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else {
            this._projects[id] = data;
            localStorage.setItem('guestProjects', JSON.stringify(this._projects));
        }
    },

    async deleteProject(id) {
        if (this._isLoggedIn) {
            await fetch(`/api/project/${id}`, { method: 'DELETE' });
        } else {
            delete this._projects[id];
            localStorage.setItem('guestProjects', JSON.stringify(this._projects));
        }
    },

    async resetAllData() {
        if (this._isLoggedIn) {
            await fetch('/api/reset-all-data', { method: 'POST' });
        }
        localStorage.clear();
        sessionStorage.clear();
    },

    calculateProgress(project) {
        let total = 0, completed = 0;
        (project.phases || []).forEach(phase => {
            (phase.tasks || []).forEach(task => {
                const items = task.subtasks && task.subtasks.length > 0 ? task.subtasks : [task];
                total += items.length;
                completed += items.filter(i => i.completed).length;
            });
        });
        return total > 0 ? Math.round((completed / total) * 100) : 0;
    }
};

// =================================================================
// INITIALIZATION
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    checkSession();
});

async function checkSession() {
    try {
        const response = await fetch('/api/session');
        const session = await response.json();
        currentUser = session.logged_in ? session.username : null;
        db.init(!!currentUser);
        runPageSpecificSetup();
    } catch (error) {
        console.error("Could not check session, running as guest:", error);
        currentUser = null;
        db.init(false);
        runPageSpecificSetup();
    }
}

function runPageSpecificSetup() {
    setupGeneralUI();
    const path = window.location.pathname;
    if (path.startsWith('/project/')) {
        if (path.endsWith('/overview')) setupOverviewPage();
        else if (path.endsWith('/checklist')) setupChecklistPage();
        else setupProjectManagerPage();
    } else if (path.includes('/settings')) setupSettingsPage();
    else if (path.includes('/info')) setupInfoPage();
    else if (path.includes('/dashboard')) setupDashboardPage();
    else if (path === '/' || path.includes('/login')) setupIndexPage(path.includes('/login'));
}

// =================================================================
// PAGE-SPECIFIC SETUP
// =================================================================
function setupGeneralUI() {
    updateHeaderUI();
    const mobileMenuButton = document.getElementById('mobileMenuButton');
    const mobileNav = document.getElementById('mobileNav');
    const closeMobileNav = document.getElementById('closeMobileNav');
    const overlay = document.getElementById('overlay');
    if (mobileMenuButton && mobileNav && closeMobileNav && overlay) {
        mobileMenuButton.addEventListener('click', () => { mobileNav.classList.add('open'); overlay.classList.add('visible'); });
        closeMobileNav.addEventListener('click', () => { mobileNav.classList.remove('open'); overlay.classList.remove('visible'); });
        overlay.addEventListener('click', () => { mobileNav.classList.remove('open'); overlay.classList.remove('visible'); });
    }
    if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-mode');
    
    const themeSwitcherInput = document.getElementById('themeSwitcher');
    if (themeSwitcherInput) {
        const label = document.getElementById('theme-label');
        if (document.body.classList.contains('dark-mode')) {
            themeSwitcherInput.checked = true;
            if (label) label.textContent = 'Dark Mode';
        } else {
            if (label) label.textContent = 'Light Mode';
        }
        themeSwitcherInput.addEventListener('change', () => {
            document.body.classList.toggle('dark-mode');
            const isDarkMode = document.body.classList.contains('dark-mode');
            localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
            if (label) label.textContent = isDarkMode ? 'Dark Mode' : 'Light Mode';
        });
    }

    const languageSelect = document.getElementById('language-select');
    if(languageSelect) {
        languageSelect.value = localStorage.getItem('language') || 'de';
        languageSelect.addEventListener('change', (e) => {
            localStorage.setItem('language', e.target.value);
            showInfoModal('Sprache', 'Die Sprache wird bei der nächsten Anmeldung geändert (Funktion in Entwicklung).');
        });
    }

    document.querySelectorAll('.submenu-toggle').forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            const wasOpen = toggle.classList.contains('open');
            // Close all submenus in the same nav container
            toggle.closest('nav').querySelectorAll('.submenu.open').forEach(submenu => {
                submenu.classList.remove('open');
                submenu.previousElementSibling.classList.remove('open');
            });
            // If it wasn't open, open it now
            if (!wasOpen) {
                toggle.classList.toggle('open');
                toggle.nextElementSibling?.classList.toggle('open');
            }
        });
    });
    loadPersistentProjectState();
}

function setupIndexPage(isLoginPage = false) {
    document.querySelector('.sidebar')?.classList.add('hidden');
    document.querySelector('.main-header')?.classList.add('hidden');
    if(isLoginPage && currentUser) {
        window.location.href = '/dashboard';
    }
}

function updateHeaderUI() {
    const headerActions = document.getElementById('header-actions');
    if (headerActions) {
        if(currentUser) {
            headerActions.innerHTML = `<div class="user-profile"><span>Willkommen, <strong>${currentUser}</strong></span><a href="/logout" class="btn btn-secondary btn-sm">Logout</a></div>`;
        } else {
            headerActions.innerHTML = `<a href="/login" class="btn btn-primary">Login</a>`;
        }
    }
    const mobileNavMenu = document.querySelector('.mobile-nav nav');
    if (mobileNavMenu) {
        const loginLogoutLink = currentUser ? `<a href="/logout">Logout</a>` : `<a href="/login">Login</a>`;
        mobileNavMenu.innerHTML = `
            <a href="/dashboard">Dashboard</a>
            <div id="mobile-current-project-menu" class="hidden">
                <div class="submenu-toggle"><span>Aktuelles Projekt</span><span class="arrow">&#9662;</span></div>
                <div class="submenu"><a href="#" id="mobile-current-project-overview-link">Übersicht</a><a href="#" id="mobile-current-project-editor-link">Editor</a><a href="#" id="mobile-current-project-checklist-link">Checkliste</a></div>
            </div>
            <div class="info-menu">
                <div class="submenu-toggle"><span>Info & Hilfe</span><span class="arrow">&#9662;</span></div>
                <div class="submenu"><a href="/info#about">Über die App</a><a href="/info#anleitung">Anleitung</a><a href="/info#faq">FAQ</a></div>
            </div>
            <a href="/settings">Einstellungen</a>
            ${loginLogoutLink}
        `;
        mobileNavMenu.querySelectorAll('.submenu-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                toggle.classList.toggle('open');
                toggle.nextElementSibling?.classList.toggle('open');
            });
        });
    }
}

async function setupDashboardPage() {
    const createProjectBtn = document.getElementById('create-project-btn');
    if (createProjectBtn) {
        createProjectBtn.addEventListener('click', async () => {
            if (!currentUser) {
                const projects = await db.getAllProjects();
                if (Object.keys(projects).length >= GUEST_LIMITS.projects) {
                    showLimitExceededModal();
                    return;
                }
            }
            showTemplateSelectionModal();
        });
    }
    renderProjectGrid();
}

function setupProjectManagerPage() {
    const pathParts = window.location.pathname.split('/');
    currentProjectId = pathParts[2];
    if (currentProjectId) loadProjectData(currentProjectId);
    
    const deleteBtn = document.getElementById('delete-project-btn');
    if (deleteBtn) deleteBtn.addEventListener('click', deleteCurrentProject);
    
    const addPhaseBtn = document.getElementById('add-phase-btn');
    if (addPhaseBtn) addPhaseBtn.addEventListener('click', () => addNewItem(null, 'Phase'));
    
    const editProjectNameBtn = document.getElementById('edit-project-name-btn');
    if (editProjectNameBtn) {
        editProjectNameBtn.addEventListener('click', () => {
            if (!currentProjectData) return;
            showInputModal("Projektnamen bearbeiten", "Neuer Projektname", (newName) => {
                currentProjectData.projectName = newName;
                updateUIAfterProjectNameChange(newName, currentProjectId);
                updateProjectData();
            }, currentProjectData.projectName);
        });
    }
    
    const toggleAllBtn = document.getElementById('toggle-all-btn');
    if (toggleAllBtn) {
        toggleAllBtn.addEventListener('click', () => {
            const isCollapsing = toggleAllBtn.textContent.includes('einklappen');
            toggleAll(currentProjectData.phases, !isCollapsing);
            renderProjectTree();
            toggleAllBtn.textContent = isCollapsing ? 'Alle ausklappen' : 'Alle einklappen';
        });
    }
}

function setupOverviewPage() {
    const pathParts = window.location.pathname.split('/');
    const projectId = pathParts[2];
    if (projectId) {
        loadProjectData(projectId, true);
        const editorBtn = document.getElementById('go-to-editor-btn');
        if (editorBtn) {
            editorBtn.href = `/project/${projectId}`;
            editorBtn.classList.remove('hidden');
        }
    }

    const textViewBtn = document.getElementById('text-view-btn');
    const graphicalViewBtn = document.getElementById('graphical-view-btn');
    const textContent = document.getElementById('text-view-content');
    const graphicalContent = document.getElementById('graphical-view-content');

    if(textViewBtn && graphicalViewBtn && textContent && graphicalContent) {
        textViewBtn.addEventListener('click', () => {
            textContent.classList.remove('hidden');
            graphicalContent.classList.add('hidden');
            textViewBtn.classList.add('btn-primary');
            textViewBtn.classList.remove('btn-secondary');
            graphicalViewBtn.classList.add('btn-secondary');
            graphicalViewBtn.classList.remove('btn-primary');
        });
        graphicalViewBtn.addEventListener('click', () => {
            textContent.classList.add('hidden');
            graphicalContent.classList.remove('hidden');
            textViewBtn.classList.add('btn-secondary');
            textViewBtn.classList.remove('btn-primary');
            graphicalViewBtn.classList.add('btn-primary');
            graphicalViewBtn.classList.remove('btn-secondary');
        });
    }
}

function setupChecklistPage() {
    const pathParts = window.location.pathname.split('/');
    const projectId = pathParts[2];
    if (projectId) {
        loadProjectData(projectId, false, true); // forChecklist = true
    }
}

function setupSettingsPage() {
    const deleteAppDataBtn = document.getElementById('delete-app-data-btn');
    if (deleteAppDataBtn) {
        deleteAppDataBtn.addEventListener('click', () => {
            showConfirmationModal(
                'Alle Daten zurücksetzen?',
                'Möchten Sie wirklich alle Projekte auf dem Server (falls angemeldet) und alle lokalen Einstellungen unwiderruflich löschen?',
                async () => {
                    try {
                        await db.resetAllData();
                        showInfoModal('Erfolg', 'Alle Daten wurden erfolgreich zurückgesetzt.', () => {
                            window.location.href = '/';
                        });
                    } catch (error) {
                        console.error("Fehler beim Löschen der Daten:", error);
                        showInfoModal("Fehler", "Ein Fehler ist aufgetreten. Daten konnten nicht vollständig gelöscht werden.");
                    }
                }
            );
        });
    }
}

function setupInfoPage() {
    const accordionContainer = document.querySelector('.accordion-container');
    if (!accordionContainer) return;

    const openAccordionItem = (toggle) => {
        const content = toggle.nextElementSibling;
        const wasOpen = toggle.classList.contains('open');

        // Close all others
        accordionContainer.querySelectorAll('.accordion-toggle.open').forEach(t => t.classList.remove('open'));
        accordionContainer.querySelectorAll('.info-card-content.open').forEach(c => c.classList.remove('open'));

        // Open the clicked one if it wasn't already open
        if (!wasOpen) {
            toggle.classList.add('open');
            content.classList.add('open');
        }
    };

    accordionContainer.addEventListener('click', (e) => {
        const toggle = e.target.closest('.accordion-toggle');
        if (toggle) {
            openAccordionItem(toggle);
        }
    });

    const handleHash = () => {
        const hash = window.location.hash;
        if (hash) {
            const targetElement = document.querySelector(hash);
            if (targetElement && targetElement.querySelector('.accordion-toggle')) {
                setTimeout(() => {
                    openAccordionItem(targetElement.querySelector('.accordion-toggle'));
                }, 0);
            }
        }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash, false);
}

// =================================================================
// DYNAMIC CONTENT RENDERING
// =================================================================
async function renderProjectGrid() {
    const grid = document.getElementById('project-grid');
    if (!grid) return;
    try {
        const projects = await db.getAllProjects();
        if (projects.length === 0) {
            grid.innerHTML = '<p>Noch keine Projekte erstellt. Klicken Sie oben, um zu beginnen!</p>';
            return;
        }
        grid.innerHTML = projects.map(p => `
            <div class="project-card">
                <h3>${p.name}</h3>
                <div class="progress-bar-container">
                    <span>${p.progress}%</span>
                    <div class="progress-bar">
                        <div class="progress" style="width: ${p.progress}%;"></div>
                    </div>
                </div>
                <div class="project-card-actions">
                    <a href="/project/${p.id}/overview" class="btn btn-secondary btn-sm">Übersicht</a>
                    <a href="/project/${p.id}" class="btn btn-primary btn-sm">Editor</a>
                </div>
            </div>
        `).join('');
    } catch (error) {
        grid.innerHTML = '<p>Projekte konnten nicht geladen werden.</p>';
        console.error("Fehler beim Laden des Projekt-Grids:", error);
    }
}

function renderTextView(data) {
    const container = document.getElementById('text-view-content');
    if (!container || !data) return;
    let html = '<ul>';
    (data.phases || []).forEach((phase, i) => {
        const hasComments = phase.comments && phase.comments.length > 0;
        html += `<li><strong>${i + 1}. ${phase.phaseName}</strong>`;
        if (hasComments) {
            html += `<span class="comment-icon" title="Klick zum Anzeigen der Kommentare" onclick="showCommentsModal(findItemById('${phase.phaseId}'))">&#128172;</span>`;
        }
        if (phase.tasks && phase.tasks.length > 0) {
            html += '<ul>';
            phase.tasks.forEach((task, j) => {
                const hasTaskComments = task.comments && task.comments.length > 0;
                html += `<li>${i + 1}.${j + 1}. ${task.taskName}`;
                if (hasTaskComments) {
                    html += `<span class="comment-icon" title="Klick zum Anzeigen der Kommentare" onclick="showCommentsModal(findItemById('${task.taskId}'))">&#128172;</span>`;
                }
                if (task.subtasks && task.subtasks.length > 0) {
                    html += '<ul>';
                    task.subtasks.forEach((subtask, k) => {
                        const hasSubtaskComments = subtask.comments && subtask.comments.length > 0;
                        html += `<li>${i + 1}.${j + 1}.${k + 1}. ${subtask.subtaskName}`;
                        if (hasSubtaskComments) {
                            html += `<span class="comment-icon" title="Klick zum Anzeigen der Kommentare" onclick="showCommentsModal(findItemById('${subtask.subtaskId}'))">&#128172;</span>`;
                        }
                        html += `</li>`;
                    });
                    html += '</ul>';
                }
                html += '</li>';
            });
            html += '</ul>';
        }
        html += '</li>';
    });
    html += '</ul>';
    container.innerHTML = html;
}

function renderGraphicalView(data) {
    const container = document.getElementById('graphical-view-content');
    if (!container || !data) return;

    function createNode(item, type) {
        const node = document.createElement('div');
        node.className = 'graph-node';
        
        const label = document.createElement('div');
        label.className = `graph-node-label ${type}`;
        label.textContent = item.phaseName || item.taskName || item.subtaskName;
        node.appendChild(label);

        const children = item.tasks || item.subtasks;
        if (children && children.length > 0) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'graph-children';
            const nextType = type === 'phase' ? 'task' : 'subtask';
            children.forEach(child => {
                childrenContainer.appendChild(createNode(child, nextType));
            });
            node.appendChild(childrenContainer);
        }
        return node;
    }
    
    container.innerHTML = '';
    if (data.phases && data.phases.length > 0) {
        data.phases.forEach(phase => {
            container.appendChild(createNode(phase, 'phase'));
        });
    } else {
        container.innerHTML = '<p>Keine Daten für die grafische Ansicht vorhanden.</p>';
    }
}

function renderChecklist(data) {
    const container = document.getElementById('checklist-container');
    if (!container || !data) return;
    let html = '';
    (data.phases || []).forEach(phase => {
        html += `<div class="checklist-phase"><h4>${phase.phaseName}</h4>`;
        (phase.tasks || []).forEach(task => {
            const items = (task.subtasks && task.subtasks.length > 0) ? task.subtasks : [task];
            items.forEach(item => {
                const itemId = item.subtaskId || item.taskId;
                html += `
                    <div class="checklist-item">
                        <label class="custom-checkbox">
                            <input type="checkbox" data-id="${itemId}" ${item.completed ? 'checked' : ''}>
                            <span class="checkmark"></span>
                            ${item.subtaskName || item.taskName}
                        </label>
                    </div>
                `;
            });
        });
        html += `</div>`;
    });
    container.innerHTML = html || '<p>Keine Aufgaben zum Abhaken vorhanden.</p>';

    container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const itemId = e.target.dataset.id;
            const item = findItemById(itemId);
            if(item) {
                item.completed = e.target.checked;
                updateProjectData();
            }
        });
    });
}


// =================================================================
// DATA MANAGEMENT & PERSISTENCE
// =================================================================
async function loadProjectData(projectId, forOverview = false, forChecklist = false) {
    try {
        const data = await db.getProject(projectId);
        if (!data || Object.keys(data).length === 0) {
            console.error("Projekt nicht gefunden, Weiterleitung zum Dashboard.");
            window.location.href = '/dashboard';
            return;
        }
        currentProjectData = data;
        updateUIAfterProjectNameChange(currentProjectData.projectName, projectId);
        
        if (forOverview) {
            document.getElementById('projectName').textContent = currentProjectData.projectName;
            renderTextView(currentProjectData);
            renderGraphicalView(currentProjectData);
        } else if (forChecklist) {
            document.getElementById('projectName').textContent = currentProjectData.projectName;
            renderChecklist(currentProjectData);
        } else {
            document.getElementById('page-main-title').textContent = `Projekt: ${currentProjectData.projectName}`;
            renderProjectTree();
        }
    } catch (error) {
        console.error('Kritischer Fehler beim Laden der Projektdaten:', error);
    }
}

async function updateProjectData(clearEditorAfter = false) {
    if (!currentProjectData || !currentProjectId) return;
    try {
        await db.saveProject(currentProjectId, currentProjectData);
        renderProjectTree();
        if (clearEditorAfter) {
            clearEditor();
        } else if (currentlySelectedItem) {
            const freshItem = findItemById(currentlySelectedItem.phaseId || currentlySelectedItem.taskId || currentlySelectedItem.subtaskId);
            if (freshItem) showDetailsInEditor(freshItem, currentlySelectedType);
            else clearEditor();
        }
    } catch (error) {
        console.error('Fehler beim Speichern der Projektdaten:', error);
    }
}

async function deleteCurrentProject() {
    if (!currentProjectId || !currentProjectData) return;
    showConfirmationModal('Projekt löschen', `Möchten Sie das Projekt "${currentProjectData.projectName}" wirklich endgültig löschen?`, async () => {
        try {
            await db.deleteProject(currentProjectId);
            sessionStorage.removeItem('currentProjectId');
            sessionStorage.removeItem('currentProjectName');
            window.location.href = '/dashboard';
        } catch (error) {
            console.error("Fehler beim Löschen des Projekts:", error);
        }
    });
}

function loadPersistentProjectState() {
    const storedId = sessionStorage.getItem('currentProjectId');
    const storedName = sessionStorage.getItem('currentProjectName');
    if (storedId && storedName) {
        updateUIAfterProjectNameChange(storedName, storedId);
    } else {
        const headerTitle = document.getElementById('header-page-title');
        if (headerTitle) {
            const path = window.location.pathname;
            if (path === '/dashboard' || path === '/') headerTitle.textContent = 'Dashboard';
            else if (path.includes('/info')) headerTitle.textContent = 'Info';
            else if (path.includes('/settings')) headerTitle.textContent = 'Einstellungen';
        }
    }
}

// =================================================================
// MODALS, EDITOR, TREE UI, DRAG & DROP
// =================================================================
function showInputModal(title, label, callback, defaultValue = '') {
    const container = document.getElementById('modal-container');
    container.innerHTML = `
        <div class="modal-backdrop">
            <div class="modal">
                <div class="modal-header"><h3>${title}</h3><button class="modal-close-btn">&times;</button></div>
                <form id="modal-form">
                    <div class="modal-body"><div class="form-group"><label for="modal-input">${label}</label><input type="text" id="modal-input" class="form-control" value="${defaultValue}" required autofocus></div></div>
                    <div class="modal-footer"><button type="button" class="btn modal-cancel-btn">Abbrechen</button><button type="submit" class="btn btn-primary">Speichern</button></div>
                </form>
            </div>
        </div>`;
    const backdrop = container.querySelector('.modal-backdrop');
    setTimeout(() => backdrop.classList.add('visible'), 10);
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
        <div class="modal-backdrop">
            <div class="modal">
                <div class="modal-header"><h3>${title}</h3><button class="modal-close-btn">&times;</button></div>
                <div class="modal-body"><p>${message}</p></div>
                <div class="modal-footer"><button type="button" class="btn modal-cancel-btn">Abbrechen</button><button type="button" class="btn btn-danger modal-confirm-btn">Bestätigen</button></div>
            </div>
        </div>`;
    const backdrop = container.querySelector('.modal-backdrop');
    setTimeout(() => backdrop.classList.add('visible'), 10);
    const closeModal = () => { backdrop.classList.remove('visible'); setTimeout(() => container.innerHTML = '', 300); };
    container.querySelector('.modal-confirm-btn').addEventListener('click', () => { onConfirm(); closeModal(); });
    container.querySelector('.modal-close-btn').addEventListener('click', closeModal);
    container.querySelector('.modal-cancel-btn').addEventListener('click', closeModal);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });
}

function showInfoModal(title, message, onOk) {
    const container = document.getElementById('modal-container');
    container.innerHTML = `
        <div class="modal-backdrop">
            <div class="modal">
                <div class="modal-header"><h3>${title}</h3><button class="modal-close-btn">&times;</button></div>
                <div class="modal-body"><p>${message}</p></div>
                <div class="modal-footer"><button type="button" class="btn btn-primary modal-ok-btn">OK</button></div>
            </div>
        </div>`;
    const backdrop = container.querySelector('.modal-backdrop');
    setTimeout(() => backdrop.classList.add('visible'), 10);
    const closeModal = () => {
        backdrop.classList.remove('visible');
        setTimeout(() => {
            container.innerHTML = '';
            if(onOk) onOk(); // Execute callback after closing
        }, 300);
    };
    container.querySelector('.modal-ok-btn').addEventListener('click', closeModal);
    container.querySelector('.modal-close-btn').addEventListener('click', closeModal);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });
}

function showLimitExceededModal() {
    const container = document.getElementById('modal-container');
    container.innerHTML = `
        <div class="modal-backdrop">
            <div class="modal">
                <div class="modal-header"><h3>Limit erreicht</h3></div>
                <div class="modal-body"><p>Als Gast können Sie nur eine begrenzte Anzahl an Elementen erstellen. Bitte melden Sie sich an, um unbegrenzt Projekte zu verwalten.</p></div>
                <div class="modal-footer">
                    <a href="/login" class="btn btn-primary">Anmelden</a>
                    <button type="button" class="btn modal-cancel-btn">Später</button>
                </div>
            </div>
        </div>`;
    const backdrop = container.querySelector('.modal-backdrop');
    setTimeout(() => backdrop.classList.add('visible'), 10);
    const closeModal = () => { backdrop.classList.remove('visible'); setTimeout(() => container.innerHTML = '', 300); };
    container.querySelector('.modal-close-btn')?.addEventListener('click', closeModal);
    container.querySelector('.modal-cancel-btn').addEventListener('click', closeModal);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });
}

async function showTemplateSelectionModal() {
    const container = document.getElementById('modal-container');
    
    // Fetch templates from backend
    const response = await fetch('/api/templates');
    const templates = await response.json();
    
    let templateOptionsHTML = templates.map(template => `
        <option value="${template.id}">${template.name}</option>
    `).join('');
    templateOptionsHTML += `<option value="blank">Leeres Projekt</option>`;

    container.innerHTML = `
        <div class="modal-backdrop">
            <div class="modal">
                <div class="modal-header"><h3>Neues Projekt erstellen</h3><button class="modal-close-btn">&times;</button></div>
                <form id="modal-form">
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="project-name-input">Projektname</label>
                            <input type="text" id="project-name-input" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="template-select">Vorlage auswählen</label>
                            <select id="template-select" class="form-control">${templateOptionsHTML}</select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn modal-cancel-btn">Abbrechen</button>
                        <button type="submit" class="btn btn-primary">Projekt erstellen</button>
                    </div>
                </form>
            </div>
        </div>`;

    const backdrop = container.querySelector('.modal-backdrop');
    setTimeout(() => backdrop.classList.add('visible'), 10);
    const closeModal = () => { backdrop.classList.remove('visible'); setTimeout(() => container.innerHTML = '', 300); };
    
    document.getElementById('modal-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('project-name-input').value.trim();
        const templateId = document.getElementById('template-select').value;
        if (!name) return;

        let templateData = { phases: [] };
        if (templateId !== 'blank') {
            const templateResponse = await fetch(`/api/template/${templateId}`);
            templateData = await templateResponse.json();
        }

        const newProjectId = 'proj_' + Date.now();
        const newProject = {
            ...templateData,
            projectId: newProjectId,
            projectName: name
        };
        
        await db.saveProject(newProjectId, newProject);
        window.location.href = `/project/${newProjectId}/overview`;

        closeModal();
    });

    container.querySelector('.modal-close-btn').addEventListener('click', closeModal);
    container.querySelector('.modal-cancel-btn').addEventListener('click', closeModal);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });
}


function addNewItem(parent, typeToAdd) {
    if (!currentUser) {
        if (typeToAdd === 'Phase' && currentProjectData.phases.length >= GUEST_LIMITS.phases) {
            showLimitExceededModal(); return;
        }
        if (typeToAdd === 'Aufgabe' && parent.tasks.length >= GUEST_LIMITS.tasks) {
            showLimitExceededModal(); return;
        }
        if (typeToAdd === 'Subaufgabe' && parent.subtasks.length >= GUEST_LIMITS.subtasks) {
            showLimitExceededModal(); return;
        }
    }

    const title = `Neue ${typeToAdd} erstellen`;
    const label = `Name der ${typeToAdd}`;
    showInputModal(title, label, (name) => {
        const keyPrefix = typeToAdd === 'Phase' ? 'phase' : (typeToAdd === 'Aufgabe' ? 'task' : 'subtask');
        const newItem = {
            [`${keyPrefix}Id`]: `${keyPrefix}${Date.now()}`,
            [`${keyPrefix}Name`]: name,
            comments: []
        };
        if (typeToAdd !== 'Subaufgabe') newItem[typeToAdd === 'Phase' ? 'tasks' : 'subtasks'] = [];
        if (!parent) {
            if (!currentProjectData.phases) currentProjectData.phases = [];
            currentProjectData.phases.push(newItem);
        } else if (typeToAdd === 'Aufgabe') {
            if (!parent.tasks) parent.tasks = [];
            parent.tasks.push(newItem);
        } else {
            if (!parent.subtasks) parent.subtasks = [];
            parent.subtasks.push(newItem);
        }
        updateProjectData();
    });
}

function clearEditor() {
    const editorContent = document.getElementById('editor-content');
    if (editorContent) {
        editorContent.innerHTML = '<p>Klicken Sie auf ein Element in der Struktur, um es zu bearbeiten.</p>';
    }
    currentlySelectedItem = null;
    currentlySelectedType = null;
}

function updateUIAfterProjectNameChange(newName, projectId) {
    sessionStorage.setItem('currentProjectId', projectId);
    sessionStorage.setItem('currentProjectName', newName);

    const headerTitle = document.getElementById('header-page-title');
    if (headerTitle) {
        let pageTitle = 'Dashboard';
        const path = window.location.pathname;
        let showProjectName = false;
        if (path.includes('/project/')) {
            showProjectName = true;
            pageTitle = path.includes('/overview') ? 'Übersicht' : (path.includes('/checklist') ? 'Checkliste' : 'Editor');
        } else if (path.includes('/info')) pageTitle = 'Info';
        else if (path.includes('/settings')) pageTitle = 'Einstellungen';
        headerTitle.innerHTML = showProjectName ? `${pageTitle} <span class="project-name-header">: ${newName}</span>` : pageTitle;
    }
    
    const projectTitleOnEditor = document.getElementById('page-main-title');
    if (projectTitleOnEditor) projectTitleOnEditor.textContent = `Projekt: ${newName}`;

    const setupMenu = (menuId, overviewId, editorId, checklistId) => {
        const menu = document.getElementById(menuId);
        if (menu) {
            menu.classList.remove('hidden');
            document.getElementById(overviewId).href = `/project/${projectId}/overview`;
            document.getElementById(editorId).href = `/project/${projectId}`;
            document.getElementById(checklistId).href = `/project/${projectId}/checklist`;
        }
    };
    setupMenu('current-project-menu', 'current-project-overview-link', 'current-project-editor-link', 'current-project-checklist-link');
    setupMenu('mobile-current-project-menu', 'mobile-current-project-overview-link', 'mobile-current-project-editor-link', 'mobile-current-project-checklist-link');
}

function showDetailsInEditor(item, type) {
    currentlySelectedItem = item;
    currentlySelectedType = type;
    const editorContent = document.getElementById('editor-content');
    const itemName = item.phaseName || item.taskName || item.subtaskName;

    editorContent.innerHTML = `
        <fieldset class="editor-group">
            <legend>Element bearbeiten: ${itemName}</legend>
            <div class="form-group"><label for="editor-item-name">${type}-Name</label><input type="text" id="editor-item-name" class="form-control" value="${itemName}"></div>
            <div class="editor-actions"><button class="btn btn-primary" id="save-editor-btn">Speichern</button><button class="btn" id="cancel-editor-btn">Abbrechen</button></div>
        </fieldset>
        <fieldset class="editor-group">
            <legend>Aktionen</legend>
            <div class="editor-actions"><button class="btn" id="comment-btn">Kommentare</button><button class="btn btn-danger" id="delete-item-btn">Dieses Element löschen</button></div>
        </fieldset>`;
    
    document.getElementById('save-editor-btn').addEventListener('click', () => {
        const newName = document.getElementById('editor-item-name').value;
        if (newName && newName.trim()) {
            const itemToUpdate = findItemById(item.phaseId || item.taskId || item.subtaskId);
            if (itemToUpdate) {
                const keyPrefix = type === 'Phase' ? 'phase' : (type === 'Aufgabe' ? 'task' : 'subtask');
                itemToUpdate[`${keyPrefix}Name`] = newName;
                updateProjectData(true);
            }
        }
    });
    document.getElementById('cancel-editor-btn').addEventListener('click', () => {
        const currentNameInInput = document.getElementById('editor-item-name').value;
        if (currentNameInInput !== itemName) {
            showConfirmationModal('Änderungen verwerfen', 'Sie haben ungespeicherte Änderungen. Möchten Sie sie wirklich verwerfen?', () => clearEditor());
        } else {
            clearEditor();
        }
    });
    document.getElementById('delete-item-btn').addEventListener('click', () => {
        showConfirmationModal('Element löschen', `Wollen Sie "${itemName}" wirklich löschen?`, () => {
            findAndRemoveItem(item.phaseId || item.taskId || item.subtaskId);
            clearEditor();
            updateProjectData();
        });
    });
    document.getElementById('comment-btn').addEventListener('click', () => {
        showCommentsModal(item);
    });
}

function showCommentsModal(item) {
    const container = document.getElementById('modal-container');
    const itemName = item.phaseName || item.taskName || item.subtaskName;
    
    let commentsHTML = (item.comments || []).map(comment => `
        <div class="comment" data-timestamp="${comment.timestamp}">
            <div class="comment-header">
                <span class="comment-author">${comment.author || 'Anonym'}:</span>
                <div class="comment-controls">
                    <span class="comment-edit-btn" title="Kommentar bearbeiten">&#9998;</span>
                    <span class="comment-delete-btn" title="Kommentar löschen">&times;</span>
                </div>
            </div>
            <p class="comment-text">${comment.text}</p>
        </div>
    `).join('');
    if (!item.comments || item.comments.length === 0) {
        commentsHTML = '<p class="no-comments">Noch keine Kommentare vorhanden.</p>';
    }

    container.innerHTML = `
        <div class="modal-backdrop">
            <div class="modal">
                <div class="modal-header"><h3>Kommentare für: ${itemName}</h3><button class="modal-close-btn">&times;</button></div>
                <div class="modal-body">
                    <div class="comments-modal-list">${commentsHTML}</div>
                    <form id="add-comment-form" class="add-comment-form">
                        <textarea id="new-comment-text" placeholder="Neuen Kommentar schreiben..." required></textarea>
                        <button type="submit" class="btn btn-primary">Senden</button>
                    </form>
                </div>
            </div>
        </div>`;

    const backdrop = container.querySelector('.modal-backdrop');
    setTimeout(() => backdrop.classList.add('visible'), 10);
    const closeModal = () => { backdrop.classList.remove('visible'); setTimeout(() => container.innerHTML = '', 300); };

    addCommentEventListeners(item, closeModal);
    
    container.querySelector('.modal-close-btn').addEventListener('click', closeModal);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });
}

function addCommentEventListeners(item, afterSubmitCallback) {
    const addCommentForm = document.getElementById('add-comment-form');
    if (addCommentForm) {
        addCommentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const textarea = document.getElementById('new-comment-text');
            const text = textarea.value.trim();
            if (text) {
                if (!item.comments) item.comments = [];
                item.comments.push({ author: 'Benutzer', text: text, timestamp: Date.now().toString() });
                textarea.value = '';
                updateProjectData();
                if (afterSubmitCallback) afterSubmitCallback();
            }
        });
    }

    document.querySelectorAll('.comment-edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const commentDiv = e.target.closest('.comment');
            const timestamp = commentDiv.dataset.timestamp;
            const comment = item.comments.find(c => c.timestamp === timestamp);
            if (comment) {
                showInputModal('Kommentar bearbeiten', 'Kommentar', (newText) => {
                    comment.text = newText;
                    updateProjectData();
                    if (afterSubmitCallback) afterSubmitCallback();
                    showCommentsModal(item); // Re-open the modal to show the change
                }, comment.text);
            }
        });
    });

    document.querySelectorAll('.comment-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const commentDiv = e.target.closest('.comment');
            const timestamp = commentDiv.dataset.timestamp;
            showConfirmationModal('Kommentar löschen', 'Möchten Sie diesen Kommentar wirklich löschen?', () => {
                item.comments = item.comments.filter(c => c.timestamp !== timestamp);
                updateProjectData();
                if (afterSubmitCallback) afterSubmitCallback();
                showCommentsModal(item); // Re-open the modal to show the change
            });
        });
    });
}


function renderProjectTree() {
    const container = document.getElementById('projectTree');
    container.innerHTML = '';
    if (!currentProjectData || !currentProjectData.phases || currentProjectData.phases.length === 0) {
        container.innerHTML = '<li>Klicken Sie unten auf "Neue Phase hinzufügen", um zu beginnen.</li>';
        return;
    }
    currentProjectData.phases.forEach((phase, i) => {
        const prefix = `${i + 1}.`;
        container.appendChild(createTreeItem(phase, 'Phase', prefix));
    });
}

function toggleAll(items, expand) {
    if (!items) return;
    items.forEach(item => {
        item.isExpanded = expand;
        if (item.tasks) toggleAll(item.tasks, expand);
        if (item.subtasks) toggleAll(item.subtasks, expand);
    });
}

function createTreeItem(item, type, prefix) {
    const itemLi = document.createElement('li');
    const itemId = item.phaseId || item.taskId || item.subtaskId;
    itemLi.dataset.id = itemId;
    itemLi.dataset.type = type;
    itemLi.draggable = true;
    itemLi.classList.add('is-collapsible');
    if (item.isExpanded === false) itemLi.classList.add('is-collapsed');

    itemLi.addEventListener('dragstart', handleDragStart);
    itemLi.addEventListener('dragover', handleDragOver);
    itemLi.addEventListener('dragleave', handleDragLeave);
    itemLi.addEventListener('drop', handleDrop);
    const itemContainer = document.createElement('div');
    itemContainer.className = 'tree-item';
    const hasChildren = (item.tasks && item.tasks.length > 0) || (item.subtasks && item.subtasks.length > 0);

    const toggleIcon = document.createElement('span');
    toggleIcon.className = 'toggle-icon';
    if (hasChildren) {
        toggleIcon.innerHTML = itemLi.classList.contains('is-collapsed') ? '&#9658;' : '&#9660;';
        toggleIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            item.isExpanded = !itemLi.classList.contains('is-collapsed');
            itemLi.classList.toggle('is-collapsed');
            toggleIcon.innerHTML = item.isExpanded ? '&#9660;' : '&#9658;';
        });
    } else {
        toggleIcon.classList.add('placeholder');
    }
    
    const itemNumber = document.createElement('span');
    itemNumber.className = 'item-number';
    itemNumber.textContent = prefix;
    const itemLabel = document.createElement('span');
    itemLabel.className = 'tree-item-label';
    itemLabel.textContent = item.phaseName || item.taskName || item.subtaskName;
    const itemControls = document.createElement('div');
    itemControls.className = 'item-controls';

    if (item.comments && item.comments.length > 0) {
        const commentIcon = document.createElement('span');
        commentIcon.className = 'comment-icon';
        commentIcon.innerHTML = '&#128172;';
        commentIcon.title = 'Klick zum Anzeigen der Kommentare';
        commentIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            showCommentsModal(item);
        });
        itemControls.appendChild(commentIcon);
    }

    if (type !== 'Subaufgabe') {
        const addIcon = document.createElement('span');
        addIcon.className = 'add-icon';
        addIcon.innerHTML = '&#43;';
        addIcon.title = type === 'Phase' ? 'Aufgabe hinzufügen' : 'Subaufgabe hinzufügen';
        addIcon.addEventListener('click', (e) => { e.stopPropagation(); addNewItem(item, type === 'Phase' ? 'Aufgabe' : 'Subaufgabe'); });
        itemControls.appendChild(addIcon);
    }
    const editIcon = document.createElement('span');
    editIcon.className = 'edit-icon';
    editIcon.innerHTML = '&#9998;';
    editIcon.title = 'Bearbeiten';
    editIcon.addEventListener('click', (e) => { e.stopPropagation(); showDetailsInEditor(item, type); });
    itemControls.appendChild(editIcon);
    itemContainer.append(toggleIcon, itemNumber, itemLabel, itemControls);
    itemLi.appendChild(itemContainer);

    if (hasChildren) {
        const childrenUl = document.createElement('ul');
        if (item.tasks) item.tasks.forEach((task, i) => childrenUl.appendChild(createTreeItem(task, 'Aufgabe', `${prefix}${i + 1}.`)));
        if (item.subtasks) item.subtasks.forEach((subtask, i) => childrenUl.appendChild(createTreeItem(subtask, 'Subaufgabe', `${prefix}${i + 1}.`)));
        itemLi.appendChild(childrenUl);
    }
    return itemLi;
}

// =================================================================
// DRAG & DROP AND UTILITY FUNCTIONS
// =================================================================
let draggedElement = null;
function handleDragStart(e) { draggedElement = { id: e.target.dataset.id, type: e.target.dataset.type }; e.dataTransfer.effectAllowed = 'move'; e.target.classList.add('dragging'); }
function handleDragOver(e) { e.preventDefault(); e.target.closest('li').classList.add('drag-over'); }
function handleDragLeave(e) { e.target.closest('li').classList.remove('drag-over'); }
function handleDrop(e) {
    e.preventDefault(); e.stopPropagation();
    const dropTarget = e.target.closest('li');
    dropTarget.classList.remove('drag-over');
    document.querySelector('.dragging')?.classList.remove('dragging');
    const targetId = dropTarget.dataset.id;
    if (draggedElement.id === targetId || draggedElement.type !== dropTarget.dataset.type) return;
    const itemToMove = findAndRemoveItem(draggedElement.id);
    if (itemToMove) { insertItem(targetId, itemToMove); updateProjectData(); }
    draggedElement = null;
}

function findItemById(itemId) {
    let foundItem = null;
    function search(items) {
        for (const item of items) {
            const currentId = item.phaseId || item.taskId || item.subtaskId;
            if (currentId === itemId) { foundItem = item; return true; }
            if (item.tasks && search(item.tasks)) return true;
            if (item.subtasks && search(item.subtasks)) return true;
        }
        return false;
    }
    search(currentProjectData.phases);
    return foundItem;
}

function findAndRemoveItem(itemId) {
    let foundItem = null;
    function search(items) {
        for (let i = 0; i < items.length; i++) {
            const currentId = items[i].phaseId || items[i].taskId || items[i].subtaskId;
            if (currentId === itemId) { foundItem = items.splice(i, 1)[0]; return true; }
            if (items[i].tasks && search(items[i].tasks)) return true;
            if (items[i].subtasks && search(items[i].subtasks)) return true;
        }
        return false;
    }
    search(currentProjectData.phases);
    return foundItem;
}

function insertItem(targetId, itemToInsert) {
    function search(items) {
        for (let i = 0; i < items.length; i++) {
            const currentId = items[i].phaseId || items[i].taskId || items[i].subtaskId;
            if (currentId === targetId) { items.splice(i, 0, itemToInsert); return true; }
            if (items[i].tasks && search(items[i].tasks)) return true;
            if (items[i].subtasks && search(items[i].subtasks)) return true;
        }
        return false;
    }
    search(currentProjectData.phases);
}
