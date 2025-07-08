"use strict"; // Added 'use strict' to the very top

// =================================================================
// MODALS and other UI components (Moved to top for global availability)
// =================================================================

function showInfoModal(title, message, onOk) {
    const container = document.getElementById('modal-container');
    container.innerHTML = `
        <div class="modal-backdrop visible">
            <div class="modal">
                <div class="modal-header"><h3>${title}</h3><button class="modal-close-btn">&times;</button></div>
                <div class="modal-body">${message}</div>
                <div class="modal-footer"><button type="button" class="btn btn-primary modal-ok-btn">OK</button></div>
            </div>
        </div>`;
    const backdrop = container.querySelector('.modal-backdrop');
    const closeModal = () => {
        backdrop.classList.remove('visible');
        setTimeout(() => { container.innerHTML = ''; if(onOk) onOk(); }, 300);
    };
    container.querySelector('.modal-ok-btn').addEventListener('click', closeModal);
    container.querySelector('.modal-close-btn').addEventListener('click', closeModal);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });
}
window.showInfoModal = showInfoModal; // Expose immediately

function showConfirmationModal(title, message, onConfirm) {
    const container = document.getElementById('modal-container');
    container.innerHTML = `
        <div class="modal-backdrop visible">
            <div class="modal">
                <div class="modal-header"><h3>${title}</h3><button class="modal-close-btn">&times;</button></div>
                <div class="modal-body"><p>${message}</p></div>
                <div class="modal-footer"><button type="button" class="btn modal-cancel-btn">Abbrechen</button><button type="button" class="btn btn-danger modal-confirm-btn">Bestätigen</button></div>
            </div>
        </div>`;
    const backdrop = container.querySelector('.modal-backdrop');
    const closeModal = () => { backdrop.classList.remove('visible'); setTimeout(() => container.innerHTML = '', 300); };
    container.querySelector('.modal-confirm-btn').addEventListener('click', () => { onConfirm(); closeModal(); });
    container.querySelector('.modal-close-btn').addEventListener('click', closeModal);
    container.querySelector('.modal-cancel-btn').addEventListener('click', closeModal);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });
}
window.showConfirmationModal = showConfirmationModal; // Expose immediately

function showUserEditModal(username, email, isAdmin, callback) {
    const container = document.getElementById('modal-container');
    container.innerHTML = `
        <div class="modal-backdrop visible">
            <div class="modal">
                <div class="modal-header"><h3>Benutzer bearbeiten</h3><button class="modal-close-btn">&times;</button></div>
                <form id="user-edit-form">
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="edit-username">Benutzername</label>
                            <input type="text" id="edit-username" class="form-control" value="${username}" required>
                        </div>
                        <div class="form-group">
                            <label for="edit-email">E-Mail</label>
                            <input type="email" id="edit-email" class="form-control" value="${email}" required>
                        </div>
                        <div class="form-group-checkbox">
                            <label class="custom-checkbox">
                                <input type="checkbox" id="edit-is-admin" ${isAdmin ? 'checked' : ''}>
                                <span class="checkmark"></span>
                                <span>Ist Administrator</span>
                            </label>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn modal-cancel-btn">Abbrechen</button>
                        <button type="submit" class="btn btn-primary">Speichern</button>
                    </div>
                </form>
            </div>
        </div>`;

    const backdrop = container.querySelector('.modal-backdrop');
    const form = document.getElementById('user-edit-form');
    const closeModal = () => { backdrop.classList.remove('visible'); setTimeout(() => container.innerHTML = '', 300); };

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const newUsername = document.getElementById('edit-username').value.trim();
        const newEmail = document.getElementById('edit-email').value.trim();
        const newIsAdmin = document.getElementById('edit-is-admin').checked;
        if (newUsername && newEmail) {
            callback(newUsername, newEmail, newIsAdmin);
            closeModal();
        }
    });

    container.querySelector('.modal-close-btn').addEventListener('click', closeModal);
    container.querySelector('.modal-cancel-btn').addEventListener('click', closeModal);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });
}
window.showUserEditModal = showUserEditModal; // Expose immediately

/**
 * Rendert die Kommentare für ein gegebenes Element.
 * @param {object} item Das Datenobjekt (Phase, Aufgabe oder Subaufgabe).
 */
function renderCommentsSection(item) {
    const commentsSectionDiv = document.getElementById('comments-section');
    if (!commentsSectionDiv) return;

    commentsSectionDiv.innerHTML = ''; // Clear previous comments

    const comments = item.comments || [];
    if (comments.length === 0) {
        commentsSectionDiv.innerHTML = '<p style="opacity: 0.7;">Noch keine Kommentare.</p>';
        return;
    }

    comments.forEach(comment => {
        const commentDiv = document.createElement('div');
        commentDiv.className = 'comment-item';
        const date = new Date(parseInt(comment.timestamp)).toLocaleString();
        commentDiv.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <p style="margin: 0; flex-grow: 1;"><strong>${comment.author || 'Unbekannt'}:</strong> ${comment.text}</p>
                    <div class="comment-actions" style="display: flex; gap: 5px; margin-left: 10px;">
                        <span class="edit-comment-icon" data-timestamp="${comment.timestamp}" title="Kommentar bearbeiten">&#9998;</span>
                        <span class="delete-comment-icon" data-timestamp="${comment.timestamp}" title="Kommentar löschen">&#x1f5d1;</span>
                    </div>
                </div>
                <small style="opacity: 0.6;">${date}</small>
            `;
        commentsSectionDiv.appendChild(commentDiv);
    });
    commentsSectionDiv.scrollTop = commentsSectionDiv.scrollHeight; // Scroll to bottom

    // Add event listeners for new icons
    commentsSectionDiv.querySelectorAll('.edit-comment-icon').forEach(icon => {
        icon.addEventListener('click', (e) => {
            const timestamp = e.target.dataset.timestamp;
            const commentToEdit = item.comments.find(c => c.timestamp === timestamp);
            if (commentToEdit) {
                window.showPromptModal('Kommentar bearbeiten', 'Neuer Kommentartext:', commentToEdit.text, async (newText) => {
                    if (newText !== null && newText.trim() !== commentToEdit.text.trim()) {
                        await window.editComment(item, timestamp, newText.trim());
                    } else if (newText === '') {
                        // Option to delete if text is cleared
                        window.showConfirmationModal('Kommentar löschen?', 'Möchten Sie diesen Kommentar wirklich löschen, da er leer ist?', async () => {
                            await window.deleteComment(item, timestamp);
                        });
                    }
                });
            }
        });
    });

    commentsSectionDiv.querySelectorAll('.delete-comment-icon').forEach(icon => {
        icon.addEventListener('click', (e) => {
            const timestamp = e.target.dataset.timestamp;
            window.showConfirmationModal('Kommentar löschen?', 'Möchten Sie diesen Kommentar wirklich löschen?', async () => {
                await window.deleteComment(item, timestamp);
            });
        });
    });
}
window.renderCommentsSection = renderCommentsSection; // Expose immediately

function showPromptModal(title, message, defaultValue, callback) {
    const container = document.getElementById('modal-container');
    container.innerHTML = `
        <div class="modal-backdrop visible">
            <div class="modal">
                <div class="modal-header"><h3>${title}</h3><button class="modal-close-btn">&times;</button></div>
                <div class="modal-body">
                    <label for="prompt-input" style="display: block; margin-bottom: 0.5rem;">${message}</label>
                    <input type="text" id="prompt-input" class="form-control" value="${defaultValue || ''}" required style="width: 100%; padding: 0.5rem; border-radius: var(--border-radius); border: 1px solid var(--border-color);">
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn modal-cancel-btn">Abbrechen</button>
                    <button type="button" class="btn btn-primary modal-ok-btn">OK</button>
                </div>
            </div>
        </div>`;
    
    const backdrop = container.querySelector('.modal-backdrop');
    const promptInput = document.getElementById('prompt-input');

    const closeModal = (result = null) => {
        backdrop.classList.remove('visible');
        setTimeout(() => { container.innerHTML = ''; if(callback) callback(result); }, 300);
    };

    container.querySelector('.modal-ok-btn').addEventListener('click', () => {
        const value = promptInput.value.trim();
        closeModal(value);
    });
    container.querySelector('.modal-cancel-btn').addEventListener('click', () => closeModal(null));
    container.querySelector('.modal-close-btn').addEventListener('click', () => closeModal(null));
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(null); });

    promptInput.focus(); // Focus on the input field
    promptInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            container.querySelector('.modal-ok-btn').click();
        }
    });
}
window.showPromptModal = showPromptModal; // Expose immediately

/**
 * Zeigt ein Modal zur Auswahl einer Projektvorlage an.
 * @param {string} title Der Titel des Modals.
 * @param {Array} templates Eine Liste von Vorlagenobjekten ({id, name, description}).
 * @param {Function} callback Die Funktion, die mit der ausgewählten Vorlagen-ID oder 'blank' aufgerufen wird.
 */
function showTemplateSelectionModal(title, templates, callback) {
    const container = document.getElementById('modal-container');
    let templateOptionsHtml = templates.map(t => `
        <label class="template-option">
            <input type="radio" name="template-choice" value="${t.id}">
            <div>
                <h4>${t.name}</h4>
                <p>${t.description}</p>
            </div>
        </label>
    `).join('');

    // Add option for blank project
    templateOptionsHtml = `
        <label class="template-option">
            <input type="radio" name="template-choice" value="blank" checked>
            <div>
                <h4>Leeres Projekt</h4>
                <p>Starten Sie ein Projekt ohne vordefinierte Struktur.</p>
            </div>
        </label>
        ${templateOptionsHtml}
    `;

    container.innerHTML = `
        <div class="modal-backdrop visible">
            <div class="modal">
                <div class="modal-header"><h3>${title}</h3><button class="modal-close-btn">&times;</button></div>
                <div class="modal-body template-selection-body">
                    ${templateOptionsHtml}
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn modal-cancel-btn">Abbrechen</button>
                    <button type="button" class="btn btn-primary modal-select-btn">Auswählen</button>
                </div>
            </div>
        </div>`;

    const backdrop = container.querySelector('.modal-backdrop');
    const closeModal = (result = null) => {
        backdrop.classList.remove('visible');
        setTimeout(() => { container.innerHTML = ''; if(callback) callback(result); }, 300);
    };

    container.querySelector('.modal-select-btn').addEventListener('click', () => {
        const selectedRadio = container.querySelector('input[name="template-choice"]:checked');
        closeModal(selectedRadio ? selectedRadio.value : null);
    });
    container.querySelector('.modal-cancel-btn').addEventListener('click', () => closeModal(null));
    container.querySelector('.modal-close-btn').addEventListener('click', () => closeModal(null));
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(null); });
}
window.showTemplateSelectionModal = showTemplateSelectionModal; // Expose globally

document.addEventListener('DOMContentLoaded', function() {
    
    // Logik für das mobile Menü (unverändert)
    const mobileMenuButton = document.getElementById('mobileMenuButton');
    const mobileNav = document.getElementById('mobileNav');
    const closeMobileNav = document.getElementById('closeMobileNav');
    const overlay = document.getElementById('overlay');

    if (mobileMenuButton && mobileNav && closeMobileNav && overlay) {
        mobileMenuButton.addEventListener('click', () => {
            mobileNav.classList.add('open');
            overlay.classList.add('visible');
        });
        closeMobileNav.addEventListener('click', () => {
            mobileNav.classList.remove('open');
            overlay.classList.remove('visible');
        });
        overlay.addEventListener('click', () => {
            mobileNav.classList.remove('open');
            overlay.classList.remove('visible');
        });
    }

    // --- Dark/Light Mode Logik ---
    // 1. Theme bei jedem Seitenaufruf anwenden.
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
    }
    // 2. Event Listener nur auf der Einstellungsseite hinzufügen.
    const themeSwitcher = document.getElementById('themeSwitcher');
    if (themeSwitcher) {
        if (document.body.classList.contains('dark-mode')) {
            themeSwitcher.textContent = 'Light Mode aktivieren';
        } else {
            themeSwitcher.textContent = 'Dark Mode aktivieren';
        }
        themeSwitcher.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            if (document.body.classList.contains('dark-mode')) {
                localStorage.setItem('theme', 'dark');
                themeSwitcher.textContent = 'Light Mode aktivieren';
            } else {
                localStorage.setItem('theme', 'light');
                themeSwitcher.textContent = 'Dark Mode aktivieren';
            }
        });
    }

    // --- Sprachauswahl Logik ---
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
        const savedLanguage = localStorage.getItem('language');
        if (savedLanguage) {
            languageSelect.value = savedLanguage;
        }
        languageSelect.addEventListener('change', () => {
            const selectedLanguage = languageSelect.value;
            localStorage.setItem('language', selectedLanguage);
            location.reload();
        });
    }

    console.log("UI-Skripte geladen.");
});


/**
 * Zeigt die Details eines ausgewählten Elements im Editor-Bereich an.
 * @param {object} item Das Datenobjekt (Phase, Aufgabe oder Subaufgabe).
 * @param {string} type Der Typ des Elements ('Phase', 'Aufgabe', 'Subaufgabe').
 */
function showDetailsInEditor(item, type) {
    const editorContent = document.getElementById('editor-content');
    const selectedItemNameSpan = document.getElementById('selected-item-name');
    const editorEmptyHint = document.getElementById('editor-empty-hint'); // Get the hint element

    if (!editorContent || !selectedItemNameSpan || !editorEmptyHint) return;

    // Hide the hint and show the editor content
    editorEmptyHint.classList.add('hidden');
    editorContent.classList.remove('hidden');

    // Set the currently selected item globally for save/discard operations
    window.currentlySelectedItem = item;
    window.currentlySelectedType = type;

    const itemName = item.phaseName || item.taskName || item.subtaskName;
    selectedItemNameSpan.textContent = itemName;
    document.getElementById('editor-item-title').style.visibility = 'visible'; // Make sure title is visible

    // Render the editor in edit mode
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

    window.renderCommentsSection(item); // Use window prefix

    // Event Listeners for editor actions
    document.getElementById('save-editor-btn').addEventListener('click', () => {
        const newName = document.getElementById('editor-item-name').value;
        window.saveItemDetails(item, type, newName); // Call save function from main.js
    });

    document.getElementById('discard-editor-btn').addEventListener('click', () => {
        // Revert changes and show the hint
        editorContent.innerHTML = ''; // Clear content
        editorContent.classList.add('hidden'); // Hide content
        editorEmptyHint.classList.remove('hidden'); // Show hint
        selectedItemNameSpan.textContent = '';
        document.getElementById('editor-item-title').style.visibility = 'hidden'; // Hide title when nothing selected
        window.currentlySelectedItem = null;
        window.currentlySelectedType = null;
    });

    document.getElementById('add-comment-btn').addEventListener('click', () => {
        const newCommentText = document.getElementById('new-comment-input').value.trim();
        if (newCommentText) {
            window.addCommentToItem(item, newCommentText); // Call addCommentToItem from main.js
        }
    });
}

/**
 * Rendert den Projektbaum aus den JSON-Daten und fügt ihn in den Container ein.
 * Fügt Bearbeitungs- und Hinzufügen-Icons hinzu, sowie hierarchische Nummerierung.
 * @param {object} projectData Die Projektdaten als JSON-Objekt.
 * @param {HTMLElement} container Der UL-Container, in den der Baum eingefügt wird.
 */
function renderProjectTree(projectData, container) {
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
        phaseLi.querySelector('.tree-item').addEventListener('click', () => window.showDetailsInEditor(phase, 'Phase'));
        phaseLi.querySelector('.edit-icon').addEventListener('click', () => window.showDetailsInEditor(phase, 'Phase'));
        phaseLi.querySelector('.add-task-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            window.addNewItem('task', phase.phaseId);
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
                taskLi.querySelector('.tree-item').addEventListener('click', () => window.showDetailsInEditor(task, 'Aufgabe'));
                taskLi.querySelector('.edit-icon').addEventListener('click', () => window.showDetailsInEditor(task, 'Aufgabe'));
                taskLi.querySelector('.add-subtask-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    window.addNewItem('subtask', task.taskId);
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
                        subtaskLi.querySelector('.tree-item').addEventListener('click', () => window.showDetailsInEditor(subtask, 'Subaufgabe'));
                        subtaskLi.querySelector('.edit-icon').addEventListener('click', () => window.showDetailsInEditor(subtask, 'Subaufgabe'));
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

/**
 * Rendert die Projektübersicht als hierarchische Textansicht mit Nummerierung und Kommentarsymbolen.
 * @param {object} projectData Die Projektdaten als JSON-Objekt.
 * @param {HTMLElement} container Der HTML-Container, in den die Ansicht eingefügt wird.
 */
function renderProjectOverviewTextView(projectData, container) {
    container.innerHTML = '';
    if (!projectData.phases || projectData.phases.length === 0) {
        container.innerHTML = '<p>Dieses Projekt enthält keine Phasen.</p>';
        return;
    }

    const ul = document.createElement('ul');
    ul.className = 'project-overview-list'; // Add a class for styling

    projectData.phases.forEach((phase, phaseIndex) => {
        const phaseNumber = phaseIndex + 1;
        const phaseLi = document.createElement('li');
        phaseLi.innerHTML = `
            <span class="overview-item-text"><strong>${phaseNumber}. ${phase.phaseName}</strong></span>
            ${phase.comments && phase.comments.length > 0 ? `<span class="comment-icon" title="Zum Anzeigen klicken">${getCommentIconHtml()}</span>` : ''}
        `;
        if (phase.comments && phase.comments.length > 0) {
            phaseLi.querySelector('.comment-icon').addEventListener('click', () => window.showCommentsDetailModal(phase.comments, phase.phaseName));
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
                    taskLi.querySelector('.comment-icon').addEventListener('click', () => window.showCommentsDetailModal(task.comments, task.taskName));
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
                            subtaskLi.querySelector('.comment-icon').addEventListener('click', () => window.showCommentsDetailModal(subtask.comments, subtask.subtaskName));
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
 */
function getCommentIconHtml() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-left: 5px; cursor: pointer;"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>`;
}


/**
 * Zeigt eine Modal-Ansicht mit allen Kommentaren für ein Element.
 * @param {Array} comments Die Liste der Kommentarobjekte.
 * @param {string} itemName Der Name des Elements, zu dem die Kommentare gehören.
 */
function showCommentsDetailModal(comments, itemName) {
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

    window.showInfoModal(`Kommentare zu: ${itemName}`, `<div style="max-height: 300px; overflow-y: auto; padding-right: 10px;">${commentsHtml}</div>`);
}

// Expose functions to global scope for main.js to call
window.renderProjectOverviewTextView = renderProjectOverviewTextView;
window.showCommentsDetailModal = showCommentsDetailModal;