"use strict";

// =================================================================
// PROJEKTBAUM-RENDERER UND EDITOR-DETAILS
// =================================================================
// Dieses Modul ist für das Rendern des hierarchischen Projektbaums
// und das Anzeigen/Bearbeiten von Elementdetails im Editor-Bereich zuständig.

/**
 * Zeigt die Details eines ausgewählten Elements im Editor-Bereich an.
 * @param {object} item Das Datenobjekt (Phase, Aufgabe oder Subaufgabe).
 * @param {string} type Der Typ des Elements ('Phase', 'Aufgabe', 'Subaufgabe').
 */
export function showDetailsInEditor(item, type) {
    const editorContent = document.getElementById('editor-content');
    const selectedItemNameSpan = document.getElementById('selected-item-name');
    const editorEmptyHint = document.getElementById('editor-empty-hint');

    if (!editorContent || !selectedItemNameSpan || !editorEmptyHint) return;

    // Hinweis ausblenden und Editor-Inhalt anzeigen
    editorEmptyHint.classList.add('hidden');
    editorContent.classList.remove('hidden');

    // Das aktuell ausgewählte Element global setzen (für Speichern/Verwerfen)
    window.currentlySelectedItem = item;
    window.currentlySelectedType = type;

    const itemName = item.phaseName || item.taskName || item.subtaskName;
    selectedItemNameSpan.textContent = itemName;
    document.getElementById('editor-item-title').style.visibility = 'visible'; // Titel sichtbar machen

    // Editor-Formular dynamisch erstellen
    editorContent.innerHTML = `
        <div class="form-group" style="margin-bottom: 1rem;">
            <label for="editor-item-name" style="display: block; margin-bottom: 0.5rem;">${type}-Name</label>
            <input type="text" id="editor-item-name" class="form-control" value="${itemName}" style="width: 100%; padding: 0.5rem; border-radius: var(--border-radius); border: 1px solid var(--border-color);">
        </div>
        <div class="form-group">
            <label for="editor-item-comment" style="display: block; margin-bottom: 0.5rem;">Kommentare</label>
            <div id="comments-section" style="border: 1px solid var(--border-color); padding: 1rem; border-radius: var(--border-radius); max-height: 200px; overflow-y: auto; margin-bottom: 0.5rem;">
                <!-- Kommentare werden hier dynamisch eingefügt -->
            </div>
            <textarea id="new-comment-input" class="form-control" rows="2" placeholder="Neuen Kommentar hinzufügen..." style="width: 100%; padding: 0.5rem; border-radius: var(--border-radius); border: 1px solid var(--border-color);"></textarea>
            <button class="btn btn-secondary btn-sm" id="add-comment-btn" style="margin-top: 0.5rem;">Kommentar hinzufügen</button>
        </div>
        <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
            <button class="btn btn-primary" id="save-editor-btn">Speichern</button>
            <button class="btn btn-secondary" id="discard-editor-btn">Verwerfen</button>
        </div>
    `;

    // Kommentare rendern
    window.renderCommentsSection(item);

    // Event Listener für Editor-Aktionen
    document.getElementById('save-editor-btn').addEventListener('click', () => {
        const newName = document.getElementById('editor-item-name').value;
        window.saveItemDetails(item, type, newName); // Aufruf an project_manager_logic
    });

    document.getElementById('discard-editor-btn').addEventListener('click', () => {
        // Änderungen verwerfen und Hinweis anzeigen
        editorContent.innerHTML = ''; // Inhalt leeren
        editorContent.classList.add('hidden'); // Inhalt ausblenden
        editorEmptyHint.classList.remove('hidden'); // Hinweis anzeigen
        selectedItemNameSpan.textContent = '';
        document.getElementById('editor-item-title').style.visibility = 'hidden'; // Titel ausblenden
        window.currentlySelectedItem = null;
        window.currentlySelectedType = null;
    });

    document.getElementById('add-comment-btn').addEventListener('click', () => {
        const newCommentText = document.getElementById('new-comment-input').value.trim();
        if (newCommentText) {
            window.addCommentToItem(item, newCommentText); // Aufruf an comments_manager
        }
    });
}

/**
 * Rendert den Projektbaum aus den JSON-Daten und fügt ihn in den Container ein.
 * Fügt Bearbeitungs- und Hinzufügen-Icons hinzu, sowie hierarchische Nummerierung.
 * @param {object} projectData Die Projektdaten als JSON-Objekt.
 * @param {HTMLElement} container Der UL-Container, in den der Baum eingefügt wird.
 */
export function renderProjectTree(projectData, container) {
    container.innerHTML = '';

    if (!projectData.phases || projectData.phases.length === 0) {
        container.innerHTML = '<li>Diesem Projekt wurden noch keine Phasen hinzugefügt.</li>';
        return;
    }

    projectData.phases.forEach((phase, phaseIndex) => {
        const phaseNumber = phaseIndex + 1;
        const phaseLi = document.createElement('li');
        phaseLi.innerHTML = `
            <div class="tree-item-wrapper">
                <span class="tree-item">${phaseNumber}. ${phase.phaseName}</span>
                <span class="actions">
                    <span class="edit-icon" title="Phase bearbeiten">&#9998;</span>
                    <span class="add-icon add-task-btn" title="Aufgabe hinzufügen">&#x2b;</span>
                </span>
            </div>
        `;
        phaseLi.querySelector('.tree-item').addEventListener('click', () => showDetailsInEditor(phase, 'Phase'));
        phaseLi.querySelector('.edit-icon').addEventListener('click', () => showDetailsInEditor(phase, 'Phase'));
        phaseLi.querySelector('.add-task-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            window.addNewItem('task', phase.phaseId); // Aufruf an project_manager_logic
        });

        if (phase.tasks && phase.tasks.length > 0) {
            const tasksUl = document.createElement('ul');
            phase.tasks.forEach((task, taskIndex) => {
                const taskNumber = `${phaseNumber}.${taskIndex + 1}`;
                const taskLi = document.createElement('li');
                taskLi.innerHTML = `
                    <div class="tree-item-wrapper">
                        <span class="tree-item">${taskNumber}. ${task.taskName}</span>
                        <span class="actions">
                            <span class="edit-icon" title="Aufgabe bearbeiten">&#9998;</span>
                            <span class="add-icon add-subtask-btn" title="Subaufgabe hinzufügen">&#x2b;</span>
                        </span>
                    </div>
                `;
                taskLi.querySelector('.tree-item').addEventListener('click', () => showDetailsInEditor(task, 'Aufgabe'));
                taskLi.querySelector('.edit-icon').addEventListener('click', () => showDetailsInEditor(task, 'Aufgabe'));
                taskLi.querySelector('.add-subtask-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    window.addNewItem('subtask', task.taskId); // Aufruf an project_manager_logic
                });

                if (task.subtasks && task.subtasks.length > 0) {
                    const subtasksUl = document.createElement('ul');
                    task.subtasks.forEach((subtask, subtaskIndex) => {
                        const subtaskNumber = `${taskNumber}.${subtaskIndex + 1}`;
                        const subtaskLi = document.createElement('li');
                        subtaskLi.innerHTML = `
                            <div class="tree-item-wrapper">
                                <span class="tree-item">${subtaskNumber}. ${subtask.subtaskName}</span>
                                <span class="actions">
                                    <span class="edit-icon" title="Subaufgabe bearbeiten">&#9998;</span>
                                </span>
                            </div>
                        `;
                        subtaskLi.querySelector('.tree-item').addEventListener('click', () => showDetailsInEditor(subtask, 'Subaufgabe'));
                        subtaskLi.querySelector('.edit-icon').addEventListener('click', () => showDetailsInEditor(subtask, 'Subaufgabe'));
                        subtasksUl.appendChild(subtaskLi);
                    });
                    taskLi.appendChild(subtasksUl);
                }
                tasksUl.appendChild(taskLi);
            });
            phaseLi.appendChild(tasksUl);
        }
        container.appendChild(phaseLi);
    });
}
