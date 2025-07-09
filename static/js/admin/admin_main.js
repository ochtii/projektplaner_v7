"use strict";

// =================================================================
// ADMIN HAUPT-LOGIK
// =================================================================
// Dieses Modul ist für das Routing und die Initialisierung
// der verschiedenen Admin-Seiten zuständig.

import { setupUserManagementPage } from './user_management.js';
import { setupGlobalSettingsPage } from './global_settings.js';
import { setupStructureCheckPage } from './structure_check.js';
import { setupFactoryResetPage } from './factory_reset_logic.js'; 

/**
 * Richtet die Admin-Seiten basierend auf dem aktuellen Pfad ein.
 */
export function setupAdminPages() {
    const path = window.location.pathname;

    if (path.endsWith('/admin/users')) {
        setupUserManagementPage();
    } else if (path.endsWith('/admin/settings')) {
        setupGlobalSettingsPage();
    } else if (path.endsWith('/admin/structure-check')) {
        setupStructureCheckPage();
    } else if (path.endsWith('/admin/factory-reset')) { 
        setupFactoryResetPage();
    }
}
