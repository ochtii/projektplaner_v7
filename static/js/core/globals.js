"use strict";

// =================================================================
// GLOBALE ZUSTANDSVARIABLEN
// =================================================================
// Diese Variablen speichern den globalen Zustand der Anwendung.
// Sie werden in main.js importiert und dann über das window-Objekt
// anderen Modulen zugänglich gemacht, um zirkuläre Abhängigkeiten
// bei Imports zu vermeiden und eine einfache globale Verfügbarkeit
// zu gewährleisten (ähnlich einem zentralen Store in kleineren Apps).

export let currentProjectData = null;
export let currentProjectId = null;
export let currentlySelectedItem = null;
export let currentlySelectedType = null;
export let db = null; // Wird in main.js initialisiert (apiDb oder guestDb)
export let currentUser = null; // Wird in main.js nach Session-Check initialisiert
export let globalSettings = {}; // Wird in main.js nach Global-Settings-Check initialisiert
export let hasInitialProjectBeenLoaded = false; // Flag für Initialprojekt-Logik
