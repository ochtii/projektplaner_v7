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
    const runCheckBtn = document.getElementById('run-check-btn');
    const runGenerateBtn = document.getElementById('run-generate-btn');
    const checkLogOutput = document.getElementById('check-log-output');

    const viewStructureBtn = document.getElementById('view-structure-btn');
    const exportTxtBtn = document.getElementById('export-structure-txt-btn');
    const exportJsonBtn = document.getElementById('export-structure-json-btn');
    const structureOutput = document.getElementById('structure-output');

    let currentStructureData = null; // Speichert die geladene Struktur für den Export

    /**
     * Führt den Struktur-Check oder die Generierung über die API aus.
     * @param {string} flag Das Kommando-Flag (--check oder --generate).
     */
    const runCheck = async (flag) => {
        checkLogOutput.textContent = 'Befehl wird ausgeführt...';
        try {
            const response = await fetch('/api/admin/run-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ flag: flag })
            });
            const result = await response.json();
            checkLogOutput.textContent = result.log;
        } catch (error) {
            checkLogOutput.textContent = 'Fehler bei der Ausführung des Checks.';
            console.error("Fehler beim Ausführen des Struktur-Checks:", error);
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
        structureOutput.innerHTML = '<p>Lade Struktur...</p>';
        structureOutput.classList.remove('hidden');
        try {
            const response = await fetch('/api/admin/get-structure');
            const data = await response.json();
            currentStructureData = data; // Daten für den Export speichern

            if(data.error) {
                structureOutput.textContent = data.error;
                exportTxtBtn.classList.add('hidden');
                exportJsonBtn.classList.add('hidden');
                return;
            }

            structureOutput.textContent = formatStructureAsText(data);
            exportTxtBtn.classList.remove('hidden');
            exportJsonBtn.classList.remove('hidden');
        } catch(e) {
            structureOutput.textContent = "Fehler beim Laden der Struktur.";
            exportTxtBtn.classList.add('hidden');
            exportJsonBtn.classList.add('hidden');
            console.error("Fehler beim Anzeigen der Struktur:", e);
        }
    };

    /**
     * Lädt eine Datei mit dem gegebenen Inhalt herunter.
     * @param {string} filename Der Name der Datei.
     * @param {string} content Der Inhalt der Datei.
     * @param {string} mimeType Der MIME-Typ der Datei.
     */
    const downloadFile = (filename, content, mimeType) => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (viewStructureBtn) viewStructureBtn.addEventListener('click', viewStructure);
    if (exportTxtBtn) exportTxtBtn.addEventListener('click', () => {
        if(currentStructureData) {
            const textContent = formatStructureAsText(currentStructureData);
            downloadFile('structure.txt', textContent, 'text/plain;charset=utf-8');
        }
    });
    if (exportJsonBtn) exportJsonBtn.addEventListener('click', () => {
        if(currentStructureData) {
            const jsonContent = JSON.stringify(currentStructureData, null, 2);
            downloadFile('structure.json', jsonContent, 'application/json;charset=utf-8');
        }
    });
}
