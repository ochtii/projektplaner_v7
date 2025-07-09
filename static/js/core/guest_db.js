// ochtii/projektplaner_v7/projektplaner_v7-55c8a693a05caeff31bc85b526881ea8deee5951/static/js/core/guest_db.js
"use strict";

// =================================================================
// GAST DATENBANK-ABSTRAKTION (LocalStorage)
// =================================================================
// Dieses Modul simuliert Datenbank-Operationen für Gastbenutzer
// und speichert Daten im Browser-LocalStorage.

export const guestDb = {
    /**
     * Hilfsfunktion zum Laden von Projekten aus dem LocalStorage.
     * @returns {object} Ein Objekt mit Projekten.
     */
    _getProjects() {
        try {
            const projects = JSON.parse(localStorage.getItem('guestProjects') || '{}');
            window.debugLog("GuestDB: Projekte aus LocalStorage geladen.", projects);
            return projects;
        } catch (e) {
            console.error("Fehler beim Parsen von guestProjects aus LocalStorage:", e);
            window.debugLog("GuestDB: Fehler beim Parsen von guestProjects aus LocalStorage.", e);
            return {};
        }
    },

    /**
     * Hilfsfunktion zum Speichern von Projekten im LocalStorage.
     * @param {object} p Das zu speichernde Projektobjekt.
     */
    _saveProjects(p) {
        localStorage.setItem('guestProjects', JSON.stringify(p));
        window.debugLog("GuestDB: Projekte in LocalStorage gespeichert.", p);
    },

    /**
     * Ruft alle Projekte des Gastbenutzers ab.
     * Berechnet auch den Fortschritt für jedes Projekt.
     * @returns {Promise<Array>} Ein Array von Projektobjekten.
     */
    async getProjects() {
        const projects = this._getProjects();
        const formattedProjects = Object.values(projects).map(p => ({
            ...p,
            id: p.projectId,
            name: p.projectName,
            progress: this._calculateProgress(p)
        }));
        window.debugLog("GuestDB: Alle Projekte (formatiert) abgerufen.", formattedProjects);
        return formattedProjects;
    },

    /**
     * Ruft ein spezifisches Projekt des Gastbenutzers ab.
     * @param {string} id Die ID des Projekts.
     * @returns {Promise<object|null>} Das Projektobjekt oder null, wenn nicht gefunden.
     */
    async getProject(id) {
        const project = this._getProjects()[id] || null;
        window.debugLog(`GuestDB: Projekt '${id}' abgerufen.`, project);
        return project;
    },

    /**
     * Speichert ein Projekt des Gastbenutzers.
     * @param {string} id Die ID des zu speichernden Projekts.
     * @param {object} data Das zu speichernde Projektobjekt.
     * @returns {Promise<object>} Ein Erfolgsobjekt.
     */
    async saveProject(id, data) {
        const projects = this._getProjects();
        projects[id] = data;
        this._saveProjects(projects);
        window.debugLog(`GuestDB: Projekt '${id}' gespeichert.`, data);
        return { ok: true };
    },

    /**
     * Erstellt ein neues Projekt für den Gastbenutzer.
     * Überprüft Gast-Limits.
     * @param {object} data Das zu erstellende Projektobjekt.
     * @returns {Promise<object>} Ein Erfolgsobjekt oder ein Fehlerobjekt, wenn das Limit erreicht ist.
     */
    async createProject(data) {
        const projects = this._getProjects();
        if (Object.keys(projects).length >= (window.globalSettings?.guest_limits?.projects || 1)) {
            window.showInfoModal('Limit erreicht', `Als Gast können Sie maximal ${window.globalSettings.guest_limits.projects} Projekte erstellen.`);
            window.debugLog("GuestDB: Projekterstellung fehlgeschlagen, Gast-Limit erreicht.");
            return { ok: false };
        }
        projects[data.projectId] = data;
        this._saveProjects(projects);
        window.debugLog(`GuestDB: Projekt '${data.projectId}' erstellt.`, data);
        return { ok: true, json: async () => data };
    },

    /**
     * Löscht ein Projekt des Gastbenutzers.
     * @param {string} id Die ID des zu löschenden Projekts.
     * @returns {Promise<object>} Ein Erfolgsobjekt.
     */
    async deleteProject(id) {
        const projects = this._getProjects();
        delete projects[id];
        this._saveProjects(projects);
        window.debugLog(`GuestDB: Projekt '${id}' gelöscht.`);
        return { ok: true };
    },

    /**
     * Berechnet den Fortschritt eines Projekts.
     * @param {object} project Das Projektobjekt.
     * @returns {number} Der Fortschritt in Prozent.
     */
    _calculateProgress(project) {
        let total = 0, completed = 0;
        (project.phases || []).forEach(phase => {
            (phase.tasks || []).forEach(task => {
                const items = task.subtasks && task.subtasks.length > 0 ? task.subtasks : [task];
                total += items.length;
                completed += items.filter(i => i.done).length;
            });
        });
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        window.debugLog(`GuestDB: Fortschritt für Projekt '${project.projectName}' berechnet: ${progress}%`);
        return progress;
    },

    /**
     * Ruft Benutzereinstellungen des Gastbenutzers ab.
     * @returns {Promise<object>} Die Benutzereinstellungen (nun keine Theme-spezifischen Daten).
     */
    async getSettings() {
        window.debugLog(`GuestDB: Theme-Einstellung abgerufen (alte Logik entfernt).`);
        return {}; // Leeres Objekt zurückgeben, da Theme-Einstellung entfernt wird.
    },

    /**
     * Speichert Benutzereinstellungen des Gastbenutzers.
     * @param {object} s Die zu speichernden Einstellungen.
     * @returns {Promise<object>} Ein Erfolgsobjekt.
     */
    async saveSettings(s) {
        window.debugLog(`GuestDB: Theme-Einstellung gespeichert (alte Logik entfernt).`);
        return { ok: true };
    },

    /**
     * Setzt alle Daten des Gastbenutzers zurück.
     * @returns {Promise<object>} Ein Erfolgsobjekt.
     */
    async resetAllData() {
        localStorage.removeItem('guestProjects');
        window.debugLog("GuestDB: Alle Gast-Projekte aus LocalStorage gelöscht.");
        return { ok: true };
    },

    /**
     * Gastbenutzer haben keinen Zugriff auf Server-Vorlagen.
     * @returns {Promise<Array>} Ein leeres Array.
     */
    async getTemplates() {
        window.debugLog("GuestDB: Vorlagen-Anfrage (nicht unterstützt für Gäste).");
        return [];
    },

    /**
     * Gastbenutzer können keine Vorlageninhalte abrufen.
     * @returns {Promise<object>} Ein Fehlerobjekt.
     */
    async getTemplateContent(templateId) {
        window.debugLog(`GuestDB: Vorlageninhalt-Anfrage für '${templateId}' (nicht unterstützt für Gäste).`);
        return { error: "Guests cannot access templates." };
    },

    /**
     * Stellt einen einfachen Beispielprojektinhalt für Gastbenutzer bereit.
     * @returns {Promise<object>} Das Beispielprojekt.
     */
    async getInitialProjectContent() {
        window.debugLog("GuestDB: Initialer Projektinhalt für Gast abgerufen.");
        return {
            projectId: "bsp_guest",
            projectName: "Beispielprojekt (Gast)",
            phases: [
                {
                    phaseId: "phase01",
                    phaseName: "Erste Schritte",
                    isExpanded: true,
                    tasks: [
                        { taskId: "task01", taskName: "App erkunden", subtasks: [] }
                    ]
                }
            ]
        };
    }
};