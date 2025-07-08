// ochtii/projektplaner_v7/projektplaner_v7-55c8a693a05caeff31bc85b526881ea8deee5951/static/js/settings/settings_logic.js
"use strict";

// =================================================================
// EINSTELLUNGEN LOGIK
// =================================================================
// Dieses Modul enthält die Logik für die Einstellungsseite,
// einschließlich Theme-Umschaltung und Datenrücksetzung.

import { showInfoModal, showConfirmationModal } from '../ui/modals.js';
// NEU: Theme-Switcher-Logik aus theme.js importieren
import { initializeThemeSwitcher } from '../ui/theme.js';

/**
 * Richtet die Einstellungsseite ein.
 * Initialisiert Event-Listener für Theme-Umschaltung und Datenrücksetzung.
 */
export async function setupSettingsPage() {
    window.debugLog("Settings: Setup der Einstellungsseite gestartet.");

    // NEU: Theme-Switcher-Logik wird nun von theme.js verwaltet
    // Lade die aktuellen Benutzereinstellungen, um den Theme-Switcher korrekt zu initialisieren
    const userSettings = await window.db.getSettings();
    initializeThemeSwitcher(userSettings); // Übergibt die initialen Einstellungen an den Theme-Switcher

    const deleteAppDataBtn = document.getElementById('delete-app-data-btn');
    if (deleteAppDataBtn) {
        deleteAppDataBtn.addEventListener('click', () => {
            window.debugLog("Settings: 'Alle Daten löschen' Button geklickt.");
            // Greift auf window.currentUser zu
            const message = window.currentUser.is_guest
                ? 'Möchten Sie wirklich alle Ihre im Browser gespeicherten Projekte löschen?'
                : 'Möchten Sie wirklich alle Ihre Projekte und Einstellungen auf dem Server unwiderruflich löschen?';

            // Ruft showConfirmationModal auf
            showConfirmationModal('Alle Daten löschen?', message, async () => {
                window.debugLog("Settings: Bestätigung zum Löschen aller Daten erhalten.");
                // Greift auf window.db zu
                try {
                    await window.db.resetAllData();
                    showInfoModal('Erfolg', 'Alle Ihre Daten wurden gelöscht.', () => {
                        window.debugLog("Settings: Daten erfolgreich gelöscht, leite zum Dashboard um.");
                        window.location.href = '/dashboard';
                    });
                } catch (error) {
                    console.error("Fehler beim Zurücksetzen aller Daten:", error);
                    showInfoModal('Fehler', 'Daten konnten nicht gelöscht werden.');
                    window.debugLog("Settings: Fehler beim Löschen aller Daten.", error);
                }
            });
        });
    }
    window.debugLog("Settings: Setup der Einstellungsseite abgeschlossen.");
}
