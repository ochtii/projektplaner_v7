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
    const editorTitle = document.getElementById('selected-item-name');
    const itemName = item.phaseName || item.taskName || item.subtaskName;

    if (!editorContent || !editorTitle) return;

    // Titel des Editors aktualisieren
    editorTitle.textContent = itemName;

    // Editor-Formular dynamisch erstellen
    editorContent.innerHTML = `
        <div class="form-group" style="margin-bottom: 1rem;">
            <label for="editor-item-name" style="display: block; margin-bottom: 0.5rem;">${type}-Name</label>
            <input type="text" id="editor-item-name" class="form-control" value="${itemName}" style="width: 100%; padding: 0.5rem; border-radius: var(--border-radius); border: 1px solid var(--border-color);">
        </div>
        <button class="btn btn-primary" id="save-editor-btn">Änderungen speichern</button>
    `;

    // Event Listener für den Speicher-Button hinzufügen
    document.getElementById('save-editor-btn').addEventListener('click', () => {
        const newName = document.getElementById('editor-item-name').value;
        const itemId = item.phaseId || item.taskId || item.subtaskId;
        
        console.log(`Speichere neuen Namen für ${type} (ID: ${itemId}): ${newName}`);
        // Hier würde der API-Call zum Speichern der Daten an das Backend erfolgen.
        alert('Speichern-Funktion ist noch nicht mit dem Backend verbunden.');
    });
}


/**
 * Rendert den Projektbaum aus den JSON-Daten und fügt ihn in den Container ein.
 * @param {object} projectData Die Projektdaten als JSON-Objekt.
 * @param {HTMLElement} container Der UL-Container, in den der Baum eingefügt wird.
 */
function renderProjectTree(projectData, container) {
    container.innerHTML = '';

    if (!projectData.phases || projectData.phases.length === 0) {
        container.innerHTML = '<li>Diesem Projekt wurden noch keine Phasen hinzugefügt.</li>';
        return;
    }

    projectData.phases.forEach(phase => {
        const phaseLi = document.createElement('li');
        const phaseSpan = document.createElement('span');
        phaseSpan.className = 'tree-item';
        phaseSpan.textContent = phase.phaseName;
        phaseSpan.addEventListener('click', () => showDetailsInEditor(phase, 'Phase'));
        phaseLi.appendChild(phaseSpan);

        if (phase.tasks && phase.tasks.length > 0) {
            const tasksUl = document.createElement('ul');
            phase.tasks.forEach(task => {
                const taskLi = document.createElement('li');
                const taskSpan = document.createElement('span');
                taskSpan.className = 'tree-item';
                taskSpan.textContent = task.taskName;
                taskSpan.addEventListener('click', () => showDetailsInEditor(task, 'Aufgabe'));
                taskLi.appendChild(taskSpan);

                if (task.subtasks && task.subtasks.length > 0) {
                    const subtasksUl = document.createElement('ul');
                    task.subtasks.forEach(subtask => {
                        const subtaskLi = document.createElement('li');
                        const subtaskSpan = document.createElement('span');
                        subtaskSpan.className = 'tree-item';
                        subtaskSpan.textContent = subtask.subtaskName;
                        subtaskSpan.addEventListener('click', () => showDetailsInEditor(subtask, 'Subaufgabe'));
                        subtaskLi.appendChild(subtaskSpan);
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

// =================================================================
// MODALS and other UI components
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