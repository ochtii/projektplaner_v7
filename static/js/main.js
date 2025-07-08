// ochtii/projektplaner_v7/projektplaner_v7-55c8a693a05caeff31bc85b526881ea8deee5951/static/js/main.js
"use strict";

// =================================================================
// GLOBAL STATE & INITIALIZATION
// =================================================================
let currentProjectData = null;
let currentProjectId = null;
let currentlySelectedItem = null;
let currentlySelectedType = null;
let db; // This will be our database interface (either API or LocalStorage)
let currentUser = null; // Holds session info like { username, is_guest, isAdmin }
let globalSettings = {}; // Guest limits etc.
let hasInitialProjectBeenLoaded = false; // Flag to track initial project load

// Expose these globally for ui.js to access
window.currentProjectData = currentProjectData;
window.currentlySelectedItem = currentlySelectedItem;
window.currentlySelectedType = currentlySelectedType;
window.db = db;
window.currentUser = currentUser;
window.globalSettings = globalSettings; // NEU: globalSettings exponiert
window.hasInitialProjectBeenLoaded = hasInitialProjectBeenLoaded; // Expose this flag

// =================================================================
// GLOBALE DEBUG-FUNKTION (NEU)
// =================================================================
const MAX_DEBUG_LOG_ENTRIES = 100; // Maximale Anzahl der Einträge im Speicher
const DEBUG_LOG_STORAGE_KEY = 'debugLogs';
const DEBUG_CONSOLE_HEIGHT_KEY = 'debugConsoleHeight';
const DEBUG_CONSOLE_FIXED_KEY = 'debugConsoleFixed';
const DEBUG_CONSOLE_REVERSE_ORDER_KEY = 'debugConsoleReverseOrder'; // NEU: Key für umgekehrte Reihenfolge
const DEBUG_CONSOLE_AUTO_SCROLL_KEY = 'debugConsoleAutoScroll'; // NEU: Key für Auto-Scroll
const DEBUG_LOG_FILTER_KEY = 'debugLogFilter'; // NEU: Key für Log-Filter
const DEBUG_MENU_HIDDEN_KEY = 'debugMenuHidden'; // NEU: Key für Menü-Sichtbarkeit

/**
 * Führt eine Debug-Log-Meldung aus, wenn der globale Debug-Modus aktiv
 * und der aktuelle Benutzer ein Administrator ist.
 * Protokolliert in der Konsole und in der Debug-Konsole im DOM.
 * @param {string} message Die zu protokollierende Nachricht.
 * @param {string} level Der Log-Level ('INFO', 'WARN', 'ERROR'). Standard ist 'INFO'.
 * @param {string} origin Die Herkunft der Nachricht (z.B. 'main.js', 'Dashboard').
 * @param {*} data Optional zusätzliche Daten.
 */
window.debugLog = function(message, level = 'INFO', origin = 'Global', data) {
    // Nur loggen, wenn Debug-Modus aktiv und Benutzer Admin ist
    if (!window.globalSettings?.general_debug_mode || !window.currentUser?.isAdmin) {
        return;
    }

    const timestamp = new Date().toLocaleString('de-DE', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    const logEntry = {
        timestamp: timestamp,
        level: level.toUpperCase(),
        origin: origin,
        message: message,
        data: data ? JSON.stringify(data) : undefined // Daten als String speichern
    };

    // Konsolen-Log
    const consoleMessage = `[${logEntry.level}] [${logEntry.origin}] ${logEntry.message}`;
    if (logEntry.level === 'ERROR') {
        console.error(consoleMessage, data || '');
    } else if (logEntry.level === 'WARN') {
        console.warn(consoleMessage, data || '');
    } else {
        console.log(consoleMessage, data || '');
    }

    // DOM-Log
    const logEntriesContainer = document.getElementById('debug-log-entries');
    if (logEntriesContainer) {
        // NEU: Filtern nach ausgewählten Log-Levels
        const activeFilters = JSON.parse(localStorage.getItem(DEBUG_LOG_FILTER_KEY) || '["INFO", "WARN", "ERROR"]');
        if (!activeFilters.includes(logEntry.level)) {
            return; // Log nicht anzeigen, wenn der Level nicht gefiltert ist
        }

        const entryDiv = document.createElement('div');
        entryDiv.className = `debug-log-entry log-${logEntry.level.toLowerCase()}`;
        entryDiv.innerHTML = `
            <span class="log-timestamp">${logEntry.timestamp}</span>
            <span class="log-level">[${logEntry.level}]</span>
            <span class="log-origin">${logEntry.origin}</span>
            <span class="log-message">${logEntry.message}</span>
        `;
        // Optional: Daten im DOM anzeigen, wenn vorhanden
        if (logEntry.data) {
            const dataSpan = document.createElement('span');
            dataSpan.className = 'log-data';
            dataSpan.style.fontSize = '0.8em';
            dataSpan.style.opacity = '0.7';
            dataSpan.textContent = ` (${logEntry.data})`;
            entryDiv.appendChild(dataSpan);
        }

        // NEU: Logs umgekehrt hinzufügen, wenn Option aktiv
        const reverseOrder = localStorage.getItem(DEBUG_CONSOLE_REVERSE_ORDER_KEY) === 'true';
        if (reverseOrder) {
            logEntriesContainer.prepend(entryDiv); // Fügt am Anfang hinzu
        } else {
            logEntriesContainer.appendChild(entryDiv); // Fügt am Ende hinzu
        }

        // NEU: Automatisch nach unten/oben scrollen basierend auf der Option
        const autoScrollEnabled = localStorage.getItem(DEBUG_CONSOLE_AUTO_SCROLL_KEY) === 'true';
        if (autoScrollEnabled) {
            if (reverseOrder) {
                logEntriesContainer.scrollTop = 0; // Nach oben scrollen
            } else {
                logEntriesContainer.scrollTop = logEntriesContainer.scrollHeight; // Nach unten scrollen
            }
        }
    }

    // Speichern im LocalStorage
    let storedLogs = JSON.parse(localStorage.getItem(DEBUG_LOG_STORAGE_KEY) || '[]');
    storedLogs.push(logEntry);
    // Begrenze die Anzahl der Einträge
    if (storedLogs.length > MAX_DEBUG_LOG_ENTRIES) {
        storedLogs = storedLogs.slice(storedLogs.length - MAX_DEBUG_LOG_ENTRIES);
    }
    localStorage.setItem(DEBUG_LOG_STORAGE_KEY, JSON.stringify(storedLogs));
};

/**
 * Lädt Debug-Logs aus dem LocalStorage und zeigt sie in der Konsole an.
 */
function loadDebugLogsFromLocalStorage() {
    const storedLogs = JSON.parse(localStorage.getItem(DEBUG_LOG_STORAGE_KEY) || '[]');
    const logEntriesContainer = document.getElementById('debug-log-entries');
    const reverseOrder = localStorage.getItem(DEBUG_CONSOLE_REVERSE_ORDER_KEY) === 'true'; // NEU
    const autoScrollEnabled = localStorage.getItem(DEBUG_CONSOLE_AUTO_SCROLL_KEY) === 'true'; // NEU
    const activeFilters = JSON.parse(localStorage.getItem(DEBUG_LOG_FILTER_KEY) || '["INFO", "WARN", "ERROR"]'); // NEU

    if (logEntriesContainer) {
        logEntriesContainer.innerHTML = ''; // Vorherige Einträge löschen
        // NEU: Logs in der richtigen Reihenfolge einfügen
        const fragment = document.createDocumentFragment();
        storedLogs.forEach(logEntry => {
            // NEU: Filtern nach ausgewählten Log-Levels
            if (!activeFilters.includes(logEntry.level)) {
                return; // Log nicht anzeigen, wenn der Level nicht gefiltert ist
            }

            const entryDiv = document.createElement('div');
            entryDiv.className = `debug-log-entry log-${logEntry.level.toLowerCase()}`;
            entryDiv.innerHTML = `
                <span class="log-timestamp">${logEntry.timestamp}</span>
                <span class="log-level">[${logEntry.level}]</span>
                <span class="log-origin">${logEntry.origin}</span>
                <span class="log-message">${logEntry.message}</span>
            `;
            if (logEntry.data) {
                const dataSpan = document.createElement('span');
                dataSpan.className = 'log-data';
                dataSpan.style.fontSize = '0.8em';
                dataSpan.style.opacity = '0.7';
                dataSpan.textContent = ` (${logEntry.data})`;
                entryDiv.appendChild(dataSpan);
            }
            if (reverseOrder) {
                fragment.prepend(entryDiv); // Am Anfang des Fragments einfügen
            } else {
                fragment.appendChild(entryDiv); // Am Ende des Fragments einfügen
            }
        });
        logEntriesContainer.appendChild(fragment); // Fragment einmalig hinzufügen

        // Automatisch nach unten/oben scrollen
        if (autoScrollEnabled) { // NEU: Nur scrollen, wenn Auto-Scroll aktiv
            if (reverseOrder) {
                logEntriesContainer.scrollTop = 0;
            } else {
                logEntriesContainer.scrollTop = logEntriesContainer.scrollHeight;
            }
        }
    }
}

/**
 * Löscht alle Debug-Logs aus dem LocalStorage und der Anzeige.
 */
function clearDebugLogs() {
    // NEU: Sicherheitsabfrage hinzufügen
    if (showConfirmationModal) { // Prüfen, ob showConfirmationModal verfügbar ist
        showConfirmationModal( // window. entfernt
            'Logs löschen',
            'Möchten Sie wirklich alle Debug-Logs unwiderruflich löschen?',
            () => {
                localStorage.removeItem(DEBUG_LOG_STORAGE_KEY);
                const logEntriesContainer = document.getElementById('debug-log-entries');
                if (logEntriesContainer) {
                    logEntriesContainer.innerHTML = '';
                }
                window.debugLog("Debug-Konsole geleert.", 'INFO', 'DebugConsole');
            }
        );
    } else {
        // Fallback, falls Modal nicht geladen werden kann (sollte nicht passieren)
        if (confirm('Möchten Sie wirklich alle Debug-Logs unwiderruflich löschen?')) {
            localStorage.removeItem(DEBUG_LOG_STORAGE_KEY);
            const logEntriesContainer = document.getElementById('debug-log-entries');
            if (logEntriesContainer) {
                logEntriesContainer.innerHTML = '';
            }
            window.debugLog("Debug-Konsole geleert (ohne Modal).", 'INFO', 'DebugConsole');
        }
    }
}

/**
 * Exportiert alle Debug-Logs als Textdatei.
 */
function exportDebugLogs() {
    const storedLogs = JSON.parse(localStorage.getItem(DEBUG_LOG_STORAGE_KEY) || '[]');
    if (storedLogs.length === 0) {
        window.debugLog("DebugConsole: Keine Logs zum Exportieren gefunden.", 'INFO', 'DebugConsole');
        if (window.showInfoModal) {
            window.showInfoModal('Info', 'Keine Logs zum Exportieren vorhanden.');
        }
        return;
    }

    let logContent = "Projektplaner Debug Logs\n";
    logContent += `Export Datum: ${new Date().toLocaleString('de-DE')}\n`;
    logContent += "=========================================\n\n";

    storedLogs.forEach(entry => {
        logContent += `${entry.timestamp} [${entry.level}] [${entry.origin}] ${entry.message}`;
        if (entry.data) {
            logContent += ` (${entry.data})`;
        }
        logContent += "\n";
    });

    const blob = new Blob([logContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    const filename = `projektplaner_v7_logs_${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}-${now.getSeconds().toString().padStart(2, '0')}.log`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    window.debugLog(`DebugConsole: Logs als '${filename}' exportiert.`, 'INFO', 'DebugConsole');
}

/**
 * Initialisiert die Größenänderungs- und Fixierungslogik für die Debug-Konsole.
 */
function initializeDebugConsoleResizing() {
    const debugConsole = document.getElementById('debug-console');
    const resizeHandle = document.getElementById('resize-debug-logs-handle'); // NEU: Handle für Größenänderung
    const toggleFixBtn = document.getElementById('toggle-fix-debug-logs-btn');
    const exportLogsBtn = document.getElementById('export-debug-logs-btn');
    const clearLogsBtn = document.getElementById('clear-debug-logs-btn');
    const toggleReverseLogsBtn = document.getElementById('toggle-reverse-logs-btn'); // NEU
    const toggleAutoScrollBtn = document.getElementById('toggle-auto-scroll-btn'); // NEU


    if (!debugConsole) {
        window.debugLog("DebugConsole: Debug-Konsole Element nicht gefunden.", 'WARN', 'DebugConsole');
        return;
    }

    let isResizing = false;
    let startY;
    let startHeight;

    // Lade gespeicherte Höhe und Fixierungsstatus
    const savedHeight = localStorage.getItem(DEBUG_CONSOLE_HEIGHT_KEY);
    let isFixed = localStorage.getItem(DEBUG_CONSOLE_FIXED_KEY) === 'true';
    let reverseOrder = localStorage.getItem(DEBUG_CONSOLE_REVERSE_ORDER_KEY) === 'true'; // NEU
    let autoScrollEnabled = localStorage.getItem(DEBUG_CONSOLE_AUTO_SCROLL_KEY) === 'true'; // NEU

    // Setze Initialzustand basierend auf gespeicherten Werten
    if (isFixed) {
        debugConsole.classList.add('fixed');
        if (savedHeight) {
            debugConsole.style.setProperty('--fixed-debug-height', savedHeight); // Setze CSS-Variable
            debugConsole.style.height = savedHeight;
            debugConsole.style.maxHeight = 'none';
        }
        if (toggleFixBtn) toggleFixBtn.innerHTML = '<svg class="lock-icon lock-closed" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>';
        if (resizeHandle) resizeHandle.classList.add('hidden'); // Resize-Handle ausblenden, wenn fixiert
    } else {
        debugConsole.classList.remove('fixed');
        // NEU: Höhe nicht zurücksetzen, wenn nicht fixiert, damit manuelle Größenänderung erhalten bleibt
        if (savedHeight) { // Nur wenn eine Höhe gespeichert war, diese als Startwert setzen
            debugConsole.style.height = savedHeight;
            debugConsole.style.maxHeight = 'none'; // Muss 'none' sein, damit height wirkt
        } else {
            debugConsole.style.height = ''; // Oder Standard-CSS greifen lassen
            debugConsole.style.maxHeight = '250px'; // Standard max-height wiederherstellen
        }
        if (toggleFixBtn) toggleFixBtn.innerHTML = '<svg class="lock-icon lock-open" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>';
        if (resizeHandle) resizeHandle.classList.remove('hidden'); // Resize-Handle einblenden, wenn nicht fixiert
    }

    // NEU: Initialisiere Toggle-Button für umgekehrte Reihenfolge
    if (toggleReverseLogsBtn) {
        toggleReverseLogsBtn.textContent = reverseOrder ? 'Logs normal' : 'Logs umkehren';
        toggleReverseLogsBtn.addEventListener('click', () => {
            reverseOrder = !reverseOrder;
            localStorage.setItem(DEBUG_CONSOLE_REVERSE_ORDER_KEY, reverseOrder);
            toggleReverseLogsBtn.textContent = reverseOrder ? 'Logs normal' : 'Logs umkehren';
            loadDebugLogsFromLocalStorage(); // Logs neu laden in umgekehrter Reihenfolge
            window.debugLog(`DebugConsole: Log-Reihenfolge umgeschaltet zu ${reverseOrder ? 'umgekehrt' : 'normal'}.`, 'INFO', 'DebugConsole');
        });
    }

    // NEU: Initialisiere Toggle-Button für Auto-Scroll
    if (toggleAutoScrollBtn) {
        toggleAutoScrollBtn.textContent = autoScrollEnabled ? 'Auto-Scroll: AN' : 'Auto-Scroll: AUS';
        toggleAutoScrollBtn.addEventListener('click', () => {
            autoScrollEnabled = !autoScrollEnabled;
            localStorage.setItem(DEBUG_CONSOLE_AUTO_SCROLL_KEY, autoScrollEnabled);
            toggleAutoScrollBtn.textContent = autoScrollEnabled ? 'Auto-Scroll: AN' : 'Auto-Scroll: AUS';
            window.debugLog(`DebugConsole: Auto-Scroll umgeschaltet zu ${autoScrollEnabled ? 'AN' : 'AUS'}.`, 'INFO', 'DebugConsole');
            // Bei Aktivierung sofort scrollen
            if (autoScrollEnabled) {
                const logEntriesContainer = document.getElementById('debug-log-entries');
                if (logEntriesContainer) {
                    const reverse = localStorage.getItem(DEBUG_CONSOLE_REVERSE_ORDER_KEY) === 'true';
                    if (reverse) {
                        logEntriesContainer.scrollTop = 0;
                    } else {
                        logEntriesContainer.scrollTop = logEntriesContainer.scrollHeight;
                    }
                }
            }
        });
    }


    // Event Listener für Größenänderung (Manuell durch Drag)
    if (resizeHandle) { // Listener auf das Handle übertragen
        resizeHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isResizing = true;
            startY = e.clientY;
            startHeight = debugConsole.offsetHeight;
            debugConsole.style.transition = 'none'; // Übergänge während des Resizing deaktivieren
            document.body.style.cursor = 'ns-resize'; // Mauszeiger ändern
            window.debugLog("DebugConsole: Größenänderung gestartet.", 'INFO', 'DebugConsole');
        });
    }

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const newHeight = startHeight - (e.clientY - startY);
        // Sicherstellen, dass die Höhe nicht unter min-height fällt
        debugConsole.style.height = `${Math.max(newHeight, 50)}px`; // min-height von 50px
        debugConsole.style.maxHeight = 'none'; // Deaktiviere max-height, wenn manuell geändert
        localStorage.setItem(DEBUG_CONSOLE_HEIGHT_KEY, debugConsole.style.height); // Höhe speichern
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = ''; // Mauszeiger zurücksetzen
            window.debugLog("DebugConsole: Größenänderung beendet.", 'INFO', 'DebugConsole');
        }
    });

    // Event Listener für Fixieren/Loslösen
    if (toggleFixBtn) {
        toggleFixBtn.addEventListener('click', () => {
            isFixed = !isFixed; // Status umschalten
            if (isFixed) {
                // Fixieren
                const currentHeight = debugConsole.offsetHeight; // Aktuelle Höhe fixieren
                debugConsole.classList.add('fixed');
                debugConsole.style.setProperty('--fixed-debug-height', `${currentHeight}px`); // Setze CSS-Variable
                debugConsole.style.height = `${currentHeight}px`; // Aktuelle Höhe fixieren
                debugConsole.style.maxHeight = 'none'; // max-height deaktivieren
                toggleFixBtn.innerHTML = '<svg class="lock-icon lock-closed" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>';
                if (resizeHandle) resizeHandle.classList.add('hidden'); // Resize-Handle ausblenden
                localStorage.setItem(DEBUG_CONSOLE_FIXED_KEY, 'true');
                localStorage.setItem(DEBUG_CONSOLE_HEIGHT_KEY, `${currentHeight}px`); // Fixierte Höhe speichern
                window.debugLog(`DebugConsole: Fixiert auf Höhe: ${currentHeight}px.`, 'INFO', 'DebugConsole');
            } else {
                // Fixierung aufheben
                debugConsole.classList.remove('fixed');
                // NEU: Höhe beibehalten, wenn sie zuvor manuell gesetzt wurde
                const storedHeight = localStorage.getItem(DEBUG_CONSOLE_HEIGHT_KEY);
                if (storedHeight) {
                    debugConsole.style.height = storedHeight;
                    debugConsole.style.maxHeight = 'none'; // Muss 'none' sein, damit height wirkt
                } else {
                    debugConsole.style.height = ''; // Standard-CSS greifen lassen
                    debugConsole.style.maxHeight = '250px'; // Standard max-height wiederherstellen
                }
                toggleFixBtn.innerHTML = '<svg class="lock-icon lock-open" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>';
                if (resizeHandle) resizeHandle.classList.remove('hidden'); // Resize-Handle einblenden
                localStorage.setItem(DEBUG_CONSOLE_FIXED_KEY, 'false');
                // localStorage.removeItem(DEBUG_CONSOLE_HEIGHT_KEY); // Entfernen, da Höhe beibehalten wird
                window.debugLog("DebugConsole: Fixierung aufgehoben. Höhe wird beibehalten oder Standard angewendet.", 'INFO', 'DebugConsole');
            }
        });
    }

    // Event Listener für Export-Button
    if (exportLogsBtn) {
        exportLogsBtn.addEventListener('click', exportDebugLogs);
    }

    // Event Listener für Clear-Button (bereits in clearDebugLogs definiert)
    if (clearLogsBtn) {
        clearLogsBtn.addEventListener('click', clearDebugLogs);
    }

    window.debugLog("DebugConsole: Größenänderungs- und Fixierungslogik initialisiert.", 'INFO', 'DebugConsole');
}


// =================================================================
// DATABASE ABSTRAKTION
// =================================================================
const apiDb = {
    async getProjects() { 
        window.debugLog("API: Rufe Projekte ab.", 'INFO', 'API_DB');
        return (await fetch('/api/projects')).json(); 
    },
    async getProject(id) { 
        window.debugLog(`API: Rufe Projekt '${id}' ab.`, 'INFO', 'API_DB');
        return (await fetch(`/api/project/${id}`)).json(); 
    },
    async saveProject(id, data) { 
        window.debugLog(`API: Speichere Projekt '${id}'.`, 'INFO', 'API_DB', data);
        return fetch(`/api/project/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); 
    },
    async createProject(data) { 
        window.debugLog("API: Erstelle Projekt.", 'INFO', 'API_DB', data);
        return fetch('/api/project', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); 
    },
    async deleteProject(id) { 
        window.debugLog(`API: Lösche Projekt '${id}'.`, 'WARN', 'API_DB');
        return fetch(`/api/project/${id}`, { method: 'DELETE' }); 
    },
    async getSettings() { 
        window.debugLog("API: Rufe Benutzereinstellungen ab.", 'INFO', 'API_DB');
        return (await fetch('/api/settings')).json(); 
    },
    async saveSettings(data) { 
        window.debugLog("API: Speichere Benutzereinstellungen.", 'INFO', 'API_DB', data);
        return fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); 
    },
    async resetAllData() { 
        window.debugLog("API: Setze alle Daten zurück.", 'ERROR', 'API_DB');
        return fetch('/api/reset-all-data', { method: 'POST' }); 
    },
    async getTemplates() { 
        window.debugLog("API: Rufe Vorlagen ab.", 'INFO', 'API_DB');
        return (await fetch('/api/templates')).json(); 
    },
    async getTemplateContent(templateId) { 
        window.debugLog(`API: Rufe Vorlageninhalt für '${templateId}' ab.`, 'INFO', 'API_DB');
        return (await fetch(`/api/template/${templateId}`)).json(); 
    },
    async getInitialProjectContent() { 
        window.debugLog("API: Rufe initialen Projektinhalt ab.", 'INFO', 'API_DB');
        return (await fetch('/api/initial-project')).json(); 
    }
};

const guestDb = {
    _getProjects() { 
        try { 
            const projects = JSON.parse(localStorage.getItem('guestProjects') || '{}'); 
            window.debugLog("GuestDB: Projekte aus LocalStorage geladen.", 'INFO', 'GuestDB', projects);
            return projects;
        } catch (e) { 
            window.debugLog("GuestDB: Fehler beim Parsen von guestProjects aus LocalStorage.", 'ERROR', 'GuestDB', e);
            return {}; 
        } 
    },
    _saveProjects(p) { 
        localStorage.setItem('guestProjects', JSON.stringify(p)); 
        window.debugLog("GuestDB: Projekte in LocalStorage gespeichert.", 'INFO', 'GuestDB', p);
    },
    async getProjects() {
        const projects = this._getProjects();
        const formattedProjects = Object.values(projects).map(p => ({ ...p, id: p.projectId, name: p.projectName, progress: this._calculateProgress(p) }));
        window.debugLog("GuestDB: Alle Projekte (formatiert) abgerufen.", 'INFO', 'GuestDB', formattedProjects);
        return formattedProjects;
    },
    async getProject(id) { 
        const project = this._getProjects()[id] || null; 
        window.debugLog(`GuestDB: Projekt '${id}' abgerufen.`, 'INFO', 'GuestDB', project);
        return project;
    },
    async saveProject(id, data) {
        const projects = this._getProjects();
        projects[id] = data;
        this._saveProjects(projects);
        window.debugLog(`GuestDB: Projekt '${id}' gespeichert.`, 'INFO', 'GuestDB', data);
        return { ok: true };
    },
    async createProject(data) {
        const projects = this._getProjects();
        if (Object.keys(projects).length >= (window.globalSettings?.guest_limits?.projects || 1)) {
            window.showInfoModal('Limit erreicht', `Als Gast können Sie maximal ${window.globalSettings.guest_limits.projects} Projekte erstellen.`);
            window.debugLog("GuestDB: Projekterstellung fehlgeschlagen, Gast-Limit erreicht.", 'WARN', 'GuestDB');
            return { ok: false };
        }
        projects[data.projectId] = data;
        this._saveProjects(projects);
        window.debugLog(`GuestDB: Projekt '${data.projectId}' erstellt.`, 'INFO', 'GuestDB', data);
        return { ok: true, json: async () => data };
    },
    async deleteProject(id) {
        const projects = this._getProjects();
        delete projects[id];
        this._saveProjects(projects);
        window.debugLog(`GuestDB: Projekt '${id}' gelöscht.`, 'WARN', 'GuestDB');
        return { ok: true };
    },
    _calculateProgress(project) {
        let total = 0, completed = 0;
        (project.phases || []).forEach(phase => {
            (phase.tasks || []).forEach(task => {
                const items = task.subtasks && task.subtasks.length > 0 ? task.subtasks : [task];
                total += items.length;
                completed += items.filter(i => i.done).length;
            });
        });
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        window.debugLog(`GuestDB: Fortschritt für Projekt '${project.projectName}' berechnet: ${progress}%`, 'INFO', 'GuestDB');
        return progress;
    },
    async getSettings() { 
        const themeSetting = localStorage.getItem('theme') || 'dark'; 
        window.debugLog(`GuestDB: Theme-Einstellung abgerufen: '${themeSetting}'`, 'INFO', 'GuestDB');
        return { theme: themeSetting }; 
    },
    async saveSettings(s) {
        localStorage.setItem('theme', s.theme);
        window.debugLog(`GuestDB: Theme-Einstellung gespeichert: '${s.theme}'`, 'INFO', 'GuestDB');
        return { ok: true };
    },
    async resetAllData() {
        localStorage.removeItem('guestProjects');
        window.debugLog("GuestDB: Alle Gast-Projekte aus LocalStorage gelöscht.", 'WARN', 'GuestDB');
        return { ok: true };
    },
    async getTemplates() { 
        window.debugLog("GuestDB: Vorlagen-Anfrage (nicht unterstützt für Gäste).", 'INFO', 'GuestDB');
        return []; 
    },
    async getTemplateContent(templateId) { 
        window.debugLog(`GuestDB: Vorlageninhalt-Anfrage für '${templateId}' (nicht unterstützt für Gäste).`, 'WARN', 'GuestDB');
        return { error: "Guests cannot access templates." }; 
    },
    async getInitialProjectContent() {
        window.debugLog("GuestDB: Initialer Projektinhalt für Gast abgerufen.", 'INFO', 'GuestDB');
        return {
            projectId: "bsp_guest",
            projectName: "Beispielprojekt (Gast)",
            phases: [
                {
                    phaseId: "phase01",
                    phaseName: "Erste Schritte",
                    isExpanded: true,
                    tasks: [
                        { taskId: "task01", taskName: "App erkunden", subtasks: [] }
                    ]
                }
            ]
        };
    }
};

// =================================================================
// INITIALIZATION
// =================================================================
document.addEventListener('DOMContentLoaded', async () => {
    window.debugLog("main.js: DOMContentLoaded Event gefeuert. Starte Initialisierung.", 'INFO', 'main.js');
    try {
        // Lade Session und globale Einstellungen parallel
        const [session, globalSettingsData] = await Promise.all([
            fetch('/api/session').then(res => res.json()),
            fetch('/api/global-settings').then(res => res.json())
        ]);

        currentUser = session;
        globalSettings = globalSettingsData; // Weise die geladenen globalen Einstellungen zu
        db = session.is_guest ? guestDb : apiDb;

        // Update global window objects
        window.db = db;
        window.currentUser = currentUser;
        window.globalSettings = globalSettings; // Sicherstellen, dass die globale Variable aktualisiert wird

        // Debug-Log, um zu sehen, ob globalSettings korrekt geladen wurde
        window.debugLog("main.js: Globale Einstellungen geladen.", 'INFO', 'main.js', window.globalSettings);
        window.debugLog("main.js: Aktueller Benutzer geladen.", 'INFO', 'main.js', window.currentUser);

        // NEU: Initialisiere Debug-Konsole und lade Logs
        const debugConsole = document.getElementById('debug-console');
        const clearLogsBtn = document.getElementById('clear-debug-logs-btn');
        const debugIndicator = document.getElementById('debug-indicator');
        const resizeHandle = document.getElementById('resize-debug-logs-handle'); // NEU
        const toggleFixBtn = document.getElementById('toggle-fix-debug-logs-btn'); // NEU
        const exportLogsBtn = document.getElementById('export-debug-logs-btn'); // NEU
        const toggleReverseLogsBtn = document.getElementById('toggle-reverse-logs-btn'); // NEU
        const toggleAutoScrollBtn = document.getElementById('toggle-auto-scroll-btn'); // NEU
        const toggleDebugConsoleVisibilityBtn = document.getElementById('toggle-debug-console-visibility-btn'); // NEU
        const toggleDebugMenuBtn = document.getElementById('toggle-debug-menu-btn'); // NEU
        const debugMenu = document.getElementById('debug-menu'); // NEU
        const logFilterButtons = document.querySelectorAll('.debug-log-filter .filter-btn'); // NEU


        if (window.globalSettings?.general_debug_mode && window.currentUser?.isAdmin) {
            // Debug-Menü und Konsole initialisieren und Sichtbarkeit steuern
            if (debugMenu) {
                // Initialen Zustand des Debug-Menüs aus LocalStorage laden
                const isMenuCollapsed = localStorage.getItem(DEBUG_MENU_HIDDEN_KEY) === 'true'; // Verwende 'collapsed' statt 'hidden'
                if (isMenuCollapsed) {
                    debugMenu.classList.add('collapsed');
                } else {
                    debugMenu.classList.remove('collapsed');
                }
                debugMenu.classList.remove('hidden'); // Menü immer sichtbar machen, wenn Debug aktiv
                // Initialisiere Pfeilrichtung des Toggle-Buttons
                if (toggleDebugMenuBtn) {
                    const arrowDown = toggleDebugMenuBtn.querySelector('.arrow-down');
                    const arrowUp = toggleDebugMenuBtn.querySelector('.arrow-up');
                    if (arrowDown && arrowUp) {
                        arrowDown.classList.toggle('hidden', isMenuCollapsed);
                        arrowUp.classList.toggle('hidden', !isMenuCollapsed);
                    }
                }
            }
            if (debugIndicator) debugIndicator.classList.remove('hidden'); // Bug-Symbol im Menü
            
            // Konsole initial versteckt/sichtbar basierend auf gespeichertem Zustand
            if (debugConsole) {
                const isConsoleHidden = localStorage.getItem('debugConsoleHidden') === 'true';
                if (isConsoleHidden) {
                    debugConsole.classList.add('hidden');
                    if (toggleDebugConsoleVisibilityBtn) toggleDebugConsoleVisibilityBtn.classList.remove('active'); // Button-Status
                } else {
                    debugConsole.classList.remove('hidden');
                    if (toggleDebugConsoleVisibilityBtn) toggleDebugConsoleVisibilityBtn.classList.add('active'); // Button-Status
                }
            }

            loadDebugLogsFromLocalStorage(); // Logs laden, wenn Debug-Modus aktiv
            
            // Event Listener für Debug-Konsole Buttons
            if (clearLogsBtn) {
                clearLogsBtn.addEventListener('click', clearDebugLogs);
            }
            if (exportLogsBtn) {
                exportLogsBtn.addEventListener('click', exportDebugLogs);
            }

            initializeDebugConsoleResizing(); // NEU: Initialisiere Größenänderungslogik

            // NEU: Toggle Debug-Konsole Sichtbarkeit (im Debug-Menü)
            if (toggleDebugConsoleVisibilityBtn) {
                toggleDebugConsoleVisibilityBtn.addEventListener('click', () => {
                    if (debugConsole) {
                        const isHidden = debugConsole.classList.contains('hidden');
                        debugConsole.classList.toggle('hidden');
                        localStorage.setItem('debugConsoleHidden', isHidden); // Zustand speichern
                        toggleDebugConsoleVisibilityBtn.classList.toggle('active', !isHidden); // Button-Status
                        window.debugLog(`DebugConsole: Konsole ${isHidden ? 'ausgeblendet' : 'angezeigt'}.`, 'INFO', 'DebugConsole');
                    }
                });
            }

            // NEU: Toggle Debug-Menü Button (der runde Pfeil)
            if (toggleDebugMenuBtn) {
                toggleDebugMenuBtn.addEventListener('click', () => {
                    if (debugMenu) {
                        debugMenu.classList.toggle('collapsed');
                        const isCollapsed = debugMenu.classList.contains('collapsed');
                        localStorage.setItem(DEBUG_MENU_HIDDEN_KEY, isCollapsed); // Zustand speichern
                        
                        const arrowDown = toggleDebugMenuBtn.querySelector('.arrow-down');
                        const arrowUp = toggleDebugMenuBtn.querySelector('.arrow-up');
                        if (arrowDown && arrowUp) {
                            arrowDown.classList.toggle('hidden', isCollapsed);
                            arrowUp.classList.toggle('hidden', !isCollapsed);
                        }
                        window.debugLog(`DebugMenu: Menü ${isCollapsed ? 'eingeklappt' : 'ausgeklappt'}.`, 'INFO', 'DebugMenu');
                    }
                });
            }

            // NEU: Log-Filter Buttons initialisieren
            const savedFilters = JSON.parse(localStorage.getItem(DEBUG_LOG_FILTER_KEY) || '["INFO", "WARN", "ERROR"]');
            logFilterButtons.forEach(button => {
                if (savedFilters.includes(button.dataset.logLevel)) {
                    button.classList.add('active');
                } else {
                    button.classList.remove('active');
                }
                button.addEventListener('click', () => {
                    button.classList.toggle('active');
                    let currentFilters = Array.from(document.querySelectorAll('.debug-log-filter .filter-btn.active')).map(btn => btn.dataset.logLevel);
                    localStorage.setItem(DEBUG_LOG_FILTER_KEY, JSON.stringify(currentFilters));
                    loadDebugLogsFromLocalStorage(); // Logs mit neuem Filter neu laden
                    window.debugLog(`DebugConsole: Log-Filter geändert. Aktive Filter: ${currentFilters.join(', ')}.`, 'INFO', 'DebugConsole');
                });
            });


            window.debugLog("main.js: Debug-Modus und Konsole aktiviert.", 'INFO', 'main.js');
        } else {
            // NEU: Debug-Menü und Konsole verstecken
            const debugMenu = document.getElementById('debug-menu');
            if (debugMenu) debugMenu.classList.add('hidden');
            if (debugConsole) debugConsole.classList.add('hidden');
            if (debugIndicator) debugIndicator.classList.add('hidden');
            localStorage.removeItem(DEBUG_LOG_STORAGE_KEY); // Logs löschen, wenn Debug-Modus nicht aktiv
            localStorage.removeItem(DEBUG_MENU_HIDDEN_KEY); // Menü-Status löschen
            localStorage.removeItem('debugConsoleHidden'); // Konsolen-Status löschen
            window.debugLog("main.js: Debug-Modus ist deaktiviert oder Benutzer ist kein Admin.", 'INFO', 'main.js');
        }


        const publicPages = ['/', '/login', '/register', '/info', '/agb'];
        const path = window.location.pathname;
        if (!session.logged_in && !session.is_guest && !publicPages.some(p => path.startsWith(p))) {
            window.debugLog("main.js: Nicht angemeldet und nicht Gast, leite zu Login um.", 'INFO', 'main.js');
            window.location.href = '/login';
            return;
        }

        // NEU: applyTheme direkt nach dem Laden der Einstellungen aufrufen
        applyTheme();
        window.debugLog("main.js: Theme nach Initialisierung angewendet.", 'INFO', 'main.js');

        runPageSpecificSetup();
        window.debugLog("main.js: Seiten-spezifisches Setup ausgeführt.", 'INFO', 'main.js');

    } catch (error) {
        console.error("Initialization failed:", error);
        window.debugLog("main.js: Initialisierung fehlgeschlagen!", 'ERROR', 'main.js', error);
    }
});


// NEU: applyTheme Funktion aus theme.js importieren
import { applyTheme } from './ui/theme.js';
// NEU: Direkter Import von setupGlobalUI
import { setupGlobalUI, updateHeaderTitles } from './ui/global_ui.js';
// Importiere spezifische Setup-Funktionen direkt
import { setupDashboardPage } from './dashboard/dashboard_logic.js';
import { setupProjectManagerPage, setupProjectChecklistPage } from './project/project_manager_logic.js';
import { setupSettingsPage } from './settings/settings_logic.js'; // Korrigierter Import
import { setupInfoPage } from './info/info_logic.js';
import { setupAdminPages } from './admin/admin_main.js';
import { setupProjectOverviewPage } from './ui/project_overview_renderer.js';
// NEU: showConfirmationModal aus modals.js importieren für clearDebugLogs
import { showConfirmationModal, showInfoModal } from './ui/modals.js';
// NEU: initializeThemeSwitcher aus theme.js importieren
import { initializeThemeSwitcher } from './ui/theme.js';


function runPageSpecificSetup() {
    // Direkter Aufruf der importierten Funktion
    setupGlobalUI(currentUser); // NEU: setupGlobalUI hier aufrufen, damit es die globalSettings nutzen kann
    const path = window.location.pathname;

    const projectPageMatch = path.match(/^\/project(?:-overview|-checklist)?\/([a-zA-Z0-9_]+)/);

    let projectTitle = '';
    let pageTitle = '';

    if (projectPageMatch) {
        window.currentProjectId = projectPageMatch[1]; // Setze die globale Projekt-ID
        projectTitle = 'Projekt: ...'; // Platzhalter, wird später durch tatsächlichen Namen ersetzt
        
        // Setup für alle projektbezogenen Seiten
        if (path.startsWith('/project/')) {
            setupProjectManagerPage(); // Direkter Aufruf
            pageTitle = 'Editor';
            window.debugLog("main.js: Setup für Projekt-Editor-Seite.", 'INFO', 'main.js');
        } else if (path.startsWith('/project-overview/')) {
            setupProjectOverviewPage(); // Direkter Aufruf
            pageTitle = 'Übersicht';
            window.debugLog("main.js: Setup für Projekt-Übersichtsseite.", 'INFO', 'main.js');
        } else if (path.startsWith('/project-checklist/')) {
            setupProjectChecklistPage(); // Direkter Aufruf
            pageTitle = 'Checkliste';
            window.debugLog("main.js: Setup für Projekt-Checklisten-Seite.", 'INFO', 'main.js');
        }
        // Menü für aktuelles Projekt einblenden und Buttons setzen
        const projectMenu = document.getElementById('current-project-menu');
        if (projectMenu) {
            projectMenu.classList.remove('hidden');
            document.getElementById('current-project-overview-link').href = `/project-overview/${window.currentProjectId}`;
            document.getElementById('current-project-editor-link').href = `/project/${window.currentProjectId}`;
            document.getElementById('current-project-checklist-link').href = `/project-checklist/${window.currentProjectId}`;
            projectMenu.querySelector('.submenu-toggle').classList.add('open');
            projectMenu.querySelector('.submenu').classList.add('open');
            window.debugLog("main.js: Projektmenü aktiviert.", 'INFO', 'main.js');
        }

        // Setze Navigationsbuttons für Projektansichten
        const goToOverviewBtn = document.getElementById('go-to-overview-btn');
        const goToEditorBtn = document.getElementById('go-to-editor-btn');
        const goToChecklistBtn = document.getElementById('go-to-checklist-btn');

        if (goToOverviewBtn) {
            goToOverviewBtn.href = `/project-overview/${window.currentProjectId}`;
        }
        if (goToEditorBtn) {
            goToEditorBtn.href = `/project/${window.currentProjectId}`;
        }
        if (goToChecklistBtn) {
            goToChecklistBtn.href = `/project-checklist/${window.currentProjectId}`;
        }

    } else if (path.startsWith('/dashboard')) {
        setupDashboardPage(); // Direkter Aufruf
        pageTitle = 'Dashboard';
        window.debugLog("main.js: Setup für Dashboard-Seite.", 'INFO', 'main.js');
    } else if (path.startsWith('/settings')) {
        pageTitle = 'Einstellungen';
        window.debugLog("main.js: Setup für Einstellungsseite.", 'INFO', 'main.js');
        // Rufen Sie setupSettingsPage auf, das seine eigene Logik hat,
        // und initialisieren Sie dann den Theme-Switcher, nachdem die Einstellungen geladen wurden.
        // setupSettingsPage ist asynchron, daher .then() verwenden.
        setupSettingsPage().then(async () => {
            // Sicherstellen, dass db und currentUser gesetzt sind, bevor getSettings aufgerufen wird
            if (window.db && window.currentUser) {
                try {
                    const userSettings = await window.db.getSettings();
                    initializeThemeSwitcher(userSettings);
                    window.debugLog("main.js: Theme-Switcher initialisiert mit Benutzereinstellungen.", 'INFO', 'main.js', userSettings);
                } catch (error) {
                    console.error("Fehler beim Laden der Benutzereinstellungen für Theme-Switcher:", error);
                    window.debugLog("main.js: Fehler beim Laden der Benutzereinstellungen für Theme-Switcher.", 'ERROR', 'main.js', error);
                }
            } else {
                window.debugLog("main.js: db oder currentUser nicht verfügbar für Theme-Switcher Initialisierung.", 'WARN', 'main.js');
            }
        });
    } else if (path.startsWith('/info')) { // Changed to startsWith to catch #anchors
        setupInfoPage(); // Direkter Aufruf
        pageTitle = 'Info & Hilfe';
        window.debugLog("main.js: Setup für Info-Seite.", 'INFO', 'main.js');
    } else if (path.startsWith('/agb')) {
        setupInfoPage(); // AGB uses info_logic for accordion, etc.
        pageTitle = 'AGB';
        window.debugLog("main.js: Setup für AGB-Seite.", 'INFO', 'main.js');
    } else if (path.startsWith('/admin')) {
        setupAdminPages(); // Direkter Aufruf
        // Admin-Seiten haben oft eigene Titel in den Templates,
        // hier könnte man spezifische Titel setzen, falls gewünscht.
        // Für den Moment bleibt der pageTitle leer oder wird vom Template bestimmt.
        const adminPageTitles = {
            '/admin': 'Admin Dashboard',
            '/admin/users': 'Benutzerverwaltung',
            '/admin/settings': 'Globale Einstellungen',
            '/admin/structure-check': 'Struktur-Check'
        };
        pageTitle = adminPageTitles[path] || 'Admin Bereich';
        window.debugLog(`main.js: Admin-Seite erkannt: ${path}`, 'INFO', 'main.js');

    } else { // Default for index page
        pageTitle = 'Willkommen';
        window.debugLog("main.js: Setup für Index-Seite.", 'INFO', 'main.js');
    }

    // Aktualisiere den Header-Titel, nachdem die seiten-spezifische Logik gelaufen ist
    // und window.currentProjectData (falls vorhanden) gesetzt wurde.
    if (window.currentProjectData && window.currentProjectData.projectName) {
        projectTitle = window.currentProjectData.projectName;
    } else if (path === '/dashboard' || path === '/') {
        projectTitle = ''; // Auf Dashboard oder Index kein Projekttitel im Header
    }
    // Direkter Aufruf der importierten Funktion
    updateHeaderTitles(projectTitle, pageTitle);
    window.debugLog(`main.js: Header-Titel aktualisiert: Seite='${pageTitle}', Projekt='${projectTitle}'`, 'INFO', 'main.js');
}