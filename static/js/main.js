"use strict";

// Importiere globale Zustandsvariablen
import {
    currentProjectData,
    currentProjectId,
    currentlySelectedItem,
    currentlySelectedType,
    db,
    currentUser,
    globalSettings,
    hasInitialProjectBeenLoaded
} from './core/globals.js';

// Importiere Datenbank-Abstraktionen
import { apiDb } from './core/api_db.js';
import { guestDb } from './core/guest_db.js';

// Importiere UI-Komponenten und Helfer
import * as Modals from './ui/modals.js';
import * as GlobalUI from './ui/global_ui.js';
import * as ProjectTreeRenderer from './ui/project_tree_renderer.js';
import * as CommentsManager from './ui/comments_manager.js';
import * as ProjectOverviewRenderer from './ui/project_overview_renderer.js';

// Importiere Seitenlogik
import * as DashboardLogic from './dashboard/dashboard_logic.js';
import * as ProjectManagerLogic from './project/project_manager_logic.js';
import * as SettingsLogic from './settings/settings_logic.js';
import * as InfoLogic from './info/info_logic.js';
import * as AdminMain from './admin/admin_main.js';
import * as UserManagement from './admin/user_management.js';
import * as GlobalSettings from './admin/global_settings.js';
import * as StructureCheck from './admin/structure_check.js';


// =================================================================
// GLOBAL STATE & INITIALIZATION (Expose to window for broader access)
// =================================================================
// Diese Variablen werden global am window-Objekt verfügbar gemacht,
// damit sie von anderen Skripten und HTML-Event-Handlern direkt
// aufgerufen oder gelesen werden können, ohne explizite Importe in jedem File.
// Dies ist eine gängige Praxis in kleineren Projekten ohne Build-Tools.
window.currentProjectData = currentProjectData;
window.currentProjectId = currentProjectId;
window.currentlySelectedItem = currentlySelectedItem;
window.currentlySelectedType = currentlySelectedType;
window.db = db; // Wird nach Session-Check zugewiesen
window.currentUser = currentUser; // Wird nach Session-Check zugewiesen
window.globalSettings = globalSettings; // Wird nach Global-Settings-Check zugewiesen
window.hasInitialProjectBeenLoaded = hasInitialProjectBeenLoaded; // Flag für Initialprojekt

// Exponiere Modal-Funktionen global
window.showInfoModal = Modals.showInfoModal;
window.showConfirmationModal = Modals.showConfirmationModal;
window.showUserEditModal = Modals.showUserEditModal;
window.showPromptModal = Modals.showPromptModal;
window.showTemplateSelectionModal = Modals.showTemplateSelectionModal;

// Exponiere UI-Renderer und Manager global
window.renderProjectTree = ProjectTreeRenderer.renderProjectTree;
window.showDetailsInEditor = ProjectTreeRenderer.showDetailsInEditor;
window.renderCommentsSection = CommentsManager.renderCommentsSection;
window.showCommentsDetailModal = CommentsManager.showCommentsDetailModal;
window.renderProjectOverviewTextView = ProjectOverviewRenderer.renderProjectOverviewTextView;

// Exponiere Logik-Funktionen global, die von UI-Elementen aufgerufen werden
window.addNewItem = ProjectManagerLogic.addNewItem;
window.saveItemDetails = ProjectManagerLogic.saveItemDetails;
window.addCommentToItem = CommentsManager.addCommentToItem;
window.deleteComment = CommentsManager.deleteComment;
window.editComment = CommentsManager.editComment;


// =================================================================
// INITIALIZATION
// =================================================================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Lade Session- und globale Einstellungen
        const [session, settings] = await Promise.all([
            fetch('/api/session').then(res => res.json()),
            fetch('/api/global-settings').then(res => res.json())
        ]);

        // Weise globale Variablen zu (direkt auf window, da importierte Variablen Konstanten sind)
        window.currentUser = session;
        window.globalSettings = settings;
        window.db = session.is_guest ? guestDb : apiDb;

        // Überprüfe Anmelde-Status für öffentliche Seiten
        const publicPages = ['/', '/login', '/register', '/info', '/agb'];
        const path = window.location.pathname;
        if (!session.logged_in && !session.is_guest && !publicPages.some(p => path.startsWith(p))) {
            window.location.href = '/login';
            return;
        }

        // Theme anwenden und seiten-spezifisches Setup ausführen
        await GlobalUI.applyTheme();
        runPageSpecificSetup();

    } catch (error) {
        console.error("Initialisierung fehlgeschlagen:", error);
    }
});

/**
 * Führt das Setup für die aktuelle Seite basierend auf dem Pfad aus.
 */
function runPageSpecificSetup() {
    GlobalUI.setupGlobalUI(window.currentUser); // Globale UI einrichten
    const path = window.location.pathname;

    const projectPageMatch = path.match(/^\/project(?:-overview|-checklist)?\/([a-zA-Z0-9_]+)/);

    if (projectPageMatch) {
        window.currentProjectId = projectPageMatch[1]; // Setze die globale Projekt-ID
        // Setup für alle projektbezogenen Seiten
        if (path.startsWith('/project/')) {
            ProjectManagerLogic.setupProjectManagerPage();
        } else if (path.startsWith('/project-overview/')) {
            ProjectOverviewRenderer.setupProjectOverviewPage();
        }
        // Menü für aktuelles Projekt einblenden
        const projectMenu = document.getElementById('current-project-menu');
        if (projectMenu) {
            projectMenu.classList.remove('hidden');
            document.getElementById('current-project-overview-link').href = `/project-overview/${window.currentProjectId}`;
            document.getElementById('current-project-editor-link').href = `/project/${window.currentProjectId}`;
            document.getElementById('current-project-checklist-link').href = `/project-checklist/${window.currentProjectId}`;
            projectMenu.querySelector('.submenu-toggle').classList.add('open');
            projectMenu.querySelector('.submenu').classList.add('open');
        }

    } else if (path.startsWith('/dashboard')) {
        DashboardLogic.setupDashboardPage();
    } else if (path.startsWith('/settings')) {
        SettingsLogic.setupSettingsPage();
    } else if (path.startsWith('/info') || path.startsWith('/agb')) {
        InfoLogic.setupInfoPage();
    } else if (path.startsWith('/admin')) {
        AdminMain.setupAdminPages();
    }
}
