// ochtii/projektplaner_v7/projektplaner_v7-55c8a693a05caeff31bc85b526881ea8deee5951/static/js/info/info_logic.js
"use strict";

// =================================================================
// INFO LOGIK
// =================================================================
// Dieses Modul enthält die Logik für die Info-Seite.
// Es verwaltet die Akkordeon-Funktionalität für die Info-Karten.

import { showInfoModal } from '../ui/modals.js';

/**
 * Öffnet ein spezifisches Akkordeon-Element und schließt alle anderen.
 * @param {HTMLElement} elementToOpen Das zu öffnende .info-card Element.
 */
function toggleAccordion(elementToOpen) {
    // Schließe zuerst alle anderen offenen Akkordeons
    document.querySelectorAll('.info-card-content.open').forEach(openContent => {
        // Schließe nicht, wenn es das Ziel-Element ist
        if (openContent.parentElement !== elementToOpen) {
            openContent.classList.remove('open');
            openContent.style.maxHeight = null;
            openContent.previousElementSibling.classList.remove('open');
        }
    });

    const content = elementToOpen.querySelector('.info-card-content');
    const toggle = elementToOpen.querySelector('.accordion-toggle');
    
    // Öffne das Ziel-Element, falls es noch nicht offen ist
    if (content && !content.classList.contains('open')) {
        content.classList.add('open');
        content.style.maxHeight = content.scrollHeight + "px"; // Höhe basierend auf Inhalt setzen
        if (toggle) toggle.classList.add('open');
    }
}

/**
 * Richtet die Info-Seite ein.
 * Fügt Event-Listener für Akkordeon-Elemente und die Submenü-Navigation hinzu.
 */
export function setupInfoPage() {
    // Akkordeon-Funktionalität für Klicks auf die Header
    document.querySelectorAll('.info-card .accordion-toggle').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const infoCard = this.parentElement;
            const content = this.nextElementSibling;
            const isCurrentlyOpen = content.classList.contains('open');

            // Schließe alle anderen
            document.querySelectorAll('.info-card-content.open').forEach(openContent => {
                openContent.classList.remove('open');
                openContent.style.maxHeight = null;
                openContent.previousElementSibling.classList.remove('open');
            });

            // Öffne das geklickte Element, wenn es nicht bereits offen war
            if (!isCurrentlyOpen) {
                content.classList.add('open');
                content.style.maxHeight = content.scrollHeight + "px";
                this.classList.add('open');
            }
        });
    });

    // NEU: Logik für die Submenü-Links in der Sidebar
    const infoMenuLinks = document.querySelectorAll('.info-menu .submenu a');
    infoMenuLinks.forEach(link => {
        // Verhindere, dass der AGB-Link diese Logik ausführt
        if (link.getAttribute('href').includes('agb')) {
            return;
        }

        link.addEventListener('click', function(e) {
            e.preventDefault(); // Standard-Anker-Verhalten verhindern
            const targetId = this.getAttribute('href').split('#')[1];
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                // Öffne das entsprechende Akkordeon
                toggleAccordion(targetElement);

                // Scrolle sanft zum Element
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // Formular-Handling für Support (Beispiel)
    const supportForm = document.getElementById('support-form');
    if (supportForm) {
        supportForm.addEventListener('submit', function(e) {
            e.preventDefault();
            showInfoModal('Support-Anfrage gesendet', 'Vielen Dank für Ihre Nachricht! Wir werden uns in Kürze bei Ihnen melden.');
            supportForm.reset();
        });
    }

    // Optional: Wenn die Seite mit einem Hash-Anker geladen wird,
    // das entsprechende Akkordeon öffnen und hinscrollen.
    const hash = window.location.hash;
    if (hash) {
        const targetElement = document.querySelector(hash);
        if (targetElement && targetElement.classList.contains('info-card')) {
            // Kurze Verzögerung, um sicherzustellen, dass alles geladen ist
            setTimeout(() => {
                toggleAccordion(targetElement);
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }
}
