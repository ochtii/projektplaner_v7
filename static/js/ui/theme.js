// static/js/ui/theme.js
"use strict";

// =================================================================
// THEME-VERWALTUNG
// =================================================================
// Dieses Modul enthält die Logik zur Theme-Verwaltung (Dark/Light Mode).

/**
 * Wendet das gespeicherte Theme auf den Body an.
 * Diese Funktion sollte so früh wie möglich im Ladezyklus aufgerufen werden.
 * Sie fügt die 'light-mode'-Klasse hinzu oder entfernt sie.
 */
export function applyTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
    } else {
        // Standard ist Dark Mode, wenn nichts gespeichert oder 'dark' gespeichert ist
        document.body.classList.remove('light-mode');
    }
    // Debug-Log, wenn globaler Debug-Modus aktiv ist
    if (window.debugLog) {
        window.debugLog(`Theme angewendet: ${savedTheme || 'dark'} (aus localStorage)`, 'INFO', 'Theme');
    }
}

/**
 * Initialisiert den Theme-Umschalter auf der Einstellungsseite.
 * @param {object} initialSettings Die initialen Benutzereinstellungen, um den Schalter zu setzen.
 */
export function initializeThemeSwitcher(initialSettings) {
    const themeSwitcher = document.getElementById('themeSwitcher');
    if (themeSwitcher) {
        // Setze den Schalter basierend auf den geladenen Einstellungen
        themeSwitcher.checked = initialSettings.theme === 'dark';

        themeSwitcher.addEventListener('change', async () => {
            const newTheme = themeSwitcher.checked ? 'dark' : 'light';
            
            // Wende das Theme sofort an
            if (newTheme === 'light') {
                document.body.classList.add('light-mode');
            } else {
                document.body.classList.remove('light-mode');
            }
            
            // Speichere die Einstellung im localStorage
            localStorage.setItem('theme', newTheme);

            // Speichere die Einstellung auf dem Server, falls angemeldet
            if (window.db && window.currentUser && !window.currentUser.is_guest) {
                try {
                    await window.db.saveSettings({ theme: newTheme });
                    if (window.debugLog) {
                        window.debugLog(`Theme auf Server gespeichert: ${newTheme}`, 'INFO', 'Theme');
                    }
                } catch (error) {
                    console.error("Fehler beim Speichern des Themes auf dem Server:", error);
                    if (window.showInfoModal) { // Prüfen, ob Modal-Funktion verfügbar ist
                        window.showInfoModal('Fehler', 'Theme konnte nicht auf dem Server gespeichert werden.');
                    }
                    if (window.debugLog) {
                        window.debugLog(`Fehler beim Speichern des Themes auf dem Server: ${error.message}`, 'ERROR', 'Theme', error);
                    }
                }
            } else if (window.debugLog) {
                window.debugLog(`Theme nur lokal gespeichert (Gastmodus oder nicht angemeldet): ${newTheme}`, 'INFO', 'Theme');
            }
        });
    }
}