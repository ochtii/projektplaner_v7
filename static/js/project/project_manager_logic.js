// ochtii/projektplaner_v7/projektplaner_v7-55c8a693a05caeff31bc85b526881ea8deee5951/static/js/project/project_manager_logic.js
"use strict";

// =================================================================
// PROJEKT-MANAGER LOGIK
// =================================================================
// Dieses Modul enthält die Kernlogik für die Verwaltung von Projekten,
// Phasen, Aufgaben und Unteraufgaben.

// Importiere den ChecklistRenderer direkt
import { renderChecklistTextView, renderGraphicalChecklistView } from '../ui/checklist_renderer.js';
import * as GlobalUI from '../ui/global_ui.js'; // Importiere GlobalUI für Header-Updates
import { renderProjectTree } from '../ui/project_tree_renderer.js'; // NEU: Direkter Import von renderProjectTree
// NEU: Importiere Modal-Funktionen direkt, um "window." Präfixe zu vermeiden
import { showPromptModal, showInfoModal, showConfirmationModal } from '../ui/modals.js';


/**
 * Richtet die Projektmanager-Seite ein.
 * Lädt Projektdaten und initialisiert Event-Listener.
 */
export async function setupProjectManagerPage() {
    // Greift auf window.db und window.currentProjectId zu
    const projectData = await window.db.getProject(window.currentProjectId);
    if (projectData) {
        window.currentProjectData = projectData; // Globale Referenz aktualisieren
        // Aktualisiere den Projektnamen im Haupttitel und im globalen Header
        document.getElementById('page-main-title').textContent = `Projekt: ${projectData.projectName}`;
        GlobalUI.updateHeaderTitles(projectData.projectName, 'Editor');

        // Ruft renderProjectTree direkt auf
        renderProjectTree(window.currentProjectData, document.getElementById('projectTree'));
    }

    // Event-Listener für Buttons
    document.getElementById('add-phase-btn')?.addEventListener('click', () => addNewItem('phase'));
    document.getElementById('delete-project-btn')?.addEventListener('click', deleteCurrentProject);
    document.getElementById('edit-project-name-btn')?.addEventListener('click', editProjectName);

    // Initialer Zustand für den Projekt-Editor-Hinweis
    const editorContent = document.getElementById('editor-content');
    const editorEmptyHint = document.getElementById('editor-empty-hint');
    const selectedItemNameSpan = document.getElementById('selected-item-name');
    const editorItemTitle = document.getElementById('editor-item-title');

    if (editorContent && editorEmptyHint && selectedItemNameSpan && editorItemTitle) {
        editorContent.innerHTML = ''; // Lade-Text oder alten Inhalt löschen
        editorContent.classList.add('hidden'); // Inhalt ausblenden
        editorEmptyHint.classList.remove('hidden'); // Hinweis anzeigen
        selectedItemNameSpan.textContent = '';
        editorItemTitle.style.visibility = 'hidden'; // Titel ausblenden
    }
}

/**
 * Richtet die Projekt-Checklisten-Seite ein.
 * Lädt Projektdaten und rendert die Checkliste.
 */
export async function setupProjectChecklistPage() {
    const projectData = await window.db.getProject(window.currentProjectId);
    const checklistTextViewContainer = document.getElementById('checklist-text-view-content');
    const checklistGraphicalViewContainer = document.getElementById('checklist-graphical-view-content');
    const graphicalViewSelector = document.getElementById('graphical-view-selector'); // Das Dropdown, falls es eine ähnliche in der Checkliste gibt

    if (projectData) {
        window.currentProjectData = projectData;
        // Aktualisiere den Projektnamen im Haupttitel und im globalen Header
        document.getElementById('page-main-title').textContent = `Checkliste für: ${projectData.projectName}`;
        GlobalUI.updateHeaderTitles(projectData.projectName, 'Checkliste');
        
        if (checklistTextViewContainer) { // Überprüfen, ob das Element existiert
            // Ruft renderChecklistTextView direkt über den Import auf
            renderChecklistTextView(window.currentProjectData, checklistTextViewContainer);
        } else {
            console.error("Fehler: Das Element 'checklist-text-view-content' wurde nicht gefunden.");
            // Fallback-Anzeige, falls der Container nicht gefunden wird
            const mainChecklistContainer = document.getElementById('checklist-container'); // Dies war die alte ID, falls sie noch irgendwo existiert
            if (mainChecklistContainer) {
                mainChecklistContainer.innerHTML = '<p>Fehler: Die Textansicht der Checkliste konnte nicht geladen werden (Container nicht gefunden).</p>';
            }
        }

        // Ansichts-Umschalter einrichten
        document.getElementById('checklist-text-view-btn')?.addEventListener('click', () => {
            if (checklistTextViewContainer) checklistTextViewContainer.classList.remove('hidden');
            if (checklistGraphicalViewContainer) checklistGraphicalViewContainer.classList.add('hidden');
            // Hier können Sie auch das graphicalViewSelector ausblenden, falls es in der Checklist.html existiert
            if (graphicalViewSelector) graphicalViewSelector.classList.add('hidden');
        });

        document.getElementById('checklist-graphical-view-btn')?.addEventListener('click', () => {
            if (checklistTextViewContainer) checklistTextViewContainer.classList.add('hidden');
            if (checklistGraphicalViewContainer) {
                checklistGraphicalViewContainer.classList.remove('hidden');
                // Standard-Grafikansicht rendern oder die zuletzt ausgewählte
                // HINWEIS: Es gibt kein graphical-view-selector in project_checklist.html, daher direkt 'overview_chart'
                renderGraphicalChecklistView(projectData, checklistGraphicalViewContainer, 'overview_chart');
            }
            // Hier können Sie auch das graphicalViewSelector einblenden, falls es in der Checklist.html existiert
            if (graphicalViewSelector) graphicalViewSelector.classList.remove('hidden');
        });

        // Event Listener für das Dropdown der grafischen Ansichten (falls vorhanden)
        // Dies würde nur funktionieren, wenn ein #graphical-view-selector in project_checklist.html vorhanden wäre.
        // Da es nicht der Fall ist, ist dieser Teil nicht funktional, kann aber für zukünftige Erweiterungen behalten werden.
        if (graphicalViewSelector) {
            graphicalViewSelector.addEventListener('change', (event) => {
                const selectedViewType = event.target.value;
                renderGraphicalChecklistView(projectData, checklistGraphicalViewContainer, selectedViewType);
            });
        }

    } else {
        // Korrigierte ID für die Fehlermeldung
        if (checklistTextViewContainer) {
            checklistTextViewContainer.innerHTML = '<p>Projekt konnte nicht geladen werden.</p>';
        } else {
            console.error("Fehler: Das Element 'checklist-text-view-content' wurde nicht gefunden, um den Ladefehler anzuzeigen.");
        }
    }
}

/**
 * Bearbeitet den Namen des aktuellen Projekts.
 */
export async function editProjectName() {
    if (!window.currentProjectData) return;

    // Ruft showPromptModal auf
    showPromptModal('Projektnamen bearbeiten', 'Neuer Projektname:', window.currentProjectData.projectName, async (newName) => {
        if (newName === null || newName.trim() === window.currentProjectData.projectName) {
            return; // Benutzer hat abgebrochen oder Name ist unverändert
        }
        if (!newName.trim()) {
            showInfoModal('Info', 'Projektname darf nicht leer sein.');
            return;
        }

        window.currentProjectData.projectName = newName.trim();
        const response = await window.db.saveProject(window.currentProjectId, window.currentProjectData);
        if (response.ok) {
            document.getElementById('page-main-title').textContent = `Projekt: ${window.currentProjectData.projectName}`;
            GlobalUI.updateHeaderTitles(window.currentProjectData.projectName, 'Editor'); // Aktualisiere Header
            showInfoModal('Erfolg', 'Projektname erfolgreich aktualisiert.');
        } else {
            showInfoModal('Fehler', 'Projektname konnte nicht aktualisiert werden.');
        }
    });
}

/**
 * Löscht das aktuell geladene Projekt.
 */
export async function deleteCurrentProject() {
    if (!window.currentProjectData) return;

    // Ruft showConfirmationModal auf
    showConfirmationModal('Projekt löschen', `Möchten Sie das Projekt "${window.currentProjectData.projectName}" wirklich endgültig löschen?`, async () => {
        const response = await window.db.deleteProject(window.currentProjectId);
        if (response.ok) {
            window.location.href = '/dashboard'; // Zurück zum Dashboard
        } else {
            showInfoModal('Fehler', 'Das Projekt konnte nicht gelöscht werden.');
        }
    });
}

/**
 * Fügt eine neue Phase, Aufgabe oder Unteraufgabe zum aktuellen Projekt hinzu.
 * @param {string} type 'phase', 'task' oder 'subtask'.
 * @param {string} [parentId=null] Die ID des übergeordneten Elements (phaseId für Aufgaben, taskId für Unteraufgaben).
 */
export async function addNewItem(type, parentId = null) {
    const promptTitle = `Neue ${type === 'phase' ? 'Phase' : type === 'task' ? 'Aufgabe' : 'Subaufgabe'} hinzufügen`;
    const promptMessage = `Name für neue(s/n) ${type}:`;

    // Ruft showPromptModal auf
    showPromptModal(promptTitle, promptMessage, '', async (name) => {
        if (!name || name.trim() === '') {
            if (name !== null) { // Benutzer hat nicht nur abgebrochen
                showInfoModal('Info', 'Name darf nicht leer sein.');
            }
            return;
        }

        let newItem;

        if (type === 'phase') {
            newItem = {
                phaseId: `phase_${Date.now()}`,
                phaseName: name.trim(),
                isExpanded: true,
                tasks: []
            };
            if (!window.currentProjectData.phases) {
                window.currentProjectData.phases = [];
            }
            window.currentProjectData.phases.push(newItem);
        } else if (type === 'task') {
            const phase = window.currentProjectData.phases.find(p => p.phaseId === parentId);
            if (phase) {
                newItem = {
                    taskId: `task_${Date.now()}`,
                    taskName: name.trim(),
                    isExpanded: true,
                    subtasks: [],
                    comments: []
                };
                if (!phase.tasks) {
                    phase.tasks = [];
                }
                phase.tasks.push(newItem);
            } else {
                showInfoModal('Fehler', 'Übergeordnete Phase nicht gefunden.');
                return;
            }
        } else if (type === 'subtask') {
            let task = null;
            for (const phase of window.currentProjectData.phases) {
                task = phase.tasks.find(t => t.taskId === parentId);
                if (task) break;
            }
            if (task) {
                newItem = {
                    subtaskId: `sub_${Date.now()}`,
                    subtaskName: name.trim(),
                    completed: false, // Standard für neue Unteraufgaben
                    comments: []
                };
                if (!task.subtasks) {
                    task.subtasks = [];
                }
                task.subtasks.push(newItem);
            } else {
                showInfoModal('Fehler', 'Übergeordnete Aufgabe nicht gefunden.');
                return;
            }
        }

        const response = await window.db.saveProject(window.currentProjectId, window.currentProjectData);
        if (response.ok) {
            window.renderProjectTree(window.currentProjectData, document.getElementById('projectTree'));
            showInfoModal('Erfolg', `${type} erfolgreich hinzugefügt.`);
        } else {
            showInfoModal('Fehler', `Das ${type} konnte nicht hinzugefügt werden.`);
        }
    });
}

/**
 * Speichert die Details (Name) eines Elements.
 * @param {object} item Das zu aktualisierende Element-Objekt.
 * @param {string} type Der Typ des Elements ('Phase', 'Aufgabe', 'Subaufgabe').
 * @param {string} newName Der neue Name für das Element.
 */
export async function saveItemDetails(item, type, newName) {
    let originalName;
    if (type === 'Phase') {
        originalName = item.phaseName;
        item.phaseName = newName.trim();
    } else if (type === 'Aufgabe') {
        originalName = item.taskName;
        item.taskName = newName.trim();
    } else if (type === 'Subaufgabe') {
        originalName = item.subtaskName;
        item.subtaskName = newName.trim();
    }

    const response = await window.db.saveProject(window.currentProjectId, window.currentProjectData);
    if (response.ok) {
        window.renderProjectTree(window.currentProjectData, document.getElementById('projectTree'));
        showInfoModal('Erfolg', `${type} "${originalName}" wurde in "${newName}" umbenannt.`);
        // Nach dem Speichern den Editor leeren und Hinweis anzeigen
        const editorContent = document.getElementById('editor-content');
        const editorEmptyHint = document.getElementById('editor-empty-hint');
        const selectedItemNameSpan = document.getElementById('selected-item-name');
        const editorItemTitle = document.getElementById('editor-item-title');

        editorContent.innerHTML = ''; // Inhalt leeren
        editorContent.classList.add('hidden'); // Inhalt ausblenden
        editorEmptyHint.classList.remove('hidden'); // Hinweis anzeigen
        selectedItemNameSpan.textContent = '';
        editorItemTitle.style.visibility = 'hidden'; // Titel ausblenden
        window.currentlySelectedItem = null;
        window.currentlySelectedType = null;
    } else {
        showInfoModal('Fehler', `${type} konnte nicht aktualisiert werden.`);
    }
}

// Exportiere addNewItem global, damit es von project_tree_renderer.js aufgerufen werden kann
window.addNewItem = addNewItem;