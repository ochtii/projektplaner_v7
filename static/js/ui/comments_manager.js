"use strict";

// =================================================================
// KOMMENTAR-MANAGER
// =================================================================
// Dieses Modul verwaltet das Rendern, Hinzufügen, Bearbeiten und Löschen von Kommentaren.

// Importiere Modal-Funktionen direkt
import { showInfoModal, showConfirmationModal, showPromptModal } from '../ui/modals.js';

/**
 * Rendert die Kommentare für ein gegebenes Element im Editor-Bereich.
 * @param {object} item Das Datenobjekt (Phase, Aufgabe oder Subaufgabe).
 */
export function renderCommentsSection(item) {
    const commentsSectionDiv = document.getElementById('comments-section');
    if (!commentsSectionDiv) return;

    commentsSectionDiv.innerHTML = ''; // Vorherige Kommentare leeren

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
    commentsSectionDiv.scrollTop = commentsSectionDiv.scrollHeight; // Zum Ende scrollen

    // Add event listeners for new icons
    commentsSectionDiv.querySelectorAll('.edit-comment-icon').forEach(icon => {
        icon.addEventListener('click', (e) => {
            const timestamp = e.target.dataset.timestamp;
            const commentToEdit = item.comments.find(c => c.timestamp === timestamp);
            if (commentToEdit) {
                // Direkter Aufruf der importierten Funktion
                showPromptModal('Kommentar bearbeiten', 'Neuer Kommentartext:', commentToEdit.text, async (newText) => {
                    if (newText !== null && newText.trim() !== commentToEdit.text.trim()) {
                        await editComment(item, timestamp, newText.trim());
                    } else if (newText === '') {
                        // Option zum Löschen, wenn Text gelöscht wird
                        // Direkter Aufruf der importierten Funktion
                        showConfirmationModal('Kommentar löschen?', 'Möchten Sie diesen Kommentar wirklich löschen, da er leer ist?', async () => {
                            await deleteComment(item, timestamp);
                        });
                    }
                });
            }
        });
    });

    commentsSectionDiv.querySelectorAll('.delete-comment-icon').forEach(icon => {
        icon.addEventListener('click', (e) => {
            const timestamp = e.target.dataset.timestamp;
            // Direkter Aufruf der importierten Funktion
            showConfirmationModal('Kommentar löschen?', 'Möchten Sie diesen Kommentar wirklich löschen?', async () => {
                await deleteComment(item, timestamp);
            });
        });
    });
}

/**
 * Fügt dem aktuell ausgewählten Element einen neuen Kommentar hinzu.
 * @param {object} item Das Element-Objekt, dem der Kommentar hinzugefügt werden soll.
 * @param {string} commentText Der Text des neuen Kommentars.
 */
export async function addCommentToItem(item, commentText) {
    if (!item.comments) {
        item.comments = [];
    }
    item.comments.push({
        author: window.currentUser.username, // Aktuellen angemeldeten Benutzer verwenden
        text: commentText,
        timestamp: Date.now().toString()
    });

    const response = await window.db.saveProject(window.currentProjectId, window.currentProjectData);
    if (response.ok) {
        document.getElementById('new-comment-input').value = ''; // Eingabefeld leeren
        renderCommentsSection(item); // Kommentare neu rendern
        // Direkter Aufruf der importierten Funktion
        showInfoModal('Erfolg', 'Kommentar hinzugefügt.');
    } else {
        // Direkter Aufruf der importierten Funktion
        showInfoModal('Fehler', 'Kommentar konnte nicht hinzugefügt werden.');
    }
}

/**
 * Löscht einen Kommentar aus einem Element.
 * @param {object} item Das Element, das den Kommentar enthält.
 * @param {string} commentTimestamp Der Zeitstempel des zu löschenden Kommentars.
 */
export async function deleteComment(item, commentTimestamp) {
    if (!item.comments) return;
    const initialCommentCount = item.comments.length;
    item.comments = item.comments.filter(c => c.timestamp !== commentTimestamp);

    if (item.comments.length < initialCommentCount) {
        const response = await window.db.saveProject(window.currentProjectId, window.currentProjectData);
        if (response.ok) {
            renderCommentsSection(item); // Kommentare neu rendern
            // Direkter Aufruf der importierten Funktion
            showInfoModal('Erfolg', 'Kommentar gelöscht.');
        } else {
            // Direkter Aufruf der importierten Funktion
            showInfoModal('Fehler', 'Kommentar konnte nicht gelöscht werden.');
        }
    }
}

/**
 * Bearbeitet einen bestehenden Kommentar.
 * @param {object} item Das Element, das den Kommentar enthält.
 * @param {string} commentTimestamp Der Zeitstempel des zu bearbeitenden Kommentars.
 * @param {string} newText Der neue Text für den Kommentar.
 */
export async function editComment(item, commentTimestamp, newText) {
    if (!item.comments) return;
    const commentToEdit = item.comments.find(c => c.timestamp === commentTimestamp);
    if (commentToEdit) {
        commentToEdit.text = newText;
        const response = await window.db.saveProject(window.currentProjectId, window.currentProjectData);
        if (response.ok) {
            renderCommentsSection(item); // Kommentare neu rendern
            // Direkter Aufruf der importierten Funktion
            showInfoModal('Erfolg', 'Kommentar bearbeitet.');
        } else {
            // Direkter Aufruf der importierten Funktion
            showInfoModal('Fehler', 'Kommentar konnte nicht bearbeitet werden.');
        }
    }
}
