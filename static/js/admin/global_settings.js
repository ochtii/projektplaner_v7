"use strict";

// =================================================================
// GLOBALE EINSTELLUNGEN LOGIK
// =================================================================
// Dieses Modul enthält die Logik für die globale Einstellungsseite im Admin-Bereich.

/**
 * Richtet die Seite für globale Einstellungen ein.
 * Lädt aktuelle Einstellungen und speichert Änderungen.
 */
export async function setupGlobalSettingsPage() {
    const form = document.getElementById('global-settings-form');
    const systemForm = document.getElementById('system-settings-form');
    const saveButton = document.getElementById('save-global-settings-btn');

    if (!form || !systemForm || !saveButton) return;

    /**
     * Lädt die aktuellen globalen Einstellungen vom Server und füllt das Formular.
     */
    const loadSettings = async () => {
        try {
            const settings = await fetch('/api/admin/global-settings').then(res => res.json());
            
            // Gast-Limits
            document.getElementById('guest-projects').value = settings.guest_limits.projects;
            document.getElementById('guest-phases').value = settings.guest_limits.phases_per_project;
            document.getElementById('guest-tasks').value = settings.guest_limits.tasks_per_phase;
            document.getElementById('guest-subtasks').value = settings.guest_limits.subtasks_per_task;

            // Systemeinstellungen
            document.getElementById('registration-enabled').checked = settings.registration_enabled;
            document.getElementById('maintenance-mode').checked = settings.maintenance_mode;
            document.getElementById('debug-mode').checked = settings.general_debug_mode;

        } catch (error) {
            console.error("Fehler beim Laden der globalen Einstellungen:", error);
            window.showInfoModal('Fehler', 'Globale Einstellungen konnten nicht geladen werden.');
        }
    };

    /**
     * Speichert die aktualisierten globalen Einstellungen auf dem Server.
     */
    const saveSettings = async () => {
        const updatedSettings = {
            guest_limits: {
                projects: parseInt(document.getElementById('guest-projects').value, 10),
                phases_per_project: parseInt(document.getElementById('guest-phases').value, 10),
                tasks_per_phase: parseInt(document.getElementById('guest-tasks').value, 10),
                subtasks_per_task: parseInt(document.getElementById('guest-subtasks').value, 10)
            },
            registration_enabled: document.getElementById('registration-enabled').checked,
            maintenance_mode: document.getElementById('maintenance-mode').checked,
            general_debug_mode: document.getElementById('debug-mode').checked
        };

        try {
            const response = await fetch('/api/admin/global-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedSettings)
            });
            if (response.ok) {
                window.showInfoModal('Erfolg', 'Globale Einstellungen erfolgreich gespeichert.');
                // Globale Einstellung im Frontend aktualisieren, falls sie von anderen Modulen verwendet werden
                window.globalSettings = updatedSettings;
            } else {
                window.showInfoModal('Fehler', 'Globale Einstellungen konnten nicht gespeichert werden.');
            }
        } catch (error) {
            console.error("Fehler beim Speichern der globalen Einstellungen:", error);
            window.showInfoModal('Fehler', 'Ein Fehler ist beim Speichern aufgetreten.');
        }
    };

    // Initiales Laden der Einstellungen
    await loadSettings();

    // Event-Listener für den Speicher-Button
    saveButton.addEventListener('click', saveSettings);
}
