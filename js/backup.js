// ==========================================================
// Lernbegleiter – Datensicherung (Backup)
// Sichert alle Einträge als Datei und spielt sie wieder ein.
// Nutzt Hilfsfunktionen aus app.js, deshalb wird diese Datei nach app.js geladen.
// ==========================================================

const BACKUP_VERSION = 1;
const BACKUP_ZEIT_SCHLUESSEL = "lb-backup-zeit";

// Diese Schlüssel gehören nicht ins Backup
const BACKUP_AUSNAHMEN = [
  "lb-timer", // ein laufender Timer passt nicht zu einem anderen Zeitpunkt
  "lb-demo", // Merker für die Beispieldaten der Vorstellungsseite
  BACKUP_ZEIT_SCHLUESSEL
];

// Das ausgewählte Backup, bis du das Wiederherstellen bestätigst
let wartendesBackup = null;

// ---------- 1. Daten sammeln ----------

function backupSchluessel(speicher) {
  return Object.keys(speicher).filter((s) => s.startsWith("lb-") && !BACKUP_AUSNAHMEN.includes(s));
}

// Alle Einträge der App als Objekt { "lb-hausaufgaben": [...], ... }
function aktuelleDaten() {
  const daten = {};
  try {
    backupSchluessel(localStorage).forEach((schluessel) => {
      const roh = localStorage.getItem(schluessel);
      try {
        daten[schluessel] = JSON.parse(roh);
      } catch (fehler) {
        daten[schluessel] = roh;
      }
    });
  } catch (fehler) {
    // Kein Zugriff auf den Speicher – dann gibt es auch nichts zu sichern
  }
  return daten;
}

// Kurze Übersicht, was in einem Datenstand steckt
function backupUebersicht(daten) {
  const anzahl = (schluessel) => (Array.isArray(daten[schluessel]) ? daten[schluessel].length : 0);
  const themen = Object.keys(daten)
    .filter((s) => s.startsWith("lb-themen-"))
    .reduce((summe, s) => summe + (Array.isArray(daten[s]) ? daten[s].length : 0), 0);
  const notizen = Object.keys(daten).filter((s) => s.startsWith("lb-notizen-") && String(daten[s] || "").trim()).length;
  const lernzeit = Object.values(daten["lb-fokus"] || {}).reduce((summe, tag) => summe + ((tag && tag.minuten) || 0), 0);

  return [
    ["Hausaufgaben", anzahl("lb-hausaufgaben")],
    ["Klausuren", anzahl("lb-klausuren")],
    ["Noten", anzahl("lb-noten")],
    ["Quiz-Ergebnisse", anzahl("lb-quiz")],
    ["Fokus-Sitzungen", anzahl("lb-sitzungen")],
    ["Lernthemen", themen],
    ["Notizen", notizen],
    ["Lernzeit", lernzeit ? dauerText(lernzeit) : 0]
  ].filter(([, wert]) => wert);
}

// ---------- 2. Sichern ----------

function backupSichern() {
  const daten = aktuelleDaten();
  if (!Object.keys(daten).length) return zeigeToast("Noch nichts zum Sichern – trag zuerst etwas ein.");

  const backup = { app: "lernbegleiter", version: BACKUP_VERSION, erstellt: new Date().toISOString(), daten };
  const datei = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const adresse = URL.createObjectURL(datei);

  // Ein unsichtbarer Download-Link, der sich selbst anklickt
  const link = document.createElement("a");
  link.href = adresse;
  link.download = `lernbegleiter-backup-${datumKey(new Date())}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(adresse), 2000);

  speichern(BACKUP_ZEIT_SCHLUESSEL, Date.now());
  backupBereichAktualisieren();
  zeigeToast("Backup gespeichert – im Ordner Downloads");
}

// ---------- 3. Datei prüfen ----------

// Gibt { ok: true, backup, schluessel } oder { ok: false, fehler } zurück
function backupPruefen(text) {
  let backup;
  try {
    backup = JSON.parse(text);
  } catch (fehler) {
    return { ok: false, fehler: "Diese Datei lässt sich nicht lesen. Wähle eine Datei, die mit „lernbegleiter-backup“ beginnt." };
  }

  // Eine Stundenplan-Datei ersetzt nur den Stundenplan, nicht alle Daten
  if (backup && backup.app === "lernbegleiter" && backup.inhalt === "stundenplan") {
    return stundenplanPruefen(backup);
  }

  if (!backup || backup.app !== "lernbegleiter" || !backup.daten || typeof backup.daten !== "object" || Array.isArray(backup.daten)) {
    return { ok: false, fehler: "Das ist kein Backup vom Lernbegleiter. Wähle eine Datei, die mit „lernbegleiter-backup“ beginnt." };
  }
  if (backup.version > BACKUP_VERSION) {
    return { ok: false, fehler: "Dieses Backup stammt aus einer neueren Version der App. Aktualisiere zuerst die App." };
  }

  const schluessel = backupSchluessel(backup.daten);
  if (!schluessel.length) return { ok: false, fehler: "Das Backup ist leer, es gibt nichts wiederherzustellen." };

  return { ok: true, art: "backup", backup, schluessel };
}

// Prüft eine Stundenplan-Datei: Fächer, Stundenzeiten und Plan müssen zusammenpassen
function stundenplanPruefen(datei) {
  const sp = datei.stundenplan;
  const fehler = (text) => ({ ok: false, fehler: `Die Stundenplan-Datei ist fehlerhaft: ${text}` });

  if (!sp || typeof sp !== "object") return fehler("Der Stundenplan fehlt.");
  if (!sp.faecher || typeof sp.faecher !== "object" || !Object.keys(sp.faecher).length) return fehler("Es sind keine Fächer eingetragen.");
  for (const [id, fach] of Object.entries(sp.faecher)) {
    if (!fach || !fach.name || !fach.kuerzel) return fehler(`Beim Fach „${id}“ fehlen Name oder Kürzel.`);
  }

  if (!Array.isArray(sp.stunden) || !sp.stunden.length) return fehler("Die Stundenzeiten fehlen.");
  const zeitRichtig = (zeit) => /^\d{2}:\d{2}$/.test(zeit);
  if (sp.stunden.some((s) => !s || !zeitRichtig(s.start) || !zeitRichtig(s.ende))) return fehler("Eine Stundenzeit ist nicht im Format 07:55.");

  if (!sp.plan || typeof sp.plan !== "object") return fehler("Der Wochenplan fehlt.");
  for (const [tag, stunden] of Object.entries(sp.plan)) {
    if (!Array.isArray(stunden)) return fehler(`Der Tag ${tag} ist keine Liste.`);
    const unbekannt = stunden.find((e) => e && !sp.faecher[e[0]]);
    if (unbekannt) return fehler(`Im Plan steht das unbekannte Fach „${unbekannt[0]}“.`);
  }

  return { ok: true, art: "stundenplan", backup: datei, stundenplan: sp };
}

// ---------- 4. Wiederherstellen ----------

function backupDateiWaehlen() {
  const feld = $("#backup-datei");
  feld.value = ""; // damit dieselbe Datei auch zweimal hintereinander gewählt werden kann
  feld.click();
}

async function backupDateiGewaehlt(datei) {
  if (!datei) return;
  if (datei.size > 5 * 1024 * 1024) return backupMeldung("Die Datei ist zu groß für ein Lernbegleiter-Backup.");

  const ergebnis = backupPruefen(await datei.text());
  if (!ergebnis.ok) return backupMeldung(ergebnis.fehler);

  backupMeldung("");
  wartendesBackup = ergebnis;
  if (ergebnis.art === "stundenplan") oeffneStundenplanSheet();
  else oeffneBackupSheet();
}

// Nach dem Neuladen eine kurze Rückmeldung zeigen
function nachNeuladenMelden(text) {
  try {
    sessionStorage.setItem("lb-meldung", text);
  } catch (fehler) {
    // Dann eben ohne Meldung
  }
  location.reload();
}

function oeffneStundenplanSheet() {
  const sp = wartendesBackup.stundenplan;
  const anzahlFaecher = Object.keys(sp.faecher).length;
  const anzahlStunden = Object.values(sp.plan).reduce((summe, tag) => summe + (tag || []).filter(Boolean).length, 0);
  const zeiten = `${sp.stunden[0].start} – ${sp.stunden[sp.stunden.length - 1].ende}`;
  zustand.sheet = "backup";

  const sheet = $("#sheet");
  sheet.innerHTML = `
    ${sheetKopfHtml("Stundenplan laden")}
    <span class="feld-titel">Das steckt drin</span>
    <div class="liste">
      <div class="infozeile"><span>Fächer</span><span>${anzahlFaecher}</span></div>
      <div class="infozeile"><span>Stunden pro Woche</span><span>${anzahlStunden}</span></div>
      <div class="infozeile"><span>Unterricht</span><span>${esc(zeiten)}</span></div>
    </div>
    <div class="chips stundenplan-faecher">
      ${Object.values(sp.faecher).map((f) => `<span class="chip">${esc(f.kurzname || f.name)}</span>`).join("")}
    </div>

    <p class="backup-warnung">${hatStundenplan()
      ? "Dein bisheriger Stundenplan wird ersetzt. Hausaufgaben, Noten und alles andere bleiben erhalten."
      : "Hausaufgaben, Noten und alles andere bleiben erhalten."}</p>

    <div class="quiz-knoepfe">
      <button type="button" class="knopf breit drueckbar" data-aktion="stundenplan-uebernehmen">Stundenplan übernehmen</button>
    </div>`;
  sheet.setAttribute("aria-label", "Stundenplan laden");
  sheet.setAttribute("aria-hidden", "false");
  sheet.scrollTop = 0;
  requestAnimationFrame(() => {
    sheet.classList.add("offen");
    $("#sheet-hintergrund").classList.add("offen");
  });
}

function stundenplanUebernehmen() {
  if (!wartendesBackup || wartendesBackup.art !== "stundenplan") return;
  try {
    localStorage.setItem(STUNDENPLAN_SCHLUESSEL, JSON.stringify(wartendesBackup.stundenplan));
  } catch (fehler) {
    return backupMeldung("Speichern hat nicht geklappt: Der Browser erlaubt kein Speichern (z. B. im privaten Fenster).");
  }
  nachNeuladenMelden("Stundenplan geladen");
}

function backupMeldung(text) {
  const feld = $("#backup-meldung");
  if (!feld) return text && zeigeToast(text);
  feld.textContent = text;
  if (text) {
    feld.classList.remove("wackeln");
    void feld.offsetWidth;
    feld.classList.add("wackeln");
  }
}

function backupDatumText(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return "unbekanntem Datum";
  return `${d.getDate()}. ${MONATE[d.getMonth()]} ${d.getFullYear()}, ${zeitText(jetztInMinuten(d))} Uhr`;
}

function oeffneBackupSheet() {
  const { backup } = wartendesBackup;
  const inhalt = backupUebersicht(backup.daten);
  const hatAktuelleDaten = Object.keys(aktuelleDaten()).length > 0;
  zustand.sheet = "backup";

  const sheet = $("#sheet");
  sheet.innerHTML = `
    ${sheetKopfHtml("Daten wiederherstellen")}
    <p class="backup-herkunft">Backup vom <strong>${esc(backupDatumText(backup.erstellt))}</strong></p>

    <span class="feld-titel">Das steckt drin</span>
    <div class="liste">
      ${inhalt.length
        ? inhalt.map(([name, wert]) => `<div class="infozeile"><span>${name}</span><span>${esc(wert)}</span></div>`).join("")
        : '<div class="infozeile"><span>Einstellungen</span><span>Farbschema, Name, Lernplan</span></div>'}
    </div>

    <p class="backup-warnung">Deine aktuellen Daten in dieser App werden dabei durch das Backup ersetzt.</p>

    <div class="quiz-knoepfe">
      ${hatAktuelleDaten ? '<button type="button" class="knopf breit zweit drueckbar" data-aktion="backup-sichern">Erst aktuelle Daten sichern</button>' : ""}
      <button type="button" class="knopf breit drueckbar" data-aktion="backup-einspielen">Wiederherstellen</button>
    </div>`;
  sheet.setAttribute("aria-label", "Daten wiederherstellen");
  sheet.setAttribute("aria-hidden", "false");
  sheet.scrollTop = 0;
  requestAnimationFrame(() => {
    sheet.classList.add("offen");
    $("#sheet-hintergrund").classList.add("offen");
  });
}

function backupEinspielen() {
  if (!wartendesBackup) return;
  const { backup, schluessel } = wartendesBackup;

  try {
    // Alte Einträge entfernen, dann die aus dem Backup schreiben
    backupSchluessel(localStorage).forEach((s) => localStorage.removeItem(s));
    schluessel.forEach((s) => localStorage.setItem(s, JSON.stringify(backup.daten[s])));
  } catch (fehler) {
    return backupMeldung("Wiederherstellen hat nicht geklappt: Der Browser erlaubt kein Speichern (z. B. im privaten Fenster).");
  }

  // Neu laden, damit auch ein neuer Stundenplan überall ankommt
  nachNeuladenMelden("Daten wiederhergestellt");
}

// ---------- 5. Bereich in den Einstellungen ----------

function letzteSicherungText() {
  const zeit = laden(BACKUP_ZEIT_SCHLUESSEL, null);
  if (!zeit) return "Noch nie";
  const tage = tageBis(datumKey(new Date(zeit)));
  if (tage === 0) return `Heute, ${zeitText(jetztInMinuten(new Date(zeit)))}`;
  if (tage === -1) return "Gestern";
  return `Vor ${-tage} Tagen`;
}

// Erinnern, wenn es Daten gibt, aber seit 14 Tagen (oder noch nie) gesichert wurde
function backupFaellig() {
  const zeit = laden(BACKUP_ZEIT_SCHLUESSEL, null);
  const hatDaten = Object.keys(aktuelleDaten()).some((s) => s !== "lb-einstellungen" && s !== STUNDENPLAN_SCHLUESSEL);
  return hatDaten && (!zeit || Date.now() - zeit > 14 * 86400000);
}

function backupBereichHtml() {
  const inhalt = backupUebersicht(aktuelleDaten());
  const eintraege = inhalt.filter(([name]) => name !== "Lernzeit").reduce((summe, [, wert]) => summe + wert, 0);

  return `
    <h2 class="abschnitt stagger" style="--i:7">Datensicherung</h2>
    <div class="stagger" style="--i:7" id="backup-bereich">
      <div class="liste">
        <div class="infozeile"><span>Letzte Sicherung</span><span class="${backupFaellig() ? "backup-faellig" : ""}">${letzteSicherungText()}</span></div>
        <div class="infozeile"><span>Einträge in der App</span><span>${eintraege}</span></div>
      </div>
      <div class="quiz-start-knoepfe">
        <button type="button" class="knopf drueckbar" data-aktion="backup-sichern">Daten sichern</button>
        <button type="button" class="knopf zweit drueckbar" data-aktion="backup-waehlen">Wiederherstellen</button>
      </div>
      <p class="quiz-fehler" id="backup-meldung" role="alert"></p>
      <p class="hinweis">„Daten sichern“ speichert alle Einträge als Datei in deinem Ordner Downloads. Mit „Wiederherstellen“ holst du sie zurück, auch auf einem anderen Gerät. Dort kannst du auch eine Stundenplan-Datei laden.</p>
    </div>`;
}

function backupBereichAktualisieren() {
  const bereich = $("#backup-bereich");
  if (!bereich) return;
  const neu = document.createElement("div");
  neu.innerHTML = backupBereichHtml();
  bereich.replaceWith(neu.querySelector("#backup-bereich"));
}

// ---------- 6. Klicks & Eingaben ----------

Object.assign(AKTIONEN, {
  "backup-sichern": () => backupSichern(),
  "backup-waehlen": () => backupDateiWaehlen(),
  "backup-einspielen": () => backupEinspielen(),
  "stundenplan-uebernehmen": () => stundenplanUebernehmen()
});

// Rückmeldung von vor dem Neuladen anzeigen
try {
  const meldung = sessionStorage.getItem("lb-meldung");
  if (meldung) {
    sessionStorage.removeItem("lb-meldung");
    setTimeout(() => zeigeToast(meldung), 400);
  }
} catch (fehler) {
  // Ohne Speicher keine Meldung
}

document.addEventListener("change", (e) => {
  if (e.target.id === "backup-datei") backupDateiGewaehlt(e.target.files[0]);
});
