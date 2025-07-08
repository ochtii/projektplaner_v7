// ochtii/projektplaner_v7/projektplaner_v7-55c8a693a05caeff31bc85b526881ea8deee5951/static/js/main.js
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
let hasInitialProjectBeenLoaded = false; // Flag to track initial project load

// Expose these globally for ui.js to access
window.currentProjectData = currentProjectData;
window.currentlySelectedItem = currentlySelectedItem;
window.currentlySelectedType = currentlySelectedType;
window.db = db;
window.currentUser = currentUser;
window.globalSettings = globalSettings; // NEU: globalSettings exponiert
window.hasInitialProjectBeenLoaded = hasInitialProjectBeenLoaded; // Expose this flag

// =================================================================
// GLOBALE DEBUG-FUNKTION (NEU)
// =================================================================
/**
 * Führt eine Debug-Log-Meldung aus, wenn der globale Debug-Modus aktiv
 * und der aktuelle Benutzer ein Administrator ist.
 * @param {string} message Die zu protokollierende Nachricht.
 * @param {*} data Optional zusätzliche Daten.
 */
window.debugLog = function(message, data) {
    // Prüfe, ob globalSettings und currentUser bereits geladen sind
    // und ob der Debug-Modus aktiv und der Benutzer Admin ist.
    if (window.globalSettings?.general_debug_mode && window.currentUser?.isAdmin) {
        console.log(`[DEBUG] ${message}`, data || '');
    }
};


// =================================================================
// DATABASE ABSTRAKTION
// =================================================================
const apiDb = {
    async getProjects() { return (await fetch('/api/projects')).json(); },
    async getProject(id) { return (await fetch(`/api/project/${id}`)).json(); },
    async saveProject(id, data) { return fetch(`/api/project/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); },
    async createProject(data) { return fetch('/api/project', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); },
    async deleteProject(id) { return fetch(`/api/project/${id}`, { method: 'DELETE' }); },
    async getSettings() { return (await fetch('/api/settings')).json(); },
    async saveSettings(data) { return fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); },
    async resetAllData() { return fetch('/api/reset-all-data', { method: 'POST' }); },
    async getTemplates() { return (await fetch('/api/templates')).json(); }, // New API call
    async getTemplateContent(templateId) { return (await fetch(`/api/template/${templateId}`)).json(); }, // New API call
    async getInitialProjectContent() { return (await fetch('/api/initial-project')).json(); } // New API call
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
        if (Object.keys(projects).length >= (window.globalSettings?.guest_limits?.projects || 1)) {
            window.showInfoModal('Limit erreicht', `Als Gast können Sie maximal ${window.globalSettings.guest_limits.projects} Projekte erstellen.`);
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
    async getSettings() { return { theme: localStorage.getItem('theme') || 'dark' }; },
    async saveSettings(s) {
        localStorage.setItem('theme', s.theme);
        return { ok: true };
    },
    async resetAllData() {
        localStorage.removeItem('guestProjects');
        return { ok: true };
    },
    async getTemplates() { return []; }, // Guests don't get server templates
    async getTemplateContent(templateId) { return { error: "Guests cannot access templates." }; },
    async getInitialProjectContent() {
        // For guest, provide a very simple example or empty. Let's provide a basic one.
        return {
            projectId: "bsp_guest",
            projectName: "Beispielprojekt (Gast)",
            phases: [
                {
                    phaseId: "phase01",
                    phaseName: "Erste Schritte",
                    isExpanded: true,
                    tasks: [
                        { taskId: "task01", taskName: "App erkunden", subtasks: [] }
                    ]
                }
            ]
        };
    }
};

// =================================================================
// INITIALIZATION
// =================================================================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Lade Session und globale Einstellungen parallel
        const [session, globalSettingsData] = await Promise.all([
            fetch('/api/session').then(res => res.json()),
            fetch('/api/global-settings').then(res => res.json())
        ]);

        currentUser = session;
        globalSettings = globalSettingsData; // Weise die geladenen globalen Einstellungen zu
        db = session.is_guest ? guestDb : apiDb;

        // Update global window objects
        window.db = db;
        window.currentUser = currentUser;
        window.globalSettings = globalSettings; // Sicherstellen, dass die globale Variable aktualisiert wird

        // Debug-Log, um zu sehen, ob globalSettings korrekt geladen wurde
        window.debugLog("main.js: Globale Einstellungen geladen:", window.globalSettings);
        window.debugLog("main.js: Aktueller Benutzer geladen:", window.currentUser);


        const publicPages = ['/', '/login', '/register', '/info', '/agb'];
        const path = window.location.pathname;
        if (!session.logged_in && !session.is_guest && !publicPages.some(p => path.startsWith(p))) {
            window.debugLog("main.js: Nicht angemeldet und nicht Gast, leite zu Login um.");
            window.location.href = '/login';
            return;
        }

        // NEU: applyTheme direkt nach dem Laden der Einstellungen aufrufen
        applyTheme();
        window.debugLog("main.js: Theme nach Initialisierung angewendet.");

        runPageSpecificSetup();
        window.debugLog("main.js: Seiten-spezifisches Setup ausgeführt.");

    } catch (error) {
        console.error("Initialization failed:", error);
        window.debugLog("main.js: Initialisierung fehlgeschlagen!", error);
    }
});


// NEU: applyTheme Funktion aus theme.js importieren
import { applyTheme } from './ui/theme.js';
// NEU: Direkter Import von setupGlobalUI
import { setupGlobalUI, updateHeaderTitles } from './ui/global_ui.js';
// Importiere spezifische Setup-Funktionen direkt
import { setupDashboardPage } from './dashboard/dashboard_logic.js';
import { setupProjectManagerPage, setupProjectChecklistPage } from './project/project_manager_logic.js';
import { setupSettingsPage } from './settings/settings_logic.js';
import { setupInfoPage } from './info/info_logic.js';
import { setupAdminPages } from './admin/admin_main.js';
import { setupProjectOverviewPage } from './ui/project_overview_renderer.js';


function runPageSpecificSetup() {
    // Direkter Aufruf der importierten Funktion
    setupGlobalUI(currentUser); // NEU: setupGlobalUI hier aufrufen, damit es die globalSettings nutzen kann
    const path = window.location.pathname;

    const projectPageMatch = path.match(/^\/project(?:-overview|-checklist)?\/([a-zA-Z0-9_]+)/);

    let projectTitle = '';
    let pageTitle = '';

    if (projectPageMatch) {
        window.currentProjectId = projectPageMatch[1]; // Setze die globale Projekt-ID
        projectTitle = 'Projekt: ...'; // Platzhalter, wird später durch tatsächlichen Namen ersetzt
        
        // Setup für alle projektbezogenen Seiten
        if (path.startsWith('/project/')) {
            setupProjectManagerPage(); // Direkter Aufruf
            pageTitle = 'Editor';
        } else if (path.startsWith('/project-overview/')) {
            setupProjectOverviewPage(); // Direkter Aufruf
            pageTitle = 'Übersicht';
        } else if (path.startsWith('/project-checklist/')) {
            setupProjectChecklistPage(); // Direkter Aufruf
            pageTitle = 'Checkliste';
        }
        // Menü für aktuelles Projekt einblenden und Buttons setzen
        const projectMenu = document.getElementById('current-project-menu');
        if (projectMenu) {
            projectMenu.classList.remove('hidden');
            document.getElementById('current-project-overview-link').href = `/project-overview/${window.currentProjectId}`;
            document.getElementById('current-project-editor-link').href = `/project/${window.currentProjectId}`;
            document.getElementById('current-project-checklist-link').href = `/project-checklist/${window.currentProjectId}`;
            projectMenu.querySelector('.submenu-toggle').classList.add('open');
            projectMenu.querySelector('.submenu').classList.add('open');
            window.debugLog("main.js: Projektmenü aktiviert.");
        }

        // Setze Navigationsbuttons für Projektansichten
        const goToOverviewBtn = document.getElementById('go-to-overview-btn');
        const goToEditorBtn = document.getElementById('go-to-editor-btn');
        const goToChecklistBtn = document.getElementById('go-to-checklist-btn');

        if (goToOverviewBtn) {
            goToOverviewBtn.href = `/project-overview/${window.currentProjectId}`;
        }
        if (goToEditorBtn) {
            goToEditorBtn.href = `/project/${window.currentProjectId}`;
        }
        if (goToChecklistBtn) {
            goToChecklistBtn.href = `/project-checklist/${window.currentProjectId}`;
        }

    } else if (path.startsWith('/dashboard')) {
        setupDashboardPage(); // Direkter Aufruf
        pageTitle = 'Dashboard';
    } else if (path.startsWith('/settings')) {
        setupSettingsPage(); // Direkter Aufruf
        pageTitle = 'Einstellungen';
    } else if (path.startsWith('/info')) { // Changed to startsWith to catch #anchors
        setupInfoPage(); // Direkter Aufruf
        pageTitle = 'Info & Hilfe';
    } else if (path.startsWith('/agb')) {
        setupInfoPage(); // AGB uses info_logic for accordion, etc.
        pageTitle = 'AGB';
    } else if (path.startsWith('/admin')) {
        setupAdminPages(); // Direkter Aufruf
        // Admin-Seiten haben oft eigene Titel in den Templates,
        // hier könnte man spezifische Titel setzen, falls gewünscht.
        // Für den Moment bleibt der pageTitle leer oder wird vom Template bestimmt.
        const adminPageTitles = {
            '/admin': 'Admin Dashboard',
            '/admin/users': 'Benutzerverwaltung',
            '/admin/settings': 'Globale Einstellungen',
            '/admin/structure-check': 'Struktur-Check'
        };
        pageTitle = adminPageTitles[path] || 'Admin Bereich';
        window.debugLog(`main.js: Admin-Seite erkannt: ${path}`);

    } else { // Default for index page
        pageTitle = 'Willkommen';
    }

    // Aktualisiere den Header-Titel, nachdem die seiten-spezifische Logik gelaufen ist
    // und window.currentProjectData (falls vorhanden) gesetzt wurde.
    if (window.currentProjectData && window.currentProjectData.projectName) {
        projectTitle = window.currentProjectData.projectName;
    } else if (path === '/dashboard' || path === '/') {
        projectTitle = ''; // Auf Dashboard oder Index kein Projekttitel im Header
    }
    // Direkter Aufruf der importierten Funktion
    updateHeaderTitles(projectTitle, pageTitle);
    window.debugLog(`main.js: Header-Titel aktualisiert: Seite='${pageTitle}', Projekt='${projectTitle}'`);
}
