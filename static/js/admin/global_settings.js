"use strict";

// =================================================================
// GLOBALE EINSTELLUNGEN LOGIK
// =================================================================
// Dieses Modul enthält die Logik für die globale Einstellungsseite im Admin-Bereich.

import { showInfoModal, showConfirmationModal } from '../ui/modals.js';

/**
 * Richtet die Seite für globale Einstellungen ein.
 * Lädt aktuelle Einstellungen und speichert Änderungen.
 */
export async function setupGlobalSettingsPage() {
    window.debugLog("Admin_GlobalSettings: Setup der globalen Einstellungsseite gestartet.", 'INFO', 'Admin_GlobalSettings');
    const guestLimitsForm = document.getElementById('global-settings-form');
    const saveGuestLimitsBtn = document.getElementById('save-guest-limits-btn');
    const systemSettingToggles = document.querySelectorAll('.settings-card .toggle-btn');


    if (!guestLimitsForm || !saveGuestLimitsBtn || !systemSettingToggles) {
        window.debugLog("Admin_GlobalSettings: Benötigte Elemente für Setup nicht gefunden.", 'WARN', 'Admin_GlobalSettings');
        return;
    }

    /**
     * Lädt die aktuellen globalen Einstellungen vom Server und füllt das Formular.
     */
    const loadSettings = async () => {
        window.debugLog("Admin_GlobalSettings: Lade globale Einstellungen.", 'INFO', 'Admin_GlobalSettings');
        try {
            const settings = await fetch('/api/global-settings').then(res => res.json());
            window.globalSettings = settings; // Globale Variable aktualisieren
            
            // Gast-Limits füllen
            document.getElementById('guest-projects').value = settings.guest_limits.projects;
            document.getElementById('guest-phases').value = settings.guest_limits.phases_per_project;
            document.getElementById('guest-tasks').value = settings.guest_limits.tasks_per_phase;
            document.getElementById('guest-subtasks').value = settings.guest_limits.subtasks_per_task;

            // System-Einstellungen Buttons aktualisieren
            systemSettingToggles.forEach(button => {
                const settingKey = button.dataset.settingKey;
                const isActive = settings[settingKey]; // Holt den booleschen Wert aus den Settings
                button.classList.toggle('active', isActive);
                button.textContent = isActive ? 'Deaktivieren' : 'Aktivieren';
            });

            window.debugLog("Admin_GlobalSettings: Globale Einstellungen erfolgreich geladen.", 'INFO', 'Admin_GlobalSettings', settings);

        } catch (error) {
            console.error("Fehler beim Laden der globalen Einstellungen:", error);
            showInfoModal('Fehler', 'Globale Einstellungen konnten nicht geladen werden.');
            window.debugLog("Admin_GlobalSettings: Fehler beim Laden der globalen Einstellungen.", 'ERROR', 'Admin_GlobalSettings', error);
        }
    };

    /**
     * Speichert die aktualisierten Gast-Limits auf dem Server.
     */
    const saveGuestLimits = async () => {
        window.debugLog("Admin_GlobalSettings: Speichere Gast-Limits.", 'INFO', 'Admin_GlobalSettings');
        const updatedLimits = {
            guest_limits: {
                projects: parseInt(document.getElementById('guest-projects').value, 10),
                phases_per_project: parseInt(document.getElementById('guest-phases').value, 10),
                tasks_per_phase: parseInt(document.getElementById('guest-tasks').value, 10),
                subtasks_per_task: parseInt(document.getElementById('guest-subtasks').value, 10)
            }
        };

        try {
            const response = await fetch('/api/global-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedLimits)
            });
            if (response.ok) {
                showInfoModal('Erfolg', 'Gast-Limits erfolgreich gespeichert.');
                window.globalSettings.guest_limits = updatedLimits.guest_limits;
                window.debugLog("Admin_GlobalSettings: Gast-Limits erfolgreich gespeichert.", 'INFO', 'Admin_GlobalSettings', updatedLimits);
            } else {
                showInfoModal('Fehler', 'Gast-Limits konnten nicht gespeichert werden.');
                window.debugLog("Admin_GlobalSettings: Gast-Limits konnten nicht gespeichert werden.", 'ERROR', 'Admin_GlobalSettings', response);
            }
        } catch (error) {
            console.error("Fehler beim Speichern der Gast-Limits:", error);
            showInfoModal('Fehler', 'Ein Fehler ist beim Speichern der Gast-Limits aufgetreten.');
            window.debugLog("Admin_GlobalSettings: Fehler beim Speichern der Gast-Limits.", 'ERROR', 'Admin_GlobalSettings', error);
        }
    };

    /**
     * Togglet eine System-Einstellung und speichert sie auf dem Server.
     * @param {HTMLElement} button Der geklickte Button.
     * @param {string} settingKey Der Schlüssel der Einstellung (z.B. 'registration_enabled').
     */
    const toggleSystemSetting = async (button, settingKey) => {
        const currentState = button.classList.contains('active');
        const newState = !currentState;
        window.debugLog(`Admin_GlobalSettings: Versuche Einstellung '${settingKey}' zu ändern von ${currentState} zu ${newState}.`, 'INFO', 'Admin_GlobalSettings');

        showConfirmationModal(
            `${newState ? 'Aktivieren' : 'Deaktivieren'}`,
            `Möchten Sie die Einstellung "${settingKey.replace(/_/g, ' ')}" wirklich ${newState ? 'aktivieren' : 'deaktivieren'}?`,
            async () => {
                const updatePayload = {};
                updatePayload[settingKey] = newState;

                try {
                    const response = await fetch('/api/global-settings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updatePayload)
                    });
                    if (response.ok) {
                        window.globalSettings[settingKey] = newState;
                        
                        // Wenn Debug-Modus umgeschaltet wird
                        if (settingKey === 'general_debug_mode') {
                            // Konsole standardmäßig als geschlossen markieren
                            localStorage.setItem('debugConsoleHidden', 'true'); 
                            
                            // Wenn Debug-Modus DEAKTIVIERT wird, deaktiviere auch den Gangster-Modus
                            if (!newState) {
                                localStorage.setItem('hackerModeEnabled', 'false');
                            }

                            showInfoModal('Neustart erforderlich', 'Der Debug-Modus wurde geändert. Die Seite wird neu geladen, um die Änderungen zu übernehmen.', () => {
                                window.location.reload();
                            });
                        } else {
                            button.classList.toggle('active', newState);
                            button.textContent = newState ? 'Deaktivieren' : 'Aktivieren';
                            showInfoModal('Erfolg', `Einstellung "${settingKey.replace(/_/g, ' ')}" erfolgreich ${newState ? 'aktiviert' : 'deaktiviert'}.`);
                        }
                        window.debugLog(`Admin_GlobalSettings: Einstellung '${settingKey}' erfolgreich geändert zu ${newState}.`, 'INFO', 'Admin_GlobalSettings');

                    } else {
                        showInfoModal('Fehler', `Einstellung "${settingKey.replace(/_/g, ' ')}" konnte nicht geändert werden.`);
                        window.debugLog(`Admin_GlobalSettings: Einstellung '${settingKey}' konnte nicht geändert werden.`, 'ERROR', 'Admin_GlobalSettings', response);
                    }
                } catch (error) {
                    console.error(`Fehler beim Ändern der Einstellung "${settingKey}":`, error);
                    showInfoModal('Fehler', `Ein Fehler ist beim Ändern der Einstellung "${settingKey.replace(/_/g, ' ')}" aufgetreten.`);
                    window.debugLog(`Admin_GlobalSettings: Fehler beim Ändern der Einstellung '${settingKey}'.`, 'ERROR', 'Admin_GlobalSettings', error);
                }
            }
        );
    };

    await loadSettings();

    saveGuestLimitsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        saveGuestLimits();
    });

    systemSettingToggles.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const settingKey = button.dataset.settingKey;
            toggleSystemSetting(button, settingKey);
        });
    });

    window.debugLog("Admin_GlobalSettings: Setup der globalen Einstellungsseite abgeschlossen.", 'INFO', 'Admin_GlobalSettings');
}
