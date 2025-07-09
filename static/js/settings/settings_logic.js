// static/js/settings/settings_logic.js
"use strict";

import { showInfoModal, showConfirmationModal } from '../ui/modals.js';

/**
 * Richtet die Einstellungsseite ein.
 * Initialisiert Event-Listener für Datenrücksetzung.
 */
export async function setupSettingsPage() {
    window.debugLog("Settings: Setup der Einstellungsseite gestartet.");

    const deleteAppDataBtn = document.getElementById('delete-app-data-btn');
    if (deleteAppDataBtn) {
        deleteAppDataBtn.addEventListener('click', () => {
            // Logik zur Anzeige des Bestätigungsdialogs
            const message = window.currentUser.is_guest
                ? 'Möchten Sie wirklich alle Ihre im Browser gespeicherten Projekte löschen?'
                : 'Möchten Sie wirklich alle Ihre Projekte und Einstellungen auf dem Server unwiderruflich löschen?';

            showConfirmationModal('Alle Daten löschen?', message, async () => {
                // Logik zum Aufrufen der Löschfunktion und zur Anzeige von Feedback
                try {
                    await window.db.resetAllData();
                    showInfoModal('Erfolg', 'Alle Ihre Daten wurden gelöscht.', () => {
                        window.location.href = '/dashboard';
                    });
                } catch (error) {
                    console.error("Fehler beim Zurücksetzen aller Daten:", error);
                    showInfoModal('Fehler', 'Daten konnten nicht gelöscht werden.');
                }
            });
        });
    }
    window.debugLog("Settings: Setup der Einstellungsseite abgeschlossen.");
}