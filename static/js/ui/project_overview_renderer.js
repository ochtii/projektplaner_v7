"use strict";

// =================================================================
// PROJEKTÜBERSICHT-RENDERER
// =================================================================
// Dieses Modul ist für das Rendern der Textansicht der Projektübersicht zuständig.

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
            phaseLi.querySelector('.comment-icon').addEventListener('click', () => showCommentsDetailModal(phase.comments, phase.phaseName));
        }

        if (phase.tasks && phase.tasks.length > 0) {
            const tasksUl = document.createElement('ul');
            phase.tasks.forEach((task, taskIndex) => {
                const taskNumber = `${phaseNumber}.${taskIndex + 1}`;
                const taskLi = document.createElement('li');
                taskLi.innerHTML = `
                    <span class="overview-item-text">${taskNumber}. ${task.taskName}</span>
                    ${task.comments && task.comments.length > 0 ? `<span class="comment-icon" title="Zum Anzeigen klicken">${getCommentIconHtml()}</span>` : ''}
                `;
                if (task.comments && task.comments.length > 0) {
                    taskLi.querySelector('.comment-icon').addEventListener('click', () => showCommentsDetailModal(task.comments, task.taskName));
                }

                if (task.subtasks && task.subtasks.length > 0) {
                    const subtasksUl = document.createElement('ul');
                    task.subtasks.forEach((subtask, subtaskIndex) => {
                        const subtaskNumber = `${taskNumber}.${subtaskIndex + 1}`;
                        const subtaskLi = document.createElement('li');
                        subtaskLi.innerHTML = `
                            <span class="overview-item-text">${subtaskNumber}. ${subtask.subtaskName}</span>
                            ${subtask.comments && subtask.comments.length > 0 ? `<span class="comment-icon" title="Zum Anzeigen klicken">${getCommentIconHtml()}</span>` : ''}
                        `;
                        if (subtask.comments && subtask.comments.length > 0) {
                            subtaskLi.querySelector('.comment-icon').addEventListener('click', () => showCommentsDetailModal(subtask.comments, subtask.subtaskName));
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
