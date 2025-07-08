// ochtii/projektplaner_v7/projektplaner_v7-55c8a693a05caeff31bc85b526881ea8deee5951/static/js/dashboard/dashboard_logic.js
"use strict";

// =================================================================
// DASHBOARD LOGIK
// =================================================================
// Dieses Modul enthält die Logik für die Dashboard-Seite,
// einschließlich der Anzeige von Projekten und der Erstellung neuer Projekte.

// Importiere Modal-Funktionen direkt
import { showTemplateSelectionModal, showPromptModal, showInfoModal } from '../ui/modals.js';

/**
 * Richtet die Dashboard-Seite ein.
 * Initialisiert Event-Listener und rendert das Projekt-Grid.
 */
export async function setupDashboardPage() {
    // Stellen Sie sicher, dass der Button existiert, bevor Sie einen Event-Listener hinzufügen.
    document.getElementById('create-project-btn')?.addEventListener('click', () => createNewProject(true));
    await renderProjectGrid(); // Stellt sicher, dass Projekte geladen sind, bevor weitergemacht wird
}

/**
 * Rendert das Projekt-Grid auf dem Dashboard.
 * Zeigt vorhandene Projekte an oder einen Hinweis, wenn keine vorhanden sind.
 * Implementiert auch die Logik für das initiale Beispielprojekt.
 */
export async function renderProjectGrid() {
    const grid = document.getElementById('project-grid');
    if (!grid) {
        console.error("Fehler: Das 'project-grid' Element wurde nicht gefunden.");
        return; // Frühzeitiger Exit, wenn das Grid nicht existiert
    }

    grid.innerHTML = '<p>Lade Projekte...</p>';
    // Greift auf window.db und window.currentUser zu
    const projects = await window.db.getProjects();

    // Logik für das initiale Beispielprojekt beim ersten Besuch
    // (Nur für angemeldete Benutzer, nicht für Gäste)
    if (projects.length === 0 && !window.currentUser.is_guest && !window.hasInitialProjectBeenLoaded) {
        window.debugLog("Dashboard: Keine Projekte gefunden, versuche initiales Projekt zu erstellen.");
        await createInitialProject();
        window.hasInitialProjectBeenLoaded = true; // Flag setzen
        await renderProjectGrid(); // Grid neu rendern, um das neue Projekt anzuzeigen
        return;
    }

    if (!projects || projects.length === 0) {
        grid.innerHTML = '<p>Sie haben noch keine Projekte erstellt. Klicken Sie oben auf "Neues Projekt erstellen", um loszulegen.</p>';
        window.debugLog("Dashboard: Keine Projekte zum Anzeigen.");
        return;
    }

    grid.innerHTML = projects.map(p => {
        // Berechne den Fortschritt für jedes Projekt
        let totalItems = 0;
        let completedItems = 0;

        (p.phases || []).forEach(phase => {
            (phase.tasks || []).forEach(task => {
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
        });
        const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

        return `
            <div class="project-card">
                <h3>${p.name || p.projectName}</h3>
                
                <div class="project-card-progress" style="margin-top: 1rem; margin-bottom: 1rem;">
                    <div class="progress-bar-container" style="width: 100%; background-color: var(--border-color); border-radius: var(--border-radius); overflow: hidden; box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);">
                        <div style="height: 20px; width: ${progressPercentage}%; background-color: var(--primary-color); border-radius: var(--border-radius); text-align: center; line-height: 20px; color: white; font-size: 0.8em; transition: width 0.5s ease-in-out;">
                            ${progressPercentage}%
                        </div>
                    </div>
                </div>

                <div class="project-card-actions">
                    <a href="/project-overview/${p.id || p.projectId}" class="btn btn-primary btn-sm">Übersicht</a>
                    <a href="/project/${p.id || p.projectId}" class="btn btn-secondary btn-sm">Editor</a>
                    <a href="/project-checklist/${p.id || p.projectId}" class="btn btn-secondary btn-sm">Checkliste</a>
                </div>
            </div>
        `;
    }).join('');

    // Add initial project hint if "Beispielprojekt" is present and it was just loaded for the first time
    // Fügen Sie hier eine Null-Prüfung für grid.parentNode hinzu.
    if (projects.some(p => p.projectName === "Beispielprojekt") && !window.currentUser.is_guest && window.hasInitialProjectBeenLoaded) {
        if (grid.parentNode) { // NEU: Prüfung auf grid.parentNode
            const dashboardMessageContainer = document.createElement('div');
            dashboardMessageContainer.className = 'info-card dashboard-hint'; // Use info-card for styling
            dashboardMessageContainer.innerHTML = `
                <h3>Willkommen beim Projektplaner!</h3>
                <p>Dies ist Ihr erstes Projekt, das "Beispielprojekt". Sie können es bearbeiten, um die Funktionen kennenzulernen,
                oder ein <a href="#" id="create-new-project-from-template-hint">neues Projekt aus einer Vorlage erstellen</a>
                oder ein <a href="#" id="create-blank-project-hint">leeres Projekt starten</a>.</p>
            `;
            grid.parentNode.insertBefore(dashboardMessageContainer, grid);

            document.getElementById('create-new-project-from-template-hint')?.addEventListener('click', (e) => {
                e.preventDefault();
                createNewProject(true); // Call with flag for template selection
            });
            document.getElementById('create-blank-project-hint')?.addEventListener('click', (e) => {
                e.preventDefault();
                createNewProject(false); // Call with flag for blank project
            });
            window.debugLog("Dashboard: Beispielprojekt-Hinweis angezeigt.");
        } else {
            console.warn("Dashboard: grid.parentNode ist null, kann Beispielprojekt-Hinweis nicht einfügen.");
            window.debugLog("Dashboard: grid.parentNode ist null, kann Beispielprojekt-Hinweis nicht einfügen.");
        }
    }
    window.debugLog("Dashboard: Projekt-Grid gerendert.");
}

/**
 * Erstellt das initiale Beispielprojekt beim ersten Besuch eines angemeldeten Benutzers.
 */
async function createInitialProject() {
    window.debugLog("Dashboard: Versuche initiales Projekt zu erstellen.");
    try {
        const response = await window.db.getInitialProjectContent();
        if (response.error) {
            showInfoModal('Fehler', `Fehler beim Laden des Beispielprojekts: ${response.error}`);
            window.debugLog("Dashboard: Fehler beim Laden des Beispielprojekts.", response.error);
            return;
        }

        const initialProject = {
            projectId: "initial_bsp_project", // Use a fixed ID for the initial project
            projectName: response.projectName || "Beispielprojekt",
            phases: response.data?.phases || response.phases || [] // Use phases from template
        };

        const createResponse = await window.db.createProject(initialProject);
        if (!createResponse.ok) {
            showInfoModal('Fehler', 'Das initiale Beispielprojekt konnte nicht automatisch erstellt werden.');
            window.debugLog("Dashboard: Initiales Beispielprojekt konnte nicht erstellt werden.", createResponse);
        } else {
            window.debugLog("Dashboard: Initiales Beispielprojekt erfolgreich erstellt.");
        }
    } catch (error) {
        console.error("Error creating initial project:", error);
        showInfoModal('Fehler', 'Ein Fehler ist beim automatischen Erstellen des Beispielprojekts aufgetreten.');
        window.debugLog("Dashboard: Allgemeiner Fehler beim Erstellen des initialen Projekts.", error);
    }
}

/**
 * Startet den Projekterstellungsprozess, optional mit Vorlagenauswahl.
 * @param {boolean} [showTemplateSelection=false] If true, shows template selection modal.
 */
export async function createNewProject(showTemplateSelection = false) {
    window.debugLog(`Dashboard: Starte neues Projekt. Vorlagenauswahl: ${showTemplateSelection}`);
    if (showTemplateSelection) {
        const templates = await window.db.getTemplates();
        if (templates.error) {
            showInfoModal('Fehler', `Vorlagen konnten nicht geladen werden: ${templates.error}`);
            window.debugLog("Dashboard: Vorlagen konnten nicht geladen werden.", templates.error);
            return;
        }

        showTemplateSelectionModal('Neues Projekt erstellen', templates, async (selectedOption) => {
            if (!selectedOption) {
                window.debugLog("Dashboard: Projekterstellung abgebrochen (Vorlagenauswahl).");
                return; // User cancelled
            }

            let newProjectData = {};
            let projectNamePrompt = '';

            if (selectedOption === 'blank') {
                projectNamePrompt = 'Wie soll Ihr neues leeres Projekt heißen?';
                newProjectData.phases = [];
                window.debugLog("Dashboard: Leeres Projekt ausgewählt.");
            } else {
                const templateContent = await window.db.getTemplateContent(selectedOption);
                if (templateContent.error) {
                    showInfoModal('Fehler', `Inhalt der Vorlage konnte nicht geladen werden: ${templateContent.error}`);
                    window.debugLog("Dashboard: Inhalt der Vorlage konnte nicht geladen werden.", templateContent.error);
                    return;
                }
                newProjectData.phases = templateContent.data?.phases || templateContent.phases || [];
                projectNamePrompt = `Name für das Projekt (Vorlage: ${templateContent.name || selectedOption}):`;
                window.debugLog(`Dashboard: Vorlage "${selectedOption}" ausgewählt.`);
            }

            showPromptModal('Projektname', projectNamePrompt, '', async (projectName) => {
                if (!projectName || projectName.trim() === '') {
                    if (projectName !== null) {
                        showInfoModal('Info', 'Projektname darf nicht leer sein.');
                        window.debugLog("Dashboard: Projektname war leer.");
                    } else {
                        window.debugLog("Dashboard: Projekterstellung abgebrochen (Projektnameingabe).");
                    }
                    return;
                }

                const finalProject = {
                    projectId: `proj_${Date.now()}`,
                    projectName: projectName.trim(),
                    phases: newProjectData.phases
                };

                const response = await window.db.createProject(finalProject);
                if (response.ok) {
                    const createdProject = await response.json();
                    window.location.href = `/project/${createdProject.projectId}`;
                    window.debugLog("Dashboard: Projekt erfolgreich erstellt und weitergeleitet.", createdProject);
                } else {
                    showInfoModal('Fehler', 'Das Projekt konnte nicht erstellt werden.');
                    window.debugLog("Dashboard: Projekt konnte nicht erstellt werden.", response);
                }
            });
        });

    } else { // Create a blank project immediately
        showPromptModal('Neues leeres Projekt erstellen', 'Wie soll Ihr neues leeres Projekt heißen?', '', async (projectName) => {
            if (!projectName || projectName.trim() === '') {
                if (projectName !== null) {
                    showInfoModal('Info', 'Projektname darf nicht leer sein.');
                    window.debugLog("Dashboard: Projektname war leer (leeres Projekt).");
                } else {
                    window.debugLog("Dashboard: Projekterstellung abgebrochen (leeres Projekt, Nameingabe).");
                }
                return;
            }

            const newProject = {
                projectId: `proj_${Date.now()}`,
                projectName: projectName.trim(),
                phases: []
            };

            const response = await window.db.createProject(newProject);
            if (response.ok) {
                const createdProject = await response.json();
                window.location.href = `/project/${createdProject.projectId}`;
                window.debugLog("Dashboard: Leeres Projekt erfolgreich erstellt und weitergeleitet.", createdProject);
            } else {
                showInfoModal('Fehler', 'Das Projekt konnte nicht erstellt werden.');
                window.debugLog("Dashboard: Leeres Projekt konnte nicht erstellt werden.", response);
            }
        });
    }
}
