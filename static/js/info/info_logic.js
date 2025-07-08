// ochtii/projektplaner_v7/projektplaner_v7-55c8a693a05caeff31bc85b526881ea8deee5951/static/js/info/info_logic.js
"use strict";

// =================================================================
// INFO LOGIK
// =================================================================
// Dieses Modul enthält die Logik für die Info-Seite.
// Es verwaltet die Akkordeon-Funktionalität für die Info-Karten.

import { showInfoModal } from '../ui/modals.js'; // showInfoModal hinzugefügt

/**
 * Richtet die Info-Seite ein.
 * Fügt Event-Listener für Akkordeon-Elemente hinzu.
 */
export function setupInfoPage() {
    // Akkordeon-Funktionalität für Info-Karten
    document.querySelectorAll('.info-card .accordion-toggle').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const content = this.nextElementSibling; // Der Inhalt, der geklappt werden soll
            const isCurrentlyOpen = content.classList.contains('open');

            // Schließe zuerst alle anderen offenen Akkordeons
            document.querySelectorAll('.info-card-content.open').forEach(openContent => {
                openContent.classList.remove('open');
                openContent.style.maxHeight = null; // Max-Height zurücksetzen
                openContent.previousElementSibling.classList.remove('open'); // Toggle-Header-Klasse entfernen
            });

            // Wenn das geklickte Akkordeon nicht bereits offen war, öffne es
            if (!isCurrentlyOpen) {
                content.classList.add('open');
                // Setze max-height auf einen großen Wert, um die Animation zu ermöglichen
                // und sicherzustellen, dass der Inhalt nicht abgeschnitten wird.
                content.style.maxHeight = "2000px"; // Ein großer, fester Wert
                this.classList.add('open'); // Füge Klasse zum Toggle-Header hinzu
            }
            // Wenn es bereits offen war und wir es gerade geschlossen haben (durch den ersten Block),
            // dann wird hier nichts mehr gemacht, es bleibt geschlossen.
        });
    });

    // Formular-Handling für Support (Beispiel)
    const supportForm = document.getElementById('support-form');
    if (supportForm) {
        supportForm.addEventListener('submit', function(e) {
            e.preventDefault();
            // Hier würde die Logik zum Senden des Formulars an ein Backend stehen
            // Für dieses Beispiel zeigen wir nur ein Info-Modal
            showInfoModal('Support-Anfrage gesendet', 'Vielen Dank für Ihre Nachricht! Wir werden uns in Kürze bei Ihnen melden.'); // window. entfernt
            supportForm.reset();
        });
    }

    // Optional: Wenn die Seite mit einem Hash-Anker geladen wird (z.B. #faq),
    // das entsprechende Akkordeon öffnen.
    const hash = window.location.hash;
    if (hash) {
        const targetElement = document.querySelector(hash);
        if (targetElement && targetElement.classList.contains('info-card')) {
            const toggle = targetElement.querySelector('.accordion-toggle');
            const content = targetElement.querySelector('.info-card-content');
            if (toggle && content && !content.classList.contains('open')) {
                // Simuliere einen Klick, um die Akkordeon-Logik auszulösen
                toggle.click();
            }
        }
    }
}