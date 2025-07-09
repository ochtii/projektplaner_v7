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
    // Light-Mode-Logik wurde entfernt. Die Anwendung ist standardmäßig im Dark Mode.
    document.body.classList.remove('light-mode');
    
    // Debug-Log, wenn globaler Debug-Modus aktiv ist
    if (window.debugLog) {
        window.debugLog(`Theme angewendet: dark (Standard)`, 'INFO', 'Theme');
    }
}

/**
 * Initialisiert den Theme-Umschalter auf der Einstellungsseite.
 * @param {object} initialSettings Die initialen Benutzereinstellungen, um den Schalter zu setzen.
 */
export function initializeThemeSwitcher(initialSettings) {
    // Die Funktionalität für den Theme-Umschalter wurde entfernt.
    // In settings.html gibt es keinen #themeSwitcher mehr.
    const themeSwitcher = document.getElementById('themeSwitcher');
    if (themeSwitcher) {
        themeSwitcher.parentElement.parentElement.parentElement.style.display = 'none'; // Verstecke das gesamte "setting-item"
    }
    if (window.debugLog) {
        window.debugLog('Theme-Umschalter-Logik entfernt, da Light Mode nicht mehr unterstützt wird.', 'INFO', 'Theme');
    }
}