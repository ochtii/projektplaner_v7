"use strict";

// =================================================================
// MODAL-FUNKTIONEN
// =================================================================
// Dieses Modul enthält Funktionen zum Anzeigen verschiedener Modal-Typen.

/**
 * Zeigt ein Informations-Modal an.
 * @param {string} title Der Titel des Modals.
 * @param {string} message Die Nachricht, die im Modal angezeigt wird.
 * @param {Function} [onOk] Eine optionale Callback-Funktion, die beim Klick auf OK ausgeführt wird.
 */
export function showInfoModal(title, message, onOk) {
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

/**
 * Zeigt ein Bestätigungs-Modal an.
 * @param {string} title Der Titel des Modals.
 * @param {string} message Die Bestätigungsnachricht.
 * @param {Function} onConfirm Die Callback-Funktion, die beim Klick auf Bestätigen ausgeführt wird.
 */
export function showConfirmationModal(title, message, onConfirm) {
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

/**
 * Zeigt ein Modal zur Bearbeitung von Benutzerdaten an.
 * @param {string} username Der aktuelle Benutzername.
 * @param {string} email Die aktuelle E-Mail-Adresse.
 * @param {boolean} isAdmin Der aktuelle Admin-Status.
 * @param {Function} callback Die Funktion, die mit den neuen Werten aufgerufen wird (newUsername, newEmail, newIsAdmin).
 */
export function showUserEditModal(username, email, isAdmin, callback) {
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

/**
 * Zeigt ein Prompt-Modal mit einem Eingabefeld an.
 * @param {string} title Der Titel des Modals.
 * @param {string} message Die Nachricht/Frage.
 * @param {string} [defaultValue=''] Der Standardwert für das Eingabefeld.
 * @param {Function} callback Die Funktion, die mit dem eingegebenen Wert (oder null bei Abbruch) aufgerufen wird.
 */
export function showPromptModal(title, message, defaultValue, callback) {
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

    promptInput.focus(); // Fokus auf das Eingabefeld
    promptInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            container.querySelector('.modal-ok-btn').click();
        }
    });
}

/**
 * Zeigt ein Modal zur Auswahl einer Projektvorlage an.
 * @param {string} title Der Titel des Modals.
 * @param {Array} templates Eine Liste von Vorlagenobjekten ({id, name, description}).
 * @param {Function} callback Die Funktion, die mit der ausgewählten Vorlagen-ID oder 'blank' aufgerufen wird.
 */
export function showTemplateSelectionModal(title, templates, callback) {
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

    // Option für leeres Projekt hinzufügen
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
