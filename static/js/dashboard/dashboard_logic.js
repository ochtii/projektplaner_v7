"use strict";

// =================================================================
// DASHBOARD LOGIK
// =================================================================
// Dieses Modul enthält die Logik für die Dashboard-Seite,
// einschließlich der Anzeige von Projekten und der Erstellung neuer Projekte.

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

    grid.innerHTML = projects.map(p => `
        <div class="project-card">
            <h3>${p.name || p.projectName}</h3>
            <div class="project-card-actions">
                <a href="/project/${p.id || p.projectId}" class="btn btn-primary">Öffnen</a>
            </div>
        </div>
    `).join('');

    // Hinweis für das initiale Projekt anzeigen, wenn es gerade geladen wurde
    if (projects.some(p => p.projectName === "Beispielprojekt") && !window.currentUser.is_guest && window.hasInitialProjectBeenLoaded) {
        const dashboardMessageContainer = document.createElement('div');
        dashboardMessageContainer.className = 'info-card dashboard-hint'; // Styling mit info-card
        dashboardMessageContainer.innerHTML = `
            <h3>Willkommen beim Projektplaner!</h3>
            <p>Dies ist Ihr erstes Projekt, das "Beispielprojekt". Sie können es bearbeiten, um die Funktionen kennenzulernen,
            oder ein <a href="#" id="create-new-project-from-template-hint">neues Projekt aus einer Vorlage erstellen</a>
            oder ein <a href="#" id="create-blank-project-hint">leeres Projekt starten</a>.</p>
        `;
        // Füge den Hinweis vor dem Projekt-Grid ein
        grid.parentNode.insertBefore(dashboardMessageContainer, grid);

        document.getElementById('create-new-project-from-template-hint')?.addEventListener('click', (e) => {
            e.preventDefault();
            createNewProject(true); // Ruft createNewProject mit Vorlagenauswahl auf
        });
        document.getElementById('create-blank-project-hint')?.addEventListener('click', (e) => {
            e.preventDefault();
            createNewProject(false); // Ruft createNewProject für leeres Projekt auf
        });
    }
}

/**
 * Erstellt das initiale Beispielprojekt beim ersten Besuch eines angemeldeten Benutzers.
 */
async function createInitialProject() {
    try {
        // Ruft window.db auf
        const response = await window.db.getInitialProjectContent();
        if (response.error) {
            window.showInfoModal('Fehler', `Fehler beim Laden des Beispielprojekts: ${response.error}`);
            return;
        }

        const initialProject = {
            projectId: "initial_bsp_project", // Feste ID für das initiale Projekt
            projectName: response.projectName || "Beispielprojekt",
            phases: response.phases || [] // Phasen aus der Vorlage übernehmen
        };

        const createResponse = await window.db.createProject(initialProject);
        if (!createResponse.ok) {
            window.showInfoModal('Fehler', 'Das initiale Beispielprojekt konnte nicht automatisch erstellt werden.');
        }
    } catch (error) {
        console.error("Fehler beim Erstellen des initialen Projekts:", error);
        window.showInfoModal('Fehler', 'Ein Fehler ist beim automatischen Erstellen des Beispielprojekts aufgetreten.');
    }
}

/**
 * Startet den Projekterstellungsprozess, optional mit Vorlagenauswahl.
 * @param {boolean} [showTemplateSelection=false] Wenn true, wird das Modal zur Vorlagenauswahl angezeigt.
 */
export async function createNewProject(showTemplateSelection = false) {
    if (showTemplateSelection) {
        // Ruft window.db auf
        const templates = await window.db.getTemplates();
        if (templates.error) {
            window.showInfoModal('Fehler', `Vorlagen konnten nicht geladen werden: ${templates.error}`);
            return;
        }

        // Ruft showTemplateSelectionModal auf
        window.showTemplateSelectionModal('Neues Projekt erstellen', templates, async (selectedOption) => {
            if (!selectedOption) return; // Benutzer hat abgebrochen

            let newProjectData = {};
            let projectNamePrompt = '';

            if (selectedOption === 'blank') {
                projectNamePrompt = 'Wie soll Ihr neues leeres Projekt heißen?';
                newProjectData.phases = [];
            } else {
                // Ruft window.db auf
                const templateContent = await window.db.getTemplateContent(selectedOption);
                if (templateContent.error) {
                    window.showInfoModal('Fehler', `Inhalt der Vorlage konnte nicht geladen werden: ${templateContent.error}`);
                    return;
                }
                newProjectData.phases = templateContent.data?.phases || templateContent.phases || [];
                projectNamePrompt = `Name für das Projekt (Vorlage: ${templateContent.name || selectedOption}):`;
            }

            // Ruft showPromptModal auf
            window.showPromptModal('Projektname', projectNamePrompt, '', async (projectName) => {
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

                // Ruft window.db auf
                const response = await window.db.createProject(finalProject);
                if (response.ok) {
                    const createdProject = await response.json();
                    window.location.href = `/project/${createdProject.projectId}`;
                } else {
                    window.showInfoModal('Fehler', 'Das Projekt konnte nicht erstellt werden.');
                }
            });
        });

    } else { // Sofort ein leeres Projekt erstellen
        // Ruft showPromptModal auf
        window.showPromptModal('Neues leeres Projekt erstellen', 'Wie soll Ihr neues leeres Projekt heißen?', '', async (projectName) => {
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

            // Ruft window.db auf
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
