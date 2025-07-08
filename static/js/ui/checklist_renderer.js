// ochtii/projektplaner_v7/projektplaner_v7-55c8a693a05caeff31bc85b526881ea8deee5951/static/js/ui/checklist_renderer.js
"use strict";

// =================================================================
// CHECKLISTEN-RENDERER
// =================================================================
// Dieses Modul ist für das Rendern der hierarchischen Checklistenansicht
// und die Verwaltung des "done"-Status von Aufgaben zuständig.

// Lokaler Zustand für die Sichtbarkeit von Kommentaren und Farbmodus
let showCommentsInChecklist = localStorage.getItem('showCommentsInChecklist') === 'true';
let showColorMode = localStorage.getItem('showColorMode') === 'true'; // NEU: Zustand für Farbmodus
// NEU: Zustand für die Anzeige aller Kommentare
let showAllComments = localStorage.getItem('showAllComments') === 'true';

// NEU: Importiere Modal-Funktionen direkt
import { showInfoModal } from './modals.js'; // showInfoModal hinzugefügt

/**
 * Rendert die Checkliste als hierarchische Textansicht mit Nummerierung und Checkboxen.
 * @param {object} projectData Die Projektdaten.
 * @param {HTMLElement} container Der HTML-Container, in den die Checkliste eingefügt wird.
 */
export function renderChecklistTextView(projectData, container) {
    // Fügen Sie hier eine Überprüfung hinzu, ob der Container existiert
    if (!container) {
        console.error("Fehler: Der Container für die Checkliste wurde nicht gefunden.");
        return;
    }
    container.innerHTML = ''; // Vorherigen Inhalt leeren

    // NEU: Füge Klasse für Farbmodus zum Container hinzu
    container.classList.toggle('color-mode-active', showColorMode);


    if (!projectData.phases || projectData.phases.length === 0) {
        container.innerHTML = '<p>Dieses Projekt enthält keine Phasen für die Checkliste.</p>';
        return;
    }

    // Fortschrittsbalken und Beschriftung in separaten Container verschoben,
    // dieser wird nun in project_checklist.html direkt platziert.
    // Hier wird nur der Inhalt des Fortschrittsbalken-Containers aktualisiert.
    const progressSectionContainer = document.getElementById('checklist-progress-section');
    if (progressSectionContainer) {
        // Überprüfen, ob der Fortschrittsbalken bereits im DOM existiert
        if (!progressSectionContainer.querySelector('#checklist-progress-bar')) {
            // Berechne Details für die Anzeige im erweiterten Bereich
            let totalPhases = projectData.phases.length;
            let totalTasks = 0;
            let totalSubtasks = 0;
            let totalComments = 0;
            let phasesDetailsHtml = '';

            projectData.phases.forEach((phase, phaseIndex) => {
                const phaseNumber = phaseIndex + 1;
                let phaseTasksCount = 0;
                let phaseSubtasksCount = 0;
                let phaseCommentsCount = 0;
                let phaseCompletedItems = 0;
                let phaseTotalCheckableItems = 0;

                phase.tasks.forEach(task => {
                    phaseTasksCount++;
                    if (task.comments) phaseCommentsCount += task.comments.length;

                    if (task.subtasks && task.subtasks.length > 0) {
                        task.subtasks.forEach(subtask => {
                            phaseSubtasksCount++;
                            if (subtask.comments) phaseCommentsCount += subtask.comments.length;
                            phaseTotalCheckableItems++;
                            if (subtask.completed) {
                                phaseCompletedItems++;
                            }
                        });
                    } else {
                        phaseTotalCheckableItems++;
                        if (task.completed) {
                            phaseCompletedItems++;
                        }
                    }
                });

                if (phase.comments) phaseCommentsCount += phase.comments.length;

                totalTasks += phaseTasksCount;
                totalSubtasks += phaseSubtasksCount;
                totalComments += phaseCommentsCount;

                const phaseProgress = phaseTotalCheckableItems > 0 ? Math.round((phaseCompletedItems / phaseTotalCheckableItems) * 100) : 0;

                phasesDetailsHtml += `
                    <div style="margin-bottom: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px dashed var(--border-color);">
                        <strong>${phaseNumber}. ${phase.phaseName}:</strong> ${phaseProgress}% abgeschlossen<br>
                        <small>Aufgaben: ${phaseTasksCount}, Unteraufgaben: ${phaseSubtasksCount}, Kommentare: ${phaseCommentsCount}</small>
                        </div>
                `;
            });
            const overallProgress = calculateOverallProgress();


            progressSectionContainer.innerHTML = `
                <div class="progress-label">
                    <span>Projektfortschritt</span>
                    <span class="progress-info-icon" title="Details anzeigen/ausblenden">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                    </span>
                </div>
                <div class="checklist-progress-container">
                    <div id="checklist-progress-bar" style="width: 0%;">
                        <span id="checklist-progress-percentage">0%</span>
                    </div>
                </div>
                <div id="project-details-expanded" class="project-details-expanded hidden">
                    <div style="font-size: 1rem;">
                        <p><strong>Projektname:</strong> ${projectData.projectName}</p>
                        <p><strong>Gesamtfortschritt:</strong> ${overallProgress}%</p>
                        <p><strong>Anzahl Phasen:</strong> ${totalPhases}</p>
                        <p><strong>Anzahl Aufgaben:</strong> ${totalTasks}</p>
                        <p><strong>Anzahl Unteraufgaben:</strong> ${totalSubtasks}</p>
                        <p><strong>Anzahl Kommentare:</strong> ${totalComments}</p>
                        <h4 style="margin-top: 1.5rem; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">Fortschritt pro Phase:</h4>
                        ${phasesDetailsHtml || '<p>Keine Phasen vorhanden.</p>'}
                    </div>
                </div>
            `;
            // Event Listener für das Info-Symbol
            const infoIcon = progressSectionContainer.querySelector('.progress-info-icon');
            const projectDetailsExpanded = document.getElementById('project-details-expanded');

            if (infoIcon && projectDetailsExpanded) {
                infoIcon.addEventListener('click', () => {
                    projectDetailsExpanded.classList.toggle('hidden');
                    // Stellt sicher, dass die max-height korrekt gesetzt wird für die Transition
                    if (!projectDetailsExpanded.classList.contains('hidden')) {
                        projectDetailsExpanded.style.maxHeight = projectDetailsExpanded.scrollHeight + "px";
                    } else {
                        projectDetailsExpanded.style.maxHeight = null;
                    }
                });
            }
        }
    }


    const ul = document.createElement('ul');
    ul.className = 'checklist-list';

    projectData.phases.forEach((phase, phaseIndex) => {
        const phaseNumber = phaseIndex + 1;
        const phaseLi = document.createElement('li');
        phaseLi.className = 'checklist-item phase-item phase-color'; // NEU: Farbmodus-Klasse

        // Bestimme den Status der Phase
        const isPhaseDone = calculatePhaseCompletion(phase);
        phase.completed = isPhaseDone; // Aktualisiere den Status im Datenmodell

        phaseLi.innerHTML = `
            <div class="item-header">
                <input type="checkbox" class="checklist-checkbox phase-checkbox" id="chk-phase-${phase.phaseId}" ${isPhaseDone ? 'checked' : ''} ${phase.tasks && phase.tasks.length > 0 ? 'disabled' : ''}>
                <label for="chk-phase-${phase.phaseId}"><strong>${phaseNumber}. ${phase.phaseName}</strong></label>
            </div>
            ${showCommentsInChecklist && phase.comments && phase.comments.length > 0 ? renderCommentsForChecklistItem(phase.comments, phase.phaseName, showAllComments) : ''}
        `;
        const phaseCheckbox = phaseLi.querySelector(`#chk-phase-${phase.phaseId}`);
        if (phaseCheckbox && !phaseCheckbox.disabled) {
            phaseCheckbox.addEventListener('change', (e) => {
                phase.completed = e.target.checked;
                saveProjectAndRerender();
            });
        }


        if (phase.tasks && phase.tasks.length > 0) {
            const tasksUl = document.createElement('ul');
            tasksUl.className = 'checklist-tasks';
            phase.tasks.forEach((task, taskIndex) => {
                const taskNumber = `${phaseNumber}.${taskIndex + 1}`;
                const taskLi = document.createElement('li');
                taskLi.className = 'checklist-item task-item task-color'; // NEU: Farbmodus-Klasse

                // Bestimme den Status der Aufgabe
                const isTaskDone = calculateTaskCompletion(task);
                task.completed = isTaskDone; // Aktualisiere den Status im Datenmodell

                taskLi.innerHTML = `
                    <div class="item-header">
                        <input type="checkbox" class="checklist-checkbox task-checkbox" id="chk-task-${task.taskId}" ${isTaskDone ? 'checked' : ''} ${task.subtasks && task.subtasks.length > 0 ? 'disabled' : ''}>
                        <label for="chk-task-${task.taskId}">${taskNumber}. ${task.taskName}</label>
                    </div>
                    ${showCommentsInChecklist && task.comments && task.comments.length > 0 ? renderCommentsForChecklistItem(task.comments, task.taskName, showAllComments) : ''}
                `;
                const taskCheckbox = taskLi.querySelector(`#chk-task-${task.taskId}`);
                if (taskCheckbox && !taskCheckbox.disabled) {
                    taskCheckbox.addEventListener('change', (e) => {
                        task.completed = e.target.checked;
                        saveProjectAndRerender();
                    });
                }

                if (task.subtasks && task.subtasks.length > 0) {
                    const subtasksUl = document.createElement('ul');
                    subtasksUl.className = 'checklist-subtasks';
                    task.subtasks.forEach((subtask, subtaskIndex) => {
                        const subtaskNumber = `${taskNumber}.${subtaskIndex + 1}`;
                        const subtaskLi = document.createElement('li');
                        subtaskLi.className = 'checklist-item subtask-item subtask-color'; // NEU: Farbmodus-Klasse

                        subtaskLi.innerHTML = `
                            <div class="item-header">
                                <input type="checkbox" class="checklist-checkbox subtask-checkbox" id="chk-subtask-${subtask.subtaskId}" ${subtask.completed ? 'checked' : ''}>
                                <label for="chk-subtask-${subtask.subtaskId}">${subtaskNumber}. ${subtask.subtaskName}</label>
                            </div>
                            ${showCommentsInChecklist && subtask.comments && subtask.comments.length > 0 ? renderCommentsForChecklistItem(subtask.comments, subtask.subtaskName, showAllComments) : ''}
                        `;
                        const subtaskCheckbox = subtaskLi.querySelector(`#chk-subtask-${subtask.subtaskId}`);
                        subtaskCheckbox.addEventListener('change', (e) => {
                            subtask.completed = e.target.checked;
                            saveProjectAndRerender();
                        });
                        subtasksUl.appendChild(subtaskLi);
                    });
                    taskLi.appendChild(subtasksUl);
                }
                tasksUl.appendChild(taskLi);
            });
            phaseLi.appendChild(tasksUl);
        }
        ul.appendChild(phaseLi);
    });
    container.appendChild(ul);

    // Fortschrittsbalken nach dem Rendern aktualisieren
    updateProgressBar();

    // Initialisiere die Schalter für Kommentare und Farbmodus sowie das Einstellungsfeld
    initializeChecklistSettings();
}

/**
 * Rendert Kommentare für ein Checklisten-Element in einem kleineren Format.
 * Fügt einen Event-Listener anstelle eines Inline-onclick-Attributs hinzu.
 * @param {Array} comments Die Liste der Kommentarobjekte.
 * @param {string} itemName Der Name des Elements, zu dem die Kommentare gehören.
 * @param {boolean} showAll True, um alle Kommentare anzuzeigen, False für nur den neuesten.
 * @returns {string} HTML-String der Kommentare.
 */
function renderCommentsForChecklistItem(comments, itemName, showAll) {
    if (!comments || comments.length === 0) return '';
    
    let commentsHtml = '';
    if (showAll) {
        comments.forEach(comment => {
            const date = new Date(parseInt(comment.timestamp)).toLocaleDateString();
            commentsHtml += `
                <small><strong>${comment.author || 'Unbekannt'}:</strong> ${comment.text} <span style="opacity: 0.7;">(${date})</span></small><br>
            `;
        });
    } else {
        const latestComment = comments[comments.length - 1]; // Neuesten Kommentar nehmen
        const commentText = latestComment.text.length > 100 ? latestComment.text.substring(0, 97) + '...' : latestComment.text; // Kürzen
        const date = new Date(parseInt(latestComment.timestamp)).toLocaleDateString();
        commentsHtml = `
            <small><strong>Kommentar:</strong> ${commentText} <span style="opacity: 0.7;">(${date})</span></small>
        `;
    }

    // Erstelle ein div-Element für die Vorschau
    const commentPreviewDiv = document.createElement('div');
    commentPreviewDiv.className = 'checklist-comment-preview';
    commentPreviewDiv.innerHTML = `
        ${commentsHtml}
        <span class="comment-icon" title="Alle Kommentare anzeigen">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
        </span>
    `;

    // Füge den Event-Listener programmatisch hinzu
    const commentIcon = commentPreviewDiv.querySelector('.comment-icon');
    if (commentIcon) {
        commentIcon.addEventListener('click', (e) => {
            // Verhindere, dass das Klicken auf das Symbol das übergeordnete Element auslöst (z.B. Checkbox)
            e.stopPropagation();
            window.showCommentsDetailModal(comments, itemName); // Angepasst
        });
    }

    return commentPreviewDiv.outerHTML; // Gib das HTML des erstellten Elements zurück
}


/**
 * Berechnet den Abschlussstatus einer Phase.
 * Eine Phase ist abgeschlossen, wenn alle ihre Aufgaben (oder Unteraufgaben, falls vorhanden) abgeschlossen sind.
 * Wenn eine Aufgabe Unteraufgaben hat, wird ihr eigener "completed"-Status ignoriert und nur der der Unteraufgaben zählt.
 * Wenn eine Aufgabe keine Unteraufgaben hat, zählt ihr eigener "completed"-Status.
 * @param {object} phase Die Phasenobjekt.
 * @returns {boolean} True, wenn die Phase abgeschlossen ist, sonst False.
 */
function calculatePhaseCompletion(phase) {
    if (!phase.tasks || phase.tasks.length === 0) {
        return phase.completed || false; // Wenn keine Aufgaben, hängt es vom eigenen Status ab
    }
    return phase.tasks.every(task => calculateTaskCompletion(task));
}

/**
 * Berechnet den Abschlussstatus einer Aufgabe.
 * Eine Aufgabe ist abgeschlossen, wenn alle ihre Unteraufgaben abgeschlossen sind.
 * Wenn keine Unteraufgaben vorhanden sind, hängt es vom eigenen "completed"-Status ab.
 * @param {object} task Das Aufgabenobjekt.
 * @returns {boolean} True, wenn die Aufgabe abgeschlossen ist, sonst False.
 */
function calculateTaskCompletion(task) {
    if (!task.subtasks || task.subtasks.length === 0) {
        return task.completed || false; // Wenn keine Unteraufgaben, hängt es vom eigenen Status ab
    }
    return task.subtasks.every(subtask => subtask.completed);
}

/**
 * Berechnet den Gesamtfortschritt des Projekts.
 * @returns {number} Der Gesamtfortschritt in Prozent.
 */
function calculateOverallProgress() {
    let totalItems = 0;
    let completedItems = 0;

    window.currentProjectData.phases.forEach(phase => {
        if (phase.tasks && phase.tasks.length > 0) {
            phase.tasks.forEach(task => {
                if (task.subtasks && task.subtasks.length > 0) {
                    totalItems += task.subtasks.length;
                    completedItems += task.subtasks.filter(subtask => subtask.completed).length;
                } else {
                    totalItems++;
                    if (task.completed) {
                        completedItems++;
                    }
                }
            });
        } else {
            totalItems++;
            if (phase.completed) {
                completedItems++;
            }
        }
    });

    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
}

/**
 * Aktualisiert den Fortschrittsbalken basierend auf dem aktuellen Projektstatus.
 */
function updateProgressBar() {
    const progressBar = document.getElementById('checklist-progress-bar');
    const progressPercentage = document.getElementById('checklist-progress-percentage');

    if (progressBar && progressPercentage) {
        const percentage = calculateOverallProgress();
        progressBar.style.width = `${percentage}%`;
        progressPercentage.textContent = `${percentage}%`;

        // Ändere die Textfarbe, wenn der Hintergrund zu dunkel ist
        if (percentage > 50) { // Beispielwert, kann angepasst werden
            progressPercentage.style.color = 'white';
        } else {
            progressPercentage.style.color = 'var(--text-color)'; // Oder eine andere passende Farbe
        }
    }
}

/**
 * Initialisiert die Schalter und das Einstellungsfeld der Checkliste.
 */
function initializeChecklistSettings() {
    const toggleCommentsSwitch = document.getElementById('toggle-comments');
    const toggleColorModeSwitch = document.getElementById('toggle-color-mode');
    const toggleAllCommentsSwitch = document.getElementById('toggle-all-comments'); // NEU
    const dependentCommentSetting = document.querySelector('.setting-item.dependent[data-depends-on="toggle-comments"]'); // NEU
    
    const settingsPanel = document.getElementById('checklist-settings-panel');
    const toggleSettingsBtn = document.getElementById('toggle-checklist-settings-btn');
    const checklistContainer = document.getElementById('checklist-text-view-content');


    // Kommentare-Schalter
    if (toggleCommentsSwitch && !toggleCommentsSwitch.dataset.listenerAdded) {
        toggleCommentsSwitch.checked = showCommentsInChecklist;
        toggleCommentsSwitch.onchange = () => {
            showCommentsInChecklist = toggleCommentsSwitch.checked;
            localStorage.setItem('showCommentsInChecklist', showCommentsInChecklist);
            
            // NEU: Abhängige Einstellung aktualisieren
            if (dependentCommentSetting) {
                dependentCommentSetting.classList.toggle('hidden', !showCommentsInChecklist);
                // Wenn Kommentare deaktiviert werden, auch die Detailansicht deaktivieren
                if (!showCommentsInChecklist && toggleAllCommentsSwitch) {
                    showAllComments = false;
                    localStorage.setItem('showAllComments', 'false');
                    toggleAllCommentsSwitch.checked = false;
                }
            }
            renderChecklistTextView(window.currentProjectData, checklistContainer);
        };
        toggleCommentsSwitch.dataset.listenerAdded = 'true';
    }

    // NEU: Alle Kommentare anzeigen Schalter
    if (toggleAllCommentsSwitch && !toggleAllCommentsSwitch.dataset.listenerAdded) {
        toggleAllCommentsSwitch.checked = showAllComments;
        toggleAllCommentsSwitch.onchange = () => {
            showAllComments = toggleAllCommentsSwitch.checked;
            localStorage.setItem('showAllComments', showAllComments);
            renderChecklistTextView(window.currentProjectData, checklistContainer);
        };
        toggleAllCommentsSwitch.dataset.listenerAdded = 'true';
    }

    // NEU: Anfangszustand der abhängigen Einstellung
    if (dependentCommentSetting && toggleCommentsSwitch) {
        dependentCommentSetting.classList.toggle('hidden', !toggleCommentsSwitch.checked);
    }


    // Farbmodus-Schalter
    if (toggleColorModeSwitch && !toggleColorModeSwitch.dataset.listenerAdded) {
        toggleColorModeSwitch.checked = showColorMode;
        toggleColorModeSwitch.onchange = () => {
            showColorMode = toggleColorModeSwitch.checked;
            localStorage.setItem('showColorMode', showColorMode);
            // Klasse direkt am Container umschalten
            if (checklistContainer) {
                checklistContainer.classList.toggle('color-mode-active', showColorMode);
            }
            // Neu rendern, um die Farben direkt anzuwenden (oder nur Klasse umschalten)
            // Ein Neu-Rendern ist nicht unbedingt nötig, wenn nur CSS-Klassen umgeschaltet werden,
            // aber es stellt sicher, dass alles konsistent ist.
            renderChecklistTextView(window.currentProjectData, checklistContainer);
        };
        toggleColorModeSwitch.dataset.listenerAdded = 'true';
    }

    // Einstellungsfeld ein-/ausblenden
    if (toggleSettingsBtn && settingsPanel && !toggleSettingsBtn.dataset.listenerAdded) {
        toggleSettingsBtn.addEventListener('click', () => {
            settingsPanel.classList.toggle('hidden');
            // Optional: Höhe anpassen, wenn es eine Transition geben soll
            if (!settingsPanel.classList.contains('hidden')) {
                // Setze max-height basierend auf der tatsächlichen Höhe des Inhalts
                settingsPanel.style.maxHeight = settingsPanel.scrollHeight + "px";
                // Korrigiere max-height, wenn die abhängige Einstellung sich ändert
                // Dies stellt sicher, dass die Höhe beim erneuten Öffnen korrekt ist,
                // auch wenn sich die abhängige Einstellung geändert hat.
                if (dependentCommentSetting && toggleCommentsSwitch && !toggleCommentsSwitch.checked) {
                    dependentCommentSetting.classList.add('hidden'); // Temporär verstecken für korrekte ScrollHeight
                    settingsPanel.style.maxHeight = settingsPanel.scrollHeight + "px";
                    dependentCommentSetting.classList.remove('hidden'); // Wieder einblenden
                }
            } else {
                settingsPanel.style.maxHeight = null;
            }
        });
        toggleSettingsBtn.dataset.listenerAdded = 'true';
    }

    // Sicherstellen, dass der Farbmodus beim Laden der Seite angewendet wird
    if (checklistContainer) {
        checklistContainer.classList.toggle('color-mode-active', showColorMode);
    }
}


/**
 * Speichert die aktuellen Projektdaten und rendert die Checkliste neu.
 * Dies wird nach jeder Statusänderung einer Checkbox aufgerufen.
 */
async function saveProjectAndRerender() {
    // Greift auf window.db und window.currentProjectData zu
    const response = await window.db.saveProject(window.currentProjectId, window.currentProjectData);
    if (response.ok) {
        // Liste neu rendern, um aktualisierte Status (z.B. bei übergeordneten Elementen) zu zeigen
        const checklistContainer = document.getElementById('checklist-text-view-content');
        if (checklistContainer) { // Überprüfen, ob der Container existiert
            renderChecklistTextView(window.currentProjectData, checklistContainer);
        } else {
            console.error("Fehler: Der Container 'checklist-text-view-content' wurde für das Neu-Rendern nicht gefunden.");
        }
        updateProgressBar();
    } else {
        window.showInfoModal('Fehler', 'Checkliste konnte nicht aktualisiert werden.');
    }
}

/**
 * Rendert die grafische Ansicht der Checkliste als Baumstruktur.
 * @param {object} projectData Die Projektdaten.
 * @param {HTMLElement} container Der HTML-Container für die grafische Ansicht.
 */
export function renderGraphicalChecklistView(projectData, container) {
    if (!container) {
        console.error("Fehler: Der Container für die grafische Checklistenansicht wurde nicht gefunden.");
        return;
    }
    container.innerHTML = ''; // Vorherigen Inhalt leeren

    if (!projectData.phases || projectData.phases.length === 0) {
        container.innerHTML = '<p>Dieses Projekt enthält keine Phasen für die grafische Ansicht.</p>';
        return;
    }

    const treeContainer = document.createElement('div');
    treeContainer.className = 'graphical-tree-container';

    projectData.phases.forEach((phase, phaseIndex) => {
        const phaseNumber = phaseIndex + 1;
        const phaseNode = document.createElement('div');
        const isPhaseDone = calculatePhaseCompletion(phase);
        phaseNode.className = `graphical-node graphical-phase ${isPhaseDone ? 'completed' : ''}`;
        phaseNode.innerHTML = `
            <div class="node-header">
                <span class="node-title">${phaseNumber}. ${phase.phaseName}</span>
                <span class="node-status">${isPhaseDone ? '✓' : ''}</span>
            </div>
        `;

        if (phase.tasks && phase.tasks.length > 0) {
            const tasksContainer = document.createElement('div');
            tasksContainer.className = 'graphical-children';
            phase.tasks.forEach((task, taskIndex) => {
                const taskNumber = `${phaseNumber}.${taskIndex + 1}`;
                const taskNode = document.createElement('div');
                const isTaskDone = calculateTaskCompletion(task);
                taskNode.className = `graphical-node graphical-task ${isTaskDone ? 'completed' : ''}`;
                taskNode.innerHTML = `
                    <div class="node-header">
                        <span class="node-title">${taskNumber}. ${task.taskName}</span>
                        <span class="node-status">${isTaskDone ? '✓' : ''}</span>
                    </div>
                `;

                if (task.subtasks && task.subtasks.length > 0) {
                    const subtasksContainer = document.createElement('div');
                    subtasksContainer.className = 'graphical-children';
                    task.subtasks.forEach((subtask, subtaskIndex) => {
                        const subtaskNumber = `${taskNumber}.${subtaskIndex + 1}`;
                        const subtaskNode = document.createElement('div');
                        subtaskNode.className = `graphical-node graphical-subtask ${subtask.completed ? 'completed' : ''}`;
                        subtaskNode.innerHTML = `
                            <div class="node-header">
                                <span class="node-title">${subtaskNumber}. ${subtask.subtaskName}</span>
                                <span class="node-status">${subtask.completed ? '✓' : ''}</span>
                            </div>
                        `;
                        subtasksContainer.appendChild(subtaskNode);
                    });
                    taskNode.appendChild(subtasksContainer);
                }
                tasksContainer.appendChild(taskNode);
            });
            phaseNode.appendChild(tasksContainer);
        }
        treeContainer.appendChild(phaseNode);
    });

    container.appendChild(treeContainer);
}

// HINWEIS: showProjectDetailsModal ist in dieser Datei nicht mehr vorhanden,
// da die Funktionalität in den Fortschrittsbalken-Bereich integriert wurde.
// Wenn window.showCommentsDetailModal aufgerufen wird, muss showCommentsDetailModal
// entweder global im main.js (durch das ui-Modul) oder direkt importiert und
// exportiert werden. Im aktuellen Fall ist es von