"use strict";

// =================================================================
// BENUTZERVERWALTUNG LOGIK
// =================================================================
// Dieses Modul enthält die Logik für die Benutzerverwaltung im Admin-Bereich.

// Importiere Modal-Funktionen direkt
import { showUserEditModal, showInfoModal, showConfirmationModal } from '../ui/modals.js';

/**
 * Richtet die Benutzerverwaltungsseite ein.
 * Lädt Benutzerdaten und initialisiert Event-Listener für Aktionen.
 */
export async function setupUserManagementPage() {
    const tableBody = document.querySelector('#user-table tbody');
    if (!tableBody) return;

    /**
     * Rendert die Benutzertabelle mit den gegebenen Benutzerdaten.
     * @param {Array} users Ein Array von Benutzerobjekten.
     */
    const renderTable = (users) => {
        tableBody.innerHTML = users.map(user => `
            <tr data-user-id="${user.id}" data-username="${user.username}" data-email="${user.email}" data-is-admin="${user.isAdmin}">
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.isAdmin ? '<span style="color:var(--secondary-color); font-weight:bold;">Ja</span>' : 'Nein'}</td>
                <td class="action-buttons" style="text-align: center;">
                    <button class="btn-icon edit-user-btn" title="Benutzer bearbeiten">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="btn-icon reset-pw-btn" title="Passwort zurücksetzen">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                    </button>
                    <button class="btn-icon delete-user-btn" title="Benutzer löschen" style="color: #e74c3c;">
                         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </td>
            </tr>
        `).join('');
        attachUserManagementListeners();
    };

    /**
     * Lädt die Benutzerdaten vom Server und rendert die Tabelle.
     */
    const loadUsers = async () => {
        tableBody.innerHTML = '<tr><td colspan="4">Lade Benutzer...</td></tr>';
        try {
            const response = await fetch('/api/admin/users');
            const users = await response.json();
            renderTable(users);
        } catch (error) {
            tableBody.innerHTML = '<tr><td colspan="4">Fehler beim Laden der Benutzer.</td></tr>';
            console.error("Fehler beim Laden der Benutzer:", error);
        }
    };

    await loadUsers();
}

/**
 * Fügt Event-Listener zu den Aktions-Buttons der Benutzertabelle hinzu.
 */
function attachUserManagementListeners() {
    document.querySelectorAll('.edit-user-btn').forEach(btn => btn.addEventListener('click', handleEditUser));
    document.querySelectorAll('.delete-user-btn').forEach(btn => btn.addEventListener('click', handleDeleteUser));
    document.querySelectorAll('.reset-pw-btn').forEach(btn => btn.addEventListener('click', handleResetPassword));
}

/**
 * Behandelt das Bearbeiten eines Benutzers.
 * Öffnet ein Modal zum Bearbeiten der Benutzerdaten.
 * @param {Event} event Das Klick-Event.
 */
async function handleEditUser(event) {
    const row = event.target.closest('tr');
    const userId = row.dataset.userId;
    const username = row.dataset.username;
    const email = row.dataset.email;
    const isAdmin = row.dataset.isAdmin === 'true';

    // Ruft showUserEditModal auf (direkt importiert)
    showUserEditModal(username, email, isAdmin, async (newUsername, newEmail, newIsAdmin) => {
        const response = await fetch(`/api/admin/user/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: newUsername, email: newEmail, isAdmin: newIsAdmin })
        });
        if (response.ok) {
            showInfoModal('Erfolg', `Benutzer ${newUsername} wurde aktualisiert.`);
            setupUserManagementPage(); // Tabelle neu laden
        } else {
            const error = await response.json();
            showInfoModal('Fehler', `Konnte Benutzer nicht aktualisieren: ${error.error}`);
        }
    });
}

/**
 * Behandelt das Löschen eines Benutzers.
 * Öffnet ein Bestätigungs-Modal vor dem Löschen.
 * @param {Event} event Das Klick-Event.
 */
async function handleDeleteUser(event) {
    const row = event.target.closest('tr');
    const userId = row.dataset.userId;
    const username = row.dataset.username;

    // Ruft showConfirmationModal auf (direkt importiert)
    showConfirmationModal('Benutzer löschen', `Möchten Sie den Benutzer "${username}" wirklich endgültig löschen? Alle seine Daten gehen verloren.`, async () => {
        const response = await fetch(`/api/admin/user/${userId}`, { method: 'DELETE' });
        if (response.ok) {
            showInfoModal('Erfolg', `Benutzer ${username} wurde gelöscht.`);
            setupUserManagementPage(); // Tabelle neu laden
        } else {
            showInfoModal('Fehler', 'Konnte Benutzer nicht löschen.');
        }
    });
}

/**
 * Behandelt das Zurücksetzen des Passworts eines Benutzers.
 * Öffnet ein Bestätigungs-Modal und zeigt das neue Passwort an.
 * @param {Event} event Das Klick-Event.
 */
async function handleResetPassword(event) {
    const row = event.target.closest('tr');
    const userId = row.dataset.userId;
    const username = row.dataset.username;

    // Ruft showConfirmationModal auf (direkt importiert)
    showConfirmationModal('Passwort zurücksetzen', `Möchten Sie das Passwort für "${username}" wirklich zurücksetzen? Ein neues, zufälliges Passwort wird generiert.`, async () => {
        const response = await fetch(`/api/admin/user/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reset_password: true })
        });
        if (response.ok) {
            const result = await response.json();
            showInfoModal('Passwort zurückgesetzt', `Das neue Passwort für ${username} lautet: <strong>${result.new_password}</strong><br>Bitte speichern Sie es an einem sicheren Ort, es kann nicht erneut angezeigt werden.`);
        } else {
            showInfoModal('Fehler', 'Passwort konnte nicht zurückgesetzt werden.');
        }
    });
}
