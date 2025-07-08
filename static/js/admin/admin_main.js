"use strict";

// =================================================================
// ADMIN HAUPT-LOGIK
// =================================================================
// Dieses Modul ist für das Routing und die Initialisierung
// der verschiedenen Admin-Seiten zuständig.

// Importiere spezifische Admin-Seiten-Setups
import { setupUserManagementPage } from './user_management.js';
import { setupGlobalSettingsPage } from './global_settings.js';
import { setupStructureCheckPage } from './structure_check.js';

/**
 * Richtet die Admin-Seiten basierend auf dem aktuellen Pfad ein.
 */
export function setupAdminPages() {
    const path = window.location.pathname; // Greift auf window.location zu

    if (path.endsWith('/admin/users')) {
        setupUserManagementPage();
    } else if (path.endsWith('/admin/settings')) {
        setupGlobalSettingsPage();
    } else if (path.endsWith('/admin/structure-check')) {
        setupStructureCheckPage();
    }
    // Für das Admin-Dashboard selbst ist möglicherweise kein spezifisches JS erforderlich,
    // da es oft nur statischen Inhalt anzeigt.
}
