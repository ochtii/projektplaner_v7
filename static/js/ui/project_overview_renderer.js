"use strict";

// =================================================================
// PROJEKTÜBERSICHT-RENDERER
// =================================================================
// Dieses Modul ist für das Rendern der Textansicht der Projektübersicht zuständig.

import * as GlobalUI from './global_ui.js'; // Importiere GlobalUI für Header-Updates

/**
 * Richtet die Projektübersichtsseite ein.
 * Lädt Projektdaten und rendert die Textansicht.
 */
export async function setupProjectOverviewPage() {
    // Greift auf window.db und window.currentProjectId zu
    const projectData = await window.db.getProject(window.currentProjectId);
    if (projectData) {
        window.currentProjectData = projectData; // Globale Referenz aktualisieren
        // Aktualisiere den Projektnamen im Haupttitel und im globalen Header
        document.getElementById('projectName').textContent = projectData.projectName; // Dies ist der H2-Titel auf der Seite selbst
        GlobalUI.updateHeaderTitles(projectData.projectName, 'Übersicht');
        
        // Initialisiere Ansichts-Umschalter und Dropdown
        const textViewBtn = document.getElementById('text-view-btn');
        const graphicalViewBtn = document.getElementById('graphical-view-btn');
        const graphicalViewSelector = document.getElementById('graphical-view-selector');
        const textViewContent = document.getElementById('text-view-content');
        const graphicalViewContent = document.getElementById('graphical-view-content');

        // Event Listener für Ansichts-Buttons
        textViewBtn?.addEventListener('click', () => {
            textViewContent?.classList.remove('hidden');
            graphicalViewContent?.classList.add('hidden');
            graphicalViewSelector?.classList.add('hidden'); // Dropdown ausblenden
            textViewBtn.classList.add('btn-primary');
            textViewBtn.classList.remove('btn-secondary');
            graphicalViewBtn.classList.add('btn-secondary');
            graphicalViewBtn.classList.remove('btn-primary');
            renderProjectOverviewTextView(projectData, textViewContent); // Textansicht neu rendern
        });

        graphicalViewBtn?.addEventListener('click', () => {
            textViewContent?.classList.add('hidden');
            graphicalViewContent?.classList.remove('hidden');
            graphicalViewSelector?.classList.remove('hidden'); // Dropdown einblenden
            graphicalViewBtn.classList.add('btn-primary');
            graphicalViewBtn.classList.remove('btn-primary'); // Korrektur: sollte nur einmal primary sein
            textViewBtn.classList.add('btn-secondary');
            textViewBtn.classList.remove('btn-primary'); // Korrektur: sollte nur einmal primary sein
            // Standard-Grafikansicht rendern, oder die zuletzt ausgewählte
            renderGraphicalView(projectData, graphicalViewContent, graphicalViewSelector.value);
        });

        // Event Listener für das Dropdown der grafischen Ansichten
        graphicalViewSelector?.addEventListener('change', (event) => {
            const selectedViewType = event.target.value;
            renderGraphicalView(projectData, graphicalViewContent, selectedViewType);
        });

        // Standardmäßig die Textansicht laden
        textViewBtn.click(); // Simuliert einen Klick, um die Textansicht zu initialisieren

    } else {
        document.getElementById('text-view-content').innerHTML = '<p>Projekt konnte nicht geladen werden.</p>';
    }
}

/**
 * Rendert die Projektübersicht als hierarchische Textansicht mit Nummerierung und Kommentarsymbolen.
 * @param {object} projectData Die Projektdaten als JSON-Objekt.
 * @param {HTMLElement} container Der HTML-Container, in den die Ansicht eingefügt wird.
 */
export function renderProjectOverviewTextView(projectData, container) {
    container.innerHTML = '';
    if (!projectData.phases || projectData.phases.length === 0) {
        container.innerHTML = '<p>Dieses Projekt enthält keine Phasen.</p>';
        return;
    }

    const ul = document.createElement('ul');
    ul.className = 'project-overview-list'; // Klasse für Styling hinzufügen

    projectData.phases.forEach((phase, phaseIndex) => {
        const phaseNumber = phaseIndex + 1;
        const phaseLi = document.createElement('li');
        phaseLi.innerHTML = `
            <span class="overview-item-text"><strong>${phaseNumber}. ${phase.phaseName}</strong></span>
            ${phase.comments && phase.comments.length > 0 ? `<span class="comment-icon" title="Zum Anzeigen klicken">${getCommentIconHtml()}</span>` : ''}
        `;
        if (phase.comments && phase.comments.length > 0) {
            // Programmatisches Hinzufügen des Event Listeners
            const commentIcon = phaseLi.querySelector('.comment-icon');
            if (commentIcon) {
                commentIcon.addEventListener('click', (e) => {
                    e.stopPropagation(); // Verhindert, dass Klick-Events an übergeordnete Elemente weitergegeben werden
                    window.showCommentsDetailModal(phase.comments, phase.phaseName);
                });
            }
        }

        if (phase.tasks && phase.tasks.length > 0) {
            const tasksUl = document.createElement('ul');
            tasksUl.className = 'project-overview-tasks'; // Klasse für Styling
            phase.tasks.forEach((task, taskIndex) => {
                const taskNumber = `${phaseNumber}.${taskIndex + 1}`;
                const taskLi = document.createElement('li');
                taskLi.innerHTML = `
                    <span class="overview-item-text">${taskNumber}. ${task.taskName}</span>
                    ${task.comments && task.comments.length > 0 ? `<span class="comment-icon" title="Zum Anzeigen klicken">${getCommentIconHtml()}</span>` : ''}
                `;
                if (task.comments && task.comments.length > 0) {
                    const commentIcon = taskLi.querySelector('.comment-icon');
                    if (commentIcon) {
                        commentIcon.addEventListener('click', (e) => {
                            e.stopPropagation();
                            window.showCommentsDetailModal(task.comments, task.taskName);
                        });
                    }
                }

                if (task.subtasks && task.subtasks.length > 0) {
                    const subtasksUl = document.createElement('ul');
                    subtasksUl.className = 'project-overview-subtasks'; // Klasse für Styling
                    task.subtasks.forEach((subtask, subtaskIndex) => {
                        const subtaskNumber = `${taskNumber}.${subtaskIndex + 1}`;
                        const subtaskLi = document.createElement('li');
                        subtaskLi.innerHTML = `
                            <span class="overview-item-text">${subtaskNumber}. ${subtask.subtaskName}</span>
                            ${subtask.comments && subtask.comments.length > 0 ? `<span class="comment-icon" title="Zum Anzeigen klicken">${getCommentIconHtml()}</span>` : ''}
                        `;
                        if (subtask.comments && subtask.comments.length > 0) {
                            const commentIcon = subtaskLi.querySelector('.comment-icon');
                            if (commentIcon) {
                                commentIcon.addEventListener('click', (e) => {
                                    e.stopPropagation();
                                    window.showCommentsDetailModal(subtask.comments, subtask.subtaskName);
                                });
                            }
                        }
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
}

/**
 * Rendert die grafische Ansicht der Projektübersicht.
 * @param {object} projectData Die Projektdaten.
 * @param {HTMLElement} container Der HTML-Container für die grafische Ansicht.
 * @param {string} viewType Der Typ der grafischen Ansicht (z.B. 'overview_chart', 'gantt_chart').
 */
export function renderGraphicalView(projectData, container, viewType) {
    if (!container) {
        console.error("Fehler: Der Container für die grafische Ansicht wurde nicht gefunden.");
        return;
    }
    container.innerHTML = ''; // Vorherigen Inhalt leeren

    // Hier wird die Logik für verschiedene grafische Ansichten implementiert
    switch (viewType) {
        case 'overview_chart':
            // Beispiel: Einfaches Übersichtsdiagramm (Platzhalter)
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <h3>Übersichtsdiagramm</h3>
                    <p>Hier könnte ein Kreisdiagramm oder Balkendiagramm des Gesamtfortschritts und des Fortschritts pro Phase angezeigt werden.</p>
                    <div style="width: 100%; height: 200px; background-color: var(--background-color); border-radius: var(--border-radius); display: flex; align-items: center; justify-content: center; opacity: 0.8;">
                        [Platzhalter für Diagramm]
                    </div>
                    <p style="margin-top: 1rem; font-style: italic; opacity: 0.7;">(Diese Ansicht ist noch in Entwicklung)</p>
                </div>
            `;
            // Hier könnten Sie eine Bibliothek wie Chart.js oder D3.js integrieren
            break;
        case 'gantt_chart':
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <h3>Gantt-Diagramm</h3>
                    <p>Visualisierung der Aufgabenplanung über die Zeit.</p>
                    <p style="margin-top: 1rem; font-style: italic; opacity: 0.7;">(Diese Funktion ist noch nicht verfügbar.)</p>
                </div>
            `;
            break;
        case 'dependency_graph':
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <h3>Abhängigkeitsgraph</h3>
                    <p>Visualisierung der Abhängigkeiten zwischen Aufgaben.</p>
                    <p style="margin-top: 1rem; font-style: italic; opacity: 0.7;">(Diese Funktion ist noch nicht verfügbar.)</p>
                </div>
            `;
            break;
        default:
            container.innerHTML = `<p>Wählen Sie eine grafische Ansicht.</p>`;
    }
}


/**
 * Generiert das HTML für ein Sprechblasensymbol.
 * @returns {string} HTML-String des Symbols.
 */
function getCommentIconHtml() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-left: 5px; cursor: pointer;"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>`;
}


/**
 * Zeigt eine Modal-Ansicht mit allen Kommentaren für ein Element an.
 * Diese Funktion ruft showInfoModal aus dem globalen Kontext auf.
 * @param {Array} comments Die Liste der Kommentarobjekte.
 * @param {string} itemName Der Name des Elements, zu dem die Kommentare gehören.
 */
export function showCommentsDetailModal(comments, itemName) {
    let commentsHtml = comments.map(comment => {
        const date = new Date(parseInt(comment.timestamp)).toLocaleString();
        return `
                <div class="comment-item" style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid var(--border-color);">
                    <p style="margin: 0;"><strong>${comment.author || 'Unbekannt'}:</strong> ${comment.text}</p>
                    <small style="opacity: 0.6;">${date}</small>
                </div>
            `;
    }).join('');

    if (comments.length === 0) {
        commentsHtml = '<p>Keine Kommentare vorhanden.</p>';
    }

    // Ruft die globale showInfoModal Funktion auf
    window.showInfoModal(`Kommentare zu: ${itemName}`, `<div style="max-height: 300px; overflow-y: auto; padding-right: 10px;">${commentsHtml}</div>`);
}
