"use strict";

// =================================================================
// INFO LOGIK
// =================================================================
// Dieses Modul enthält die Logik für die Info-Seite.
// Derzeit nur grundlegende Akkordeon-Funktionalität.

/**
 * Richtet die Info-Seite ein.
 * Fügt Event-Listener für Akkordeon-Elemente hinzu.
 */
export function setupInfoPage() {
    // Akkordeon-Funktionalität für Info-Karten
    document.querySelectorAll('.info-card .accordion-toggle').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const content = this.nextElementSibling;
            if (content.classList.contains('open')) {
                content.classList.remove('open');
                content.style.maxHeight = null;
                this.classList.remove('open');
            } else {
                // Optional: Alle anderen Akkordeons schließen
                document.querySelectorAll('.info-card-content.open').forEach(openContent => {
                    openContent.classList.remove('open');
                    openContent.style.maxHeight = null;
                    openContent.previousElementSibling.classList.remove('open');
                });

                content.classList.add('open');
                content.style.maxHeight = content.scrollHeight + "px"; // Höhe dynamisch setzen
                this.classList.add('open');
            }
        });
    });

    // Formular-Handling für Support (Beispiel)
    const supportForm = document.getElementById('support-form');
    if (supportForm) {
        supportForm.addEventListener('submit', function(e) {
            e.preventDefault();
            // Hier würde die Logik zum Senden des Formulars an ein Backend stehen
            // Für dieses Beispiel zeigen wir nur ein Info-Modal
            window.showInfoModal('Support-Anfrage gesendet', 'Vielen Dank für Ihre Nachricht! Wir werden uns in Kürze bei Ihnen melden.');
            supportForm.reset();
        });
    }
}
