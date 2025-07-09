"use strict";

// =================================================================
// API DATENBANK-ABSTRAKTION
// =================================================================
// Dieses Modul kapselt alle Interaktionen mit dem Flask-Backend über API-Aufrufe.

export const apiDb = {
    /**
     * Ruft alle Projekte des aktuellen Benutzers vom Server ab.
     * @returns {Promise<Array>} Ein Array von Projektobjekten.
     */
    async getProjects() {
        return (await fetch('/api/projects')).json();
    },

    /**
     * Ruft ein spezifisches Projekt vom Server ab.
     * @param {string} id Die ID des Projekts.
     * @returns {Promise<object>} Das Projektobjekt.
     */
    async getProject(id) {
        return (await fetch(`/api/project/${id}`)).json();
    },

    /**
     * Speichert ein Projekt auf dem Server.
     * @param {string} id Die ID des zu speichernden Projekts.
     * @param {object} data Das zu speichernde Projektobjekt.
     * @returns {Promise<Response>} Die Serverantwort.
     */
    async saveProject(id, data) {
        return fetch(`/api/project/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    },

    /**
     * Erstellt ein neues Projekt auf dem Server.
     * @param {object} data Das zu erstellende Projektobjekt.
     * @returns {Promise<Response>} Die Serverantwort.
     */
    async createProject(data) {
        return fetch('/api/project', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    },

    /**
     * Löscht ein Projekt auf dem Server.
     * @param {string} id Die ID des zu löschenden Projekts.
     * @returns {Promise<Response>} Die Serverantwort.
     */
    async deleteProject(id) {
        return fetch(`/api/project/${id}`, { method: 'DELETE' });
    },

    /**
     * Ruft Benutzereinstellungen vom Server ab.
     * @returns {Promise<object>} Die Benutzereinstellungen.
     */
    async getSettings() {
        return (await fetch('/api/settings')).json();
    },

    /**
     * Speichert Benutzereinstellungen auf dem Server.
     * @param {object} data Die zu speichernden Einstellungen.
     * @returns {Promise<Response>} Die Serverantwort.
     */
    async saveSettings(data) {
        return fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    },

    /**
     * Setzt alle Benutzerdaten auf dem Server zurück.
     * @returns {Promise<Response>} Die Serverantwort.
     */
    async resetAllData() {
        return fetch('/api/reset-all-data', { method: 'POST' });
    },

    /**
     * Ruft eine Liste verfügbarer Projektvorlagen vom Server ab.
     * @returns {Promise<Array>} Ein Array von Vorlagenobjekten.
     */
    async getTemplates() {
        return (await fetch('/api/templates')).json();
    },

    /**
     * Ruft den Inhalt einer spezifischen Projektvorlage vom Server ab.
     * @param {string} templateId Die ID der Vorlage.
     * @returns {Promise<object>} Der Inhalt der Vorlage.
     */
    async getTemplateContent(templateId) {
        return (await fetch(`/api/template/${templateId}`)).json();
    },

    /**
     * Ruft den Inhalt des initialen Beispielprojekts vom Server ab.
     * @returns {Promise<object>} Der Inhalt des initialen Projekts.
     */
    async getInitialProjectContent() {
        return (await fetch('/api/initial-project')).json();
    }
};