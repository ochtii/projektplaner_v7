"use strict";

// =================================================================
// FACTORY RESET LOGIK
// =================================================================
// Dieses Modul enthält die Logik für die "Werkseinstellungen"-Seite im Admin-Bereich.

import { showInfoModal, showConfirmationModal, showPromptModal } from '../ui/modals.js';

/**
 * Richtet die Werkseinstellungen-Seite ein.
 */
export function setupFactoryResetPage() {
    const runResetBtn = document.getElementById('run-factory-reset-btn');
    const logOutput = document.getElementById('reset-log-output');

    if (!runResetBtn || !logOutput) {
        console.error("Benötigte Elemente für die Reset-Seite nicht gefunden.");
        return;
    }

    runResetBtn.addEventListener('click', () => {
        // Zusätzliche Sicherheitsabfrage mit Texteingabe
        showPromptModal(
            'Bestätigung erforderlich',
            'Dies ist eine irreversible Aktion. Bitte geben Sie "RESET" ein, um fortzufahren.',
            '',
            async (confirmationText) => {
                if (confirmationText !== 'RESET') {
                    showInfoModal('Aktion abgebrochen', 'Die Eingabe war nicht korrekt. Es wurden keine Änderungen vorgenommen.');
                    return;
                }

                // Wenn die Eingabe korrekt ist, starte den Reset
                logOutput.textContent = 'Reset-Vorgang wird gestartet...';
                runResetBtn.disabled = true;
                runResetBtn.textContent = 'Wird ausgeführt...';

                try {
                    const response = await fetch('/api/admin/run-factory-reset', {
                        method: 'POST',
                    });

                    const result = await response.json();
                    
                    if (response.ok) {
                        logOutput.textContent = result.log;
                        showInfoModal(
                            'Erfolg', 
                            'Die Anwendung wurde erfolgreich auf die Werkseinstellungen zurückgesetzt. Sie werden nun zur Anmeldeseite weitergeleitet.',
                            () => {
                                window.location.href = '/logout'; // Logout leitet zum Login weiter
                            }
                        );
                    } else {
                        logOutput.textContent = `Fehler: ${result.log || 'Unbekannter Serverfehler'}`;
                        showInfoModal('Fehler', 'Der Reset-Vorgang konnte nicht abgeschlossen werden.');
                    }

                } catch (error) {
                    logOutput.textContent = `Ein kritischer Fehler ist aufgetreten: ${error}`;
                    console.error("Fehler beim Ausführen des Factory Resets:", error);
                } finally {
                    runResetBtn.disabled = false;
                    runResetBtn.textContent = 'App auf Werkseinstellungen zurücksetzen';
                }
            }
        );
    });
}
