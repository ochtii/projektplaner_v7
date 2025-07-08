// ochtii/projektplaner_v7/projektplaner_v7-55c8a693a05caeff31bc85b526881ea8deee5951/static/js/ui/global_ui.js
"use strict";

// =================================================================
// GLOBALE UI-FUNKTIONEN
// =================================================================
// Dieses Modul enthält Funktionen, die allgemeine UI-Elemente
// und das globale Erscheinungsbild der Anwendung steuern.

/**
 * Wendet das gespeicherte Theme auf den Body an.
 * @returns {Promise<void>}
 */
export async function applyTheme() {
    // Greift auf window.db zu, da db eine globale Variable ist, die in main.js zugewiesen wird
    const settings = await window.db.getSettings();
    const isDark = settings.theme === 'dark';
    document.body.classList.toggle('dark-mode', isDark);

    const themeSwitcher = document.getElementById('themeSwitcher');
    if (themeSwitcher) {
        themeSwitcher.checked = isDark;
    }
    window.debugLog(`GlobalUI: Theme angewendet: ${isDark ? 'dark' : 'light'}.`, 'INFO', 'GlobalUI');
}

/**
 * Richtet globale UI-Elemente ein, wie Header-Aktionen und Submenüs.
 * @param {object} session Das aktuelle Session-Objekt des Benutzers.
 */
export function setupGlobalUI(session) {
    window.debugLog("GlobalUI: Setup der globalen UI gestartet.", 'INFO', 'GlobalUI');
    const headerActions = document.getElementById('header-actions');
    if (headerActions) {
        if (session.logged_in) {
            headerActions.innerHTML = `<span>Willkommen, <strong>${session.username}</strong></span><a href="/logout" class="btn btn-secondary btn-sm">Logout</a>`;
            window.debugLog(`GlobalUI: Benutzer angemeldet: ${session.username}.`, 'INFO', 'GlobalUI');
        } else if (session.is_guest) {
            headerActions.innerHTML = `<span><strong>Gast-Modus</strong></span><a href="/login" class="btn btn-primary btn-sm">Anmelden</a>`;
            window.debugLog("GlobalUI: Gast-Modus aktiv.", 'INFO', 'GlobalUI');
        } else {
            headerActions.innerHTML = `<a href="/login" class="btn btn-secondary">Anmelden</a><a href="/register" class="btn btn-primary">Registrieren</a>`;
            window.debugLog("GlobalUI: Nicht angemeldet (öffentlicher Modus).", 'INFO', 'GlobalUI');
        }
    }

    // Logik für das mobile Menü
    const mobileMenuButton = document.getElementById('mobileMenuButton');
    const mobileNav = document.getElementById('mobileNav');
    const closeMobileNav = document.getElementById('closeMobileNav');
    const overlay = document.getElementById('overlay');

    if (mobileMenuButton && mobileNav && closeMobileNav && overlay) {
        mobileMenuButton.addEventListener('click', () => {
            mobileNav.classList.add('open');
            overlay.classList.add('visible');
            window.debugLog("GlobalUI: Mobiles Menü geöffnet.", 'INFO', 'GlobalUI');
        });
        closeMobileNav.addEventListener('click', () => {
            mobileNav.classList.remove('open');
            overlay.classList.remove('visible');
            window.debugLog("GlobalUI: Mobiles Menü geschlossen.", 'INFO', 'GlobalUI');
        });
        overlay.addEventListener('click', () => {
            mobileNav.classList.remove('open');
            overlay.classList.remove('visible');
            window.debugLog("GlobalUI: Mobiles Menü über Overlay geschlossen.", 'INFO', 'GlobalUI');
        });
    }

    // Logik für Submenüs in der Navigation
    document.querySelectorAll('.main-nav .submenu-toggle').forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            const submenu = toggle.nextElementSibling;
            if (submenu.classList.contains('open')) {
                submenu.classList.remove('open');
                toggle.classList.remove('open');
                window.debugLog("GlobalUI: Submenü geschlossen.", 'INFO', 'GlobalUI');
            } else {
                // Schließe alle anderen offenen Submenüs
                document.querySelectorAll('.main-nav .submenu.open').forEach(openSubmenu => {
                    openSubmenu.classList.remove('open');
                    openSubmenu.previousElementSibling.classList.remove('open');
                });
                submenu.classList.add('open');
                toggle.classList.add('open');
                window.debugLog("GlobalUI: Submenü geöffnet.", 'INFO', 'GlobalUI');
            }
        });
    });

    // Admin-Menü nur anzeigen, wenn der Benutzer Admin ist
    if (session.isAdmin) {
        const adminMenu = document.getElementById('admin-menu');
        if (adminMenu) {
            adminMenu.classList.remove('hidden');
            window.debugLog("GlobalUI: Admin-Menü sichtbar gemacht.", 'INFO', 'GlobalUI');
        }
    }

    // NEU: Debug-Indikator anzeigen, wenn Debug-Modus aktiv UND Admin
    const debugIndicator = document.getElementById('debug-indicator');
    if (debugIndicator) {
        if (window.globalSettings?.general_debug_mode && session.isAdmin) {
            debugIndicator.classList.remove('hidden');
            window.debugLog("GlobalUI: Debug-Indikator sichtbar.", 'INFO', 'GlobalUI');
        } else {
            debugIndicator.classList.add('hidden');
            window.debugLog("GlobalUI: Debug-Indikator versteckt.", 'INFO', 'GlobalUI');
        }
    }


    // Sprachauswahl Logik (falls auf der Seite vorhanden)
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
        const savedLanguage = localStorage.getItem('language');
        if (savedLanguage) {
            languageSelect.value = savedLanguage;
            window.debugLog(`GlobalUI: Sprache aus LocalStorage geladen: ${savedLanguage}.`, 'INFO', 'GlobalUI');
        }
        languageSelect.addEventListener('change', () => {
            const selectedLanguage = languageSelect.value;
            localStorage.setItem('language', selectedLanguage);
            window.debugLog(`GlobalUI: Sprache geändert zu: ${selectedLanguage}. Seite wird neu geladen.`, 'INFO', 'GlobalUI');
            location.reload(); // Seite neu laden, um Sprachänderung anzuwenden
        });
    }
    window.debugLog("GlobalUI: Setup der globalen UI abgeschlossen.", 'INFO', 'GlobalUI');
}

/**
 * Aktualisiert den Titel im Header basierend auf dem aktuellen Projekt und der Seite.
 * @param {string} projectTitle Der Titel des aktuellen Projekts.
 * @param {string} pageTitle Der Titel der aktuellen Seite.
 */
export function updateHeaderTitles(pageTitle, projectTitle) { // Reihenfolge der Parameter geändert, um der neuen Anordnung zu entsprechen
    const projectHeaderTitle = document.getElementById('current-project-header-title');
    const pageHeaderTitle = document.getElementById('current-page-header-title');
    const separator = document.getElementById('header-title-separator');

    // Seitentitel zuerst
    if (pageHeaderTitle) {
        pageHeaderTitle.textContent = pageTitle;
        pageHeaderTitle.classList.toggle('hidden', !pageTitle);
    }

    // Projekttitel danach
    if (projectHeaderTitle) {
        projectHeaderTitle.textContent = projectTitle;
        projectHeaderTitle.classList.toggle('hidden', !projectTitle);
    }

    // Trenner nur anzeigen, wenn beide Titel vorhanden sind
    if (separator) {
        separator.classList.toggle('hidden', !pageTitle || !projectTitle);
    }
    window.debugLog(`GlobalUI: Header-Titel aktualisiert. Seite: "${pageTitle}", Projekt: "${projectTitle}".`, 'INFO', 'GlobalUI');
}