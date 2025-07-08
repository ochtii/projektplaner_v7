// ochtii/projektplaner_v7/projektplaner_v7-55c8a693a05caeff31bc85b526881ea8deee5951/static/js/admin/structure_check.js
"use strict";

// =================================================================
// STRUKTUR-CHECK LOGIK
// =================================================================
// Dieses Modul enthält die Logik für die Seite "Struktur-Check" im Admin-Bereich.
// Es ermöglicht das Prüfen und Generieren der Projektstruktur.

/**
 * Richtet die Struktur-Check-Seite ein.
 * Initialisiert Event-Listener für die Check- und Generierungs-Buttons.
 */
export function setupStructureCheckPage() {
    window.debugLog("Admin_StructureCheck: Setup der Struktur-Check-Seite gestartet.", 'INFO', 'Admin_StructureCheck');
    const runCheckBtn = document.getElementById('run-check-btn');
    const runGenerateBtn = document.getElementById('run-generate-btn');
    const checkLogOutput = document.getElementById('check-log-output');
    const structureDisplayContainer = document.querySelector('.structure-display-container'); // NEU: Container für Log-Feld

    const viewStructureBtn = document.getElementById('view-structure-btn');
    const exportTxtBtn = document.getElementById('export-structure-txt-btn');
    const exportJsonBtn = document.getElementById('export-structure-json-btn');
    const structureOutput = document.getElementById('structure-output');

    let currentStructureData = null; // Speichert die geladene Struktur für den Export

    // NEU: Logik zur Sichtbarkeit des Log-Felds und der Struktur-Anzeige
    // Diese Logik wird jetzt auch in main.js für die debug-console selbst ausgeführt,
    // aber hier spezifisch für die Admin-Seite.
    if (!window.globalSettings?.general_debug_mode || !window.currentUser?.isAdmin) {
        if (checkLogOutput) checkLogOutput.classList.add('hidden');
        if (runCheckBtn) runCheckBtn.classList.add('hidden');
        if (runGenerateBtn) runGenerateBtn.classList.add('hidden');
        // Den gesamten Container für das Logfeld ausblenden, wenn Debug-Modus deaktiviert
        if (structureDisplayContainer) structureDisplayContainer.classList.add('hidden');
        window.debugLog("Admin_StructureCheck: Debug-Modus ist deaktiviert oder Benutzer ist kein Admin. Log-Feld und Buttons ausgeblendet.", 'INFO', 'Admin_StructureCheck');
    } else {
        window.debugLog("Admin_StructureCheck: Debug-Modus ist aktiv. Log-Feld und Buttons sichtbar gemacht.", 'INFO', 'Admin_StructureCheck');
        if (checkLogOutput) checkLogOutput.classList.remove('hidden');
        if (runCheckBtn) runCheckBtn.classList.remove('hidden');
        if (runGenerateBtn) runGenerateBtn.classList.remove('hidden');
        if (structureDisplayContainer) structureDisplayContainer.classList.remove('hidden');
    }


    /**
     * Führt den Struktur-Check oder die Generierung über die API aus.
     * @param {string} flag Das Kommando-Flag (--check oder --generate).
     */
    const runCheck = async (flag) => {
        if (checkLogOutput) checkLogOutput.textContent = 'Befehl wird ausgeführt...';
        window.debugLog(`Admin_StructureCheck: Führe Struktur-Check aus mit Flag: ${flag}`, 'INFO', 'Admin_StructureCheck');
        try {
            const response = await fetch('/api/admin/run-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ flag: flag })
            });
            const result = await response.json();
            if (checkLogOutput) checkLogOutput.textContent = result.log;
            window.debugLog(`Admin_StructureCheck: Struktur-Check Ergebnis für ${flag}.`, 'INFO', 'Admin_StructureCheck', result.log);
        } catch (error) {
            if (checkLogOutput) checkLogOutput.textContent = 'Fehler bei der Ausführung des Checks.';
            console.error("Fehler beim Ausführen des Struktur-Checks:", error);
            window.debugLog(`Admin_StructureCheck: Fehler beim Ausführen des Struktur-Checks für ${flag}.`, 'ERROR', 'Admin_StructureCheck', error);
        }
    };

    if (runCheckBtn) runCheckBtn.addEventListener('click', () => runCheck('--check'));
    if (runGenerateBtn) runGenerateBtn.addEventListener('click', () => runCheck('--generate'));
    
    /**
     * Formatiert die Strukturdaten als lesbaren Text.
     * @param {object} node Der aktuelle Knoten in der Struktur.
     * @param {string} [indent=''] Der aktuelle Einzug.
     * @returns {string} Der formatierte Text.
     */
    const formatStructureAsText = (node, indent = '') => {
        let output = `${indent}${node.type === 'directory' ? '📁' : '📄'} ${node.path}\n`;
        if (node.children) {
            node.children.forEach(child => {
                output += formatStructureAsText(child, indent + '  ');
            });
        }
        return output;
    };

    /**
     * Lädt und zeigt die aktuelle Struktur aus `structure.json` an.
     */
    const viewStructure = async () => {
        if (structureOutput) {
            structureOutput.innerHTML = '<p>Lade Struktur...</p>';
            structureOutput.classList.remove('hidden');
        }
        window.debugLog("Admin_StructureCheck: Lade Struktur aus structure.json...", 'INFO', 'Admin_StructureCheck');
        try {
            const response = await fetch('/api/admin/get-structure');
            const data = await response.json();
            currentStructureData = data; // Daten für den Export speichern

            if(data.error) {
                if (structureOutput) structureOutput.textContent = data.error;
                if (exportTxtBtn) exportTxtBtn.classList.add('hidden');
                if (exportJsonBtn) exportJsonBtn.classList.add('hidden');
                window.debugLog("Admin_StructureCheck: Fehler beim Laden der Struktur.", 'ERROR', 'Admin_StructureCheck', data.error);
                return;
            }

            if (structureOutput) structureOutput.textContent = formatStructureAsText(data);
            if (exportTxtBtn) exportTxtBtn.classList.remove('hidden');
            if (exportJsonBtn) exportJsonBtn.classList.remove('hidden');
            window.debugLog("Admin_StructureCheck: Struktur erfolgreich geladen und angezeigt.", 'INFO', 'Admin_StructureCheck');
        } catch(e) {
            if (structureOutput) structureOutput.textContent = "Fehler beim Laden der Struktur.";
            if (exportTxtBtn) exportTxtBtn.classList.add('hidden');
            if (exportJsonBtn) exportJsonBtn.classList.add('hidden');
            console.error("Fehler beim Anzeigen der Struktur:", e);
            window.debugLog("Admin_StructureCheck: Fehler beim Anzeigen der Struktur.", 'ERROR', 'Admin_StructureCheck', e);
        }
    };

    if (viewStructureBtn) viewStructureBtn.addEventListener('click', viewStructure);
    if (exportTxtBtn) exportTxtBtn.addEventListener('click', () => {
        if(currentStructureData) {
            const textContent = formatStructureAsText(currentStructureData);
            downloadFile('structure.txt', textContent, 'text/plain;charset=utf-8');
            window.debugLog("Admin_StructureCheck: Struktur als Text exportiert.", 'INFO', 'Admin_StructureCheck');
        }
    });
    if (exportJsonBtn) exportJsonBtn.addEventListener('click', () => {
        if(currentStructureData) {
            const jsonContent = JSON.stringify(currentStructureData, null, 2);
            downloadFile('structure.json', jsonContent, 'application/json;charset=utf-8');
            window.debugLog("Admin_StructureCheck: Struktur als JSON exportiert.", 'INFO', 'Admin_StructureCheck');
        }
    });

    // NEU: Initial die Struktur anzeigen, wenn Debug-Modus aktiv ist
    if (window.globalSettings?.general_debug_mode && window.currentUser?.isAdmin) {
        viewStructure();
    }
    window.debugLog("Admin_StructureCheck: Setup der Struktur-Check-Seite abgeschlossen.", 'INFO', 'Admin_StructureCheck');
}