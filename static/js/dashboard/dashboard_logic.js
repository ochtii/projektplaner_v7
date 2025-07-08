"use strict";

// =================================================================
// DASHBOARD LOGIK
// =================================================================
// Dieses Modul enthält die Logik für die Dashboard-Seite,
// einschließlich der Anzeige von Projekten und der Erstellung neuer Projekte.

// Importiere Modal-Funktionen direkt
import { showTemplateSelectionModal, showPromptModal } from '../ui/modals.js';

/**
 * Richtet die Dashboard-Seite ein.
 * Initialisiert Event-Listener und rendert das Projekt-Grid.
 */
export async function setupDashboardPage() {
    document.getElementById('create-project-btn')?.addEventListener('click', () => createNewProject(true)); // Ruft createNewProject mit Vorlagenauswahl auf
    await renderProjectGrid(); // Stellt sicher, dass Projekte geladen sind, bevor weitergemacht wird
}

/**
 * Rendert das Projekt-Grid auf dem Dashboard.
 * Zeigt vorhandene Projekte an oder einen Hinweis, wenn keine vorhanden sind.
 * Implementiert auch die Logik für das initiale Beispielprojekt.
 */
export async function renderProjectGrid() {
    const grid = document.getElementById('project-grid');
    if (!grid) return;

    grid.innerHTML = '<p>Lade Projekte...</p>';
    // Greift auf window.db und window.currentUser zu
    const projects = await window.db.getProjects();

    // Logik für das initiale Beispielprojekt beim ersten Besuch
    // (Nur für angemeldete Benutzer, nicht für Gäste)
    if (projects.length === 0 && !window.currentUser.is_guest && !window.hasInitialProjectBeenLoaded) {
        await createInitialProject();
        window.hasInitialProjectBeenLoaded = true; // Flag setzen
        await renderProjectGrid(); // Grid neu rendern, um das neue Projekt anzuzeigen
        return;
    }

    if (!projects || projects.length === 0) {
        grid.innerHTML = '<p>Sie haben noch keine Projekte erstellt. Klicken Sie oben auf "Neues Projekt erstellen", um loszulegen.</p>';
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
    if (projects.some(p => p.projectName === "Beispielprojekt") && !window.currentUser.is_guest && window.hasInitialProjectBeenLoaded) {
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
    }
}

/**
 * Erstellt das initiale Beispielprojekt beim ersten Besuch eines angemeldeten Benutzers.
 */
async function createInitialProject() {
    try {
        const response = await window.db.getInitialProjectContent();
        if (response.error) {
            window.showInfoModal('Fehler', `Fehler beim Laden des Beispielprojekts: ${response.error}`);
            return;
        }

        const initialProject = {
            projectId: "initial_bsp_project", // Use a fixed ID for the initial project
            projectName: response.projectName || "Beispielprojekt",
            phases: response.data?.phases || response.phases || [] // Use phases from template
        };

        const createResponse = await window.db.createProject(initialProject);
        if (!createResponse.ok) {
            window.showInfoModal('Fehler', 'Das initiale Beispielprojekt konnte nicht automatisch erstellt werden.');
        }
    } catch (error) {
        console.error("Error creating initial project:", error);
        window.showInfoModal('Fehler', 'Ein Fehler ist beim automatischen Erstellen des Beispielprojekts aufgetreten.');
    }
}

/**
 * Startet den Projekterstellungsprozess, optional mit Vorlagenauswahl.
 * @param {boolean} [showTemplateSelection=false] If true, shows template selection modal.
 */
export async function createNewProject(showTemplateSelection = false) {
    if (showTemplateSelection) {
        const templates = await window.db.getTemplates();
        if (templates.error) {
            window.showInfoModal('Fehler', `Vorlagen konnten nicht geladen werden: ${templates.error}`);
            return;
        }

        // Direkter Aufruf der importierten Funktion
        showTemplateSelectionModal('Neues Projekt erstellen', templates, async (selectedOption) => {
            if (!selectedOption) return; // User cancelled

            let newProjectData = {};
            let projectNamePrompt = '';

            if (selectedOption === 'blank') {
                projectNamePrompt = 'Wie soll Ihr neues leeres Projekt heißen?';
                newProjectData.phases = [];
            } else {
                const templateContent = await window.db.getTemplateContent(selectedOption);
                if (templateContent.error) {
                    window.showInfoModal('Fehler', `Inhalt der Vorlage konnte nicht geladen werden: ${templateContent.error}`);
                    return;
                }
                newProjectData.phases = templateContent.data?.phases || templateContent.phases || [];
                projectNamePrompt = `Name für das Projekt (Vorlage: ${templateContent.name || selectedOption}):`;
            }

            // Direkter Aufruf der importierten Funktion
            showPromptModal('Projektname', projectNamePrompt, '', async (projectName) => {
                if (!projectName || projectName.trim() === '') {
                    if (projectName !== null) {
                        window.showInfoModal('Info', 'Projektname darf nicht leer sein.');
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
                } else {
                    window.showInfoModal('Fehler', 'Das Projekt konnte nicht erstellt werden.');
                }
            });
        });

    } else { // Create a blank project immediately
        // Direkter Aufruf der importierten Funktion
        showPromptModal('Neues leeres Projekt erstellen', 'Wie soll Ihr neues leeres Projekt heißen?', '', async (projectName) => {
            if (!projectName || projectName.trim() === '') {
                if (projectName !== null) {
                    window.showInfoModal('Info', 'Projektname darf nicht leer sein.');
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
            } else {
                window.showInfoModal('Fehler', 'Das Projekt konnte nicht erstellt werden.');
            }
        });
    }
}
