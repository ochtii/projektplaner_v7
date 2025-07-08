"use strict";

// =================================================================
// EINSTELLUNGEN LOGIK
// =================================================================
// Dieses Modul enthält die Logik für die Einstellungsseite,
// einschließlich Theme-Umschaltung und Datenrücksetzung.

/**
 * Richtet die Einstellungsseite ein.
 * Initialisiert Event-Listener für Theme-Umschaltung und Datenrücksetzung.
 */
export async function setupSettingsPage() {
    const themeSwitcher = document.getElementById('themeSwitcher');
    if (themeSwitcher) {
        themeSwitcher.addEventListener('change', async () => {
            const newTheme = themeSwitcher.checked ? 'dark' : 'light';
            document.body.classList.toggle('dark-mode', themeSwitcher.checked);
            // Greift auf window.db zu
            await window.db.saveSettings({ theme: newTheme });
        });
    }

    const deleteAppDataBtn = document.getElementById('delete-app-data-btn');
    if (deleteAppDataBtn) {
        deleteAppDataBtn.addEventListener('click', () => {
            // Greift auf window.currentUser zu
            const message = window.currentUser.is_guest
                ? 'Möchten Sie wirklich alle Ihre im Browser gespeicherten Projekte löschen?'
                : 'Möchten Sie wirklich alle Ihre Projekte und Einstellungen auf dem Server unwiderruflich löschen?';

            // Ruft showConfirmationModal auf
            window.showConfirmationModal('Alle Daten löschen?', message, async () => {
                // Greift auf window.db zu
                await window.db.resetAllData();
                // Ruft showInfoModal auf
                window.showInfoModal('Erfolg', 'Alle Ihre Daten wurden gelöscht.', () => {
                    window.location.href = '/dashboard';
                });
            });
        });
    }
}
