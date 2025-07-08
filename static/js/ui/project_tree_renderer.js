// ochtii/projektplaner_v7/projektplaner_v7-55c8a693a05caeff31bc85b526881ea8deee5951/static/js/ui/project_tree_renderer.js
"use strict";

// =================================================================
// PROJEKTBAUM-RENDERER UND EDITOR-DETAILS
// =================================================================
// Dieses Modul ist für das Rendern des hierarchischen Projektbaums
// und das Anzeigen/Bearbeiten von Elementdetails im Editor-Bereich zuständig.

// Importiere benötigte Funktionen direkt aus ihren Modulen
import { renderCommentsSection, addCommentToItem } from './comments_manager.js';
import { saveItemDetails } from '../project/project_manager_logic.js';

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
                </div>
            <textarea id="new-comment-input" class="form-control" rows="2" placeholder="Neuen Kommentar hinzufügen..." style="width: 100%; padding: 0.5rem; border-radius: var(--border-radius); border: 1px solid var(--border-color);"></textarea>
            <button class="btn btn-secondary btn-sm" id="add-comment-btn" style="margin-top: 0.5rem;">Kommentar hinzufügen</button>
        </div>
        <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
            <button class="btn btn-primary" id="save-editor-btn">Speichern</button>
            <button class="btn btn-secondary" id="discard-editor-btn">Verwerfen</button>
        </div>
    `;

    // Kommentare rendern (direkter Aufruf der importierten Funktion)
    renderCommentsSection(item);

    // Event Listener für Editor-Aktionen
    document.getElementById('save-editor-btn').addEventListener('click', () => {
        const newName = document.getElementById('editor-item-name').value;
        saveItemDetails(item, type, newName); // Direkter Aufruf der importierten Funktion
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
            addCommentToItem(item, newCommentText); // Direkter Aufruf der importierten Funktion
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

    // Temporäre Variablen für Drag-and-Drop
    let draggedItem = null;
    let draggedItemData = null; // Speichert die Daten des gezogenen Elements
    let draggedItemOriginalParentArray = null; // Referenz auf das ursprüngliche Array (phases, tasks, subtasks)
    let draggedItemOriginalIndex = -1;
    let dropTargetElement = null; // Das HTML-Element, über dem sich das gezogene Element befindet

    const handleDragStart = (e) => {
        draggedItem = e.target.closest('li');
        if (!draggedItem) return;

        // Speichere den ursprünglichen Index und das übergeordnete Element
        const parentUl = draggedItem.parentNode;
        // draggedItemOriginalParent = parentUl; // Nicht mehr benötigt, da wir das Array direkt speichern
        draggedItemOriginalIndex = Array.from(parentUl.children).indexOf(draggedItem);

        // Bestimme den Typ und die ID des gezogenen Elements
        const itemId = draggedItem.dataset.itemId;
        const itemType = draggedItem.dataset.itemType;

        // Finde die Daten des gezogenen Elements und sein ursprüngliches Array
        if (itemType === 'phase') {
            draggedItemOriginalParentArray = window.currentProjectData.phases;
            draggedItemData = window.currentProjectData.phases.find(p => p.phaseId === itemId);
        } else if (itemType === 'task') {
            const phaseId = draggedItem.closest('.phase-item')?.dataset.itemId;
            const parentPhase = window.currentProjectData.phases.find(p => p.phaseId === phaseId);
            if (parentPhase) {
                draggedItemOriginalParentArray = parentPhase.tasks;
                draggedItemData = parentPhase.tasks.find(t => t.taskId === itemId);
            }
        } else if (itemType === 'subtask') {
            const taskId = draggedItem.closest('.task-item')?.dataset.itemId;
            let parentTask = null;
            for (const phase of window.currentProjectData.phases) {
                task = phase.tasks.find(t => t.taskId === taskId);
                if (parentTask) break;
            }
            if (parentTask) {
                draggedItemOriginalParentArray = parentTask.subtasks;
                draggedItemData = parentTask.subtasks.find(s => s.subtaskId === itemId);
            }
        }

        if (!draggedItemData || !draggedItemOriginalParentArray) {
            resetDragState();
            return;
        }


        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', itemId); // ID des gezogenen Elements
        
        // Füge eine Klasse für visuelles Feedback hinzu
        setTimeout(() => draggedItem.classList.add('dragging'), 0);
    };

    const handleDragOver = (e) => {
        e.preventDefault(); // Ermöglicht das Ablegen
        e.dataTransfer.dropEffect = 'move';

        const targetLi = e.target.closest('li');
        if (!targetLi || targetLi === draggedItem) {
            if (dropTargetElement) {
                dropTargetElement.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-center');
                dropTargetElement = null;
            }
            return;
        }

        // Entferne alte Klassen vom vorherigen dropTargetElement
        if (dropTargetElement && dropTargetElement !== targetLi) {
            dropTargetElement.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-center');
        }
        dropTargetElement = targetLi; // Setze das neue dropTargetElement

        const rect = targetLi.getBoundingClientRect();
        const mouseY = e.clientY;

        // Bestimme, ob über dem oberen, mittleren oder unteren Drittel
        const topThird = rect.top + rect.height / 3;
        const bottomThird = rect.bottom - rect.height / 3;

        // Entferne alle Drag-Over-Klassen, bevor neue hinzugefügt werden
        targetLi.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-center');

        // Nur innerhalb derselben Hierarchieebene verschieben
        if (draggedItem && draggedItem.parentNode === targetLi.parentNode) {
            if (mouseY < topThird) {
                targetLi.classList.add('drag-over-top');
            } else if (mouseY > bottomThird) {
                targetLi.classList.add('drag-over-bottom');
            } else {
                // Für das Verschieben innerhalb derselben Ebene ist 'center' nicht relevant
                // Es wird nur 'top' oder 'bottom' verwendet, um die Reihenfolge zu bestimmen.
            }
        } else {
            // Wenn Eltern nicht übereinstimmen, keine Drop-Zone anzeigen
            dropTargetElement.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-center');
            dropTargetElement = null;
        }
    };

    const handleDragLeave = (e) => {
        const currentTarget = e.currentTarget; // Das Element, das den Event-Listener hat (ul oder li)
        const relatedTarget = e.relatedTarget; // Das Element, über das der Mauszeiger verlässt

        // Überprüfe, ob der Mauszeiger den gesamten Bereich des aktuellen Ziels verlassen hat
        if (dropTargetElement && !currentTarget.contains(relatedTarget)) {
            dropTargetElement.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-center');
            dropTargetElement = null;
        }
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        if (!draggedItem || !dropTargetElement) {
            resetDragState();
            return;
        }

        // Entferne alle Drag-Over-Klassen vom dropTargetElement
        dropTargetElement.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-center');

        const targetLi = dropTargetElement;
        const targetParentUl = targetLi.parentNode; // Übergeordnetes UL des Ziels

        // Überprüfe, ob das gezogene Element und das Ziel auf derselben Ebene sind
        if (draggedItem.parentNode !== targetParentUl) {
            window.showInfoModal('Verschieben nicht erlaubt', 'Elemente können nur innerhalb ihrer eigenen Ebene verschoben werden.');
            resetDragState();
            return;
        }

        // Führe die DOM-Manipulation aus
        if (targetLi.classList.contains('drag-over-top')) {
            targetParentUl.insertBefore(draggedItem, targetLi);
        } else if (targetLi.classList.contains('drag-over-bottom')) {
            targetParentUl.insertBefore(draggedItem, targetLi.nextSibling);
        } else {
            // Dies sollte hier nicht erreicht werden, da wir nur top/bottom für Reordering nutzen
            resetDragState();
            return;
        }

        // Aktualisiere die Datenstruktur im globalen currentProjectData
        if (draggedItemOriginalParentArray && draggedItemData) {
            // Element aus dem ursprünglichen Array entfernen
            draggedItemOriginalParentArray.splice(draggedItemOriginalIndex, 1);
            
            // Element an der neuen Position einfügen
            // Finde den neuen Index im DOM, um ihn für die Datenstruktur zu verwenden
            const currentChildren = Array.from(targetParentUl.children);
            const newDomIndex = currentChildren.indexOf(draggedItem);

            draggedItemOriginalParentArray.splice(newDomIndex, 0, draggedItemData);

            // Speichere die aktualisierten Projektdaten
            const response = await window.db.saveProject(window.currentProjectId, window.currentProjectData);
            if (response.ok) {
                window.showInfoModal('Erfolg', 'Element erfolgreich verschoben.');
                // Baum neu rendern, um Nummerierung zu aktualisieren und Zustand zu synchronisieren
                renderProjectTree(window.currentProjectData, document.getElementById('projectTree'));
            } else {
                window.showInfoModal('Fehler', 'Element konnte nicht verschoben werden.');
                // Bei Fehler: Ursprünglichen Zustand wiederherstellen
                // Da wir die Datenstruktur bereits manipuliert haben, ist der einfachste Weg, den Baum neu zu rendern
                // mit den *ursprünglichen* Daten, wenn ein Fehler auftritt (oder eine Kopie der Daten vor dem Verschieben speichern).
                // Für diese Implementierung rendern wir einfach den aktuellen (fehlerhaften) Zustand und informieren den Benutzer.
                renderProjectTree(window.currentProjectData, document.getElementById('projectTree'));
            }
        }
        resetDragState();
    };

    const handleDragEnd = () => {
        if (draggedItem) {
            draggedItem.classList.remove('dragging');
        }
        // Sicherstellen, dass alle drag-over Klassen entfernt werden
        document.querySelectorAll('.drag-over-top, .drag-over-bottom, .drag-over-center').forEach(el => {
            el.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-center');
        });
        resetDragState();
    };

    const resetDragState = () => {
        draggedItem = null;
        draggedItemData = null;
        draggedItemOriginalParentArray = null;
        draggedItemOriginalIndex = -1;
        dropTargetElement = null;
    };


    projectData.phases.forEach((phase, phaseIndex) => {
        const phaseNumber = phaseIndex + 1;
        const phaseLi = document.createElement('li');
        phaseLi.className = 'checklist-item phase-item';
        phaseLi.setAttribute('draggable', true); // Mach Phasen ziehbar
        phaseLi.dataset.itemId = phase.phaseId;
        phaseLi.dataset.itemType = 'phase';

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
        phaseLi.querySelector('.edit-icon').addEventListener('click', (e) => {
            e.stopPropagation(); // Verhindert, dass der Drag-Start ausgelöst wird
            showDetailsInEditor(phase, 'Phase');
        });
        phaseLi.querySelector('.add-task-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            window.addNewItem('task', phase.phaseId); // Aufruf an project_manager_logic
        });

        // Drag-and-Drop Event Listener für Phasen
        phaseLi.addEventListener('dragstart', handleDragStart);
        phaseLi.addEventListener('dragover', handleDragOver);
        phaseLi.addEventListener('dragleave', handleDragLeave);
        phaseLi.addEventListener('drop', handleDrop);
        phaseLi.addEventListener('dragend', handleDragEnd);


        if (phase.tasks && phase.tasks.length > 0) {
            const tasksUl = document.createElement('ul');
            tasksUl.className = 'checklist-tasks'; // Klasse für Styling
            // Event Listener für das UL-Element, damit man auch zwischen Elementen droppen kann
            tasksUl.addEventListener('dragover', handleDragOver);
            tasksUl.addEventListener('dragleave', handleDragLeave);
            tasksUl.addEventListener('drop', handleDrop);
            tasksUl.addEventListener('dragend', handleDragEnd); // Wichtig für Cleanup


            phase.tasks.forEach((task, taskIndex) => {
                const taskNumber = `${phaseNumber}.${taskIndex + 1}`;
                const taskLi = document.createElement('li');
                taskLi.className = 'checklist-item task-item';
                taskLi.setAttribute('draggable', true); // Mach Tasks ziehbar
                taskLi.dataset.itemId = task.taskId;
                taskLi.dataset.itemType = 'task';

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
                taskLi.querySelector('.edit-icon').addEventListener('click', (e) => {
                    e.stopPropagation();
                    showDetailsInEditor(task, 'Aufgabe');
                });
                taskLi.querySelector('.add-subtask-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    window.addNewItem('subtask', task.taskId); // Aufruf an project_manager_logic
                });

                // Drag-and-Drop Event Listener für Tasks
                taskLi.addEventListener('dragstart', handleDragStart);
                taskLi.addEventListener('dragover', handleDragOver);
                taskLi.addEventListener('dragleave', handleDragLeave);
                taskLi.addEventListener('drop', handleDrop);
                taskLi.addEventListener('dragend', handleDragEnd);

                if (task.subtasks && task.subtasks.length > 0) {
                    const subtasksUl = document.createElement('ul');
                    subtasksUl.className = 'checklist-subtasks'; // Klasse für Styling
                    // Event Listener für das UL-Element
                    subtasksUl.addEventListener('dragover', handleDragOver);
                    subtasksUl.addEventListener('dragleave', handleDragLeave);
                    subtasksUl.addEventListener('drop', handleDrop);
                    subtasksUl.addEventListener('dragend', handleDragEnd); // Wichtig für Cleanup

                    task.subtasks.forEach((subtask, subtaskIndex) => {
                        const subtaskNumber = `${taskNumber}.${subtaskIndex + 1}`;
                        const subtaskLi = document.createElement('li');
                        subtaskLi.className = 'checklist-item subtask-item';
                        subtaskLi.setAttribute('draggable', true); // Mach Subtasks ziehbar
                        subtaskLi.dataset.itemId = subtask.subtaskId;
                        subtaskLi.dataset.itemType = 'subtask';

                        subtaskLi.innerHTML = `
                            <div class="tree-item-wrapper">
                                <span class="tree-item">${subtaskNumber}. ${subtask.subtaskName}</span>
                                <span class="actions">
                                    <span class="edit-icon" title="Subaufgabe bearbeiten">&#9998;</span>
                                </span>
                            </div>
                        `;
                        subtaskLi.querySelector('.tree-item').addEventListener('click', () => showDetailsInEditor(subtask, 'Subaufgabe'));
                        subtaskLi.querySelector('.edit-icon').addEventListener('click', (e) => {
                            e.stopPropagation();
                            showDetailsInEditor(subtask, 'Subaufgabe');
                        });

                        // Drag-and-Drop Event Listener für Subtasks
                        subtaskLi.addEventListener('dragstart', handleDragStart);
                        subtaskLi.addEventListener('dragover', handleDragOver);
                        subtaskLi.addEventListener('dragleave', handleDragLeave);
                        subtaskLi.addEventListener('drop', handleDrop);
                        subtaskLi.addEventListener('dragend', handleDragEnd);

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

    // Event Listener für den gesamten Baum, um dragend zu fangen, falls außerhalb abgelegt
    container.addEventListener('dragend', handleDragEnd);
}

// Exportiere renderProjectTree global, damit es von main.js aufgerufen werden kann
window.renderProjectTree = renderProjectTree;