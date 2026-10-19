// ==========================================================
// Fächer, Lehrkräfte und Stundenplan
//
// Hier stehen KEINE persönlichen Daten mehr. Der Stundenplan liegt im
// Speicher des Browsers (Schlüssel "lb-stundenplan") – genau wie Hausaufgaben
// und Noten. Er kommt per Stundenplan-Datei oder Backup in die App:
// Einstellungen → Wiederherstellen.
//
// Mein eigener Stundenplan liegt als Datei in persoenlich/mein-stundenplan.json
// (nur im privaten Projekt, nicht im öffentlichen).
// ==========================================================

const STUNDENPLAN_SCHLUESSEL = "lb-stundenplan";

// Liest den gespeicherten Stundenplan. Gibt null zurück, wenn es noch keinen gibt.
function gespeicherterStundenplan() {
  try {
    const daten = JSON.parse(localStorage.getItem(STUNDENPLAN_SCHLUESSEL));
    if (daten && daten.faecher && Object.keys(daten.faecher).length) return daten;
  } catch (fehler) {
    // Kein Speicher oder kaputte Daten – dann startet die App ohne Stundenplan
  }
  return null;
}

const MEIN_STUNDENPLAN = gespeicherterStundenplan();

// Alle Fächer, z. B. { deutsch: { name, kuerzel, kurs, lehrer }, … }
const FAECHER = MEIN_STUNDENPLAN ? MEIN_STUNDENPLAN.faecher : {};

// Die Zeiten der Schulstunden, z. B. [{ nr: 1, start: "07:55", ende: "09:00" }, …]
const STUNDEN = MEIN_STUNDENPLAN ? MEIN_STUNDENPLAN.stunden || [] : [];

// Der Plan: 1 = Montag … 5 = Freitag, jede Stunde als [Fach, Raum] oder null für frei
const STUNDENPLAN = MEIN_STUNDENPLAN ? MEIN_STUNDENPLAN.plan || {} : {};

function hatStundenplan() {
  return Object.keys(FAECHER).length > 0;
}
