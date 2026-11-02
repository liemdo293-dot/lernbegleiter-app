// ==========================================================
// Lernbegleiter – die Logik der App
// Die Daten (Fächer, Stundenplan) stehen in js/daten.js.
// ==========================================================

const WOCHENTAGE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const TAG_KURZ = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const MONATE_KURZ = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."];
const ANSICHTEN = ["heute", "woche", "aufgaben", "klausuren", "faecher", "fokus"];
const ANSICHT_NAMEN = { heute: "Heute", woche: "Woche", aufgaben: "Aufgaben", klausuren: "Klausuren", faecher: "Fächer", fokus: "Fokus" };

// Unter diesen Namen speichert die App ihre Daten im Browser
const HA_SCHLUESSEL = "lb-hausaufgaben";
const KL_SCHLUESSEL = "lb-klausuren";
const EINST_SCHLUESSEL = "lb-einstellungen";
const GELERNT_SCHLUESSEL = "lb-gelernt";
const NO_SCHLUESSEL = "lb-noten";

// Punkte (Index 0–15) → Schulnote
const NOTEN = ["6", "5-", "5", "5+", "4-", "4", "4+", "3-", "3", "3+", "2-", "2", "2+", "1-", "1", "1+"];
const NOTEN_ARTEN = { klausur: "Klausur", somi: "Mitarbeit", test: "Test / Referat" };

// Was gerade in der App los ist
const zustand = {
  ansicht: "heute",
  wochentag: null,
  offenesFach: null,
  einstellungenOffen: false,
  statistikOffen: false,
  anleitungOffen: false, // Anleitung „Apps sperren“ aus js/fokus.js
  statWoche: 0, // 0 = diese Woche, -1 = letzte Woche …
  sheet: null // null, "hausaufgabe", "klausur" oder "note"
};

// Die Auswahl im Fenster von unten (Hausaufgabe, Klausur oder Note)
const blatt = {
  fachId: null,
  modus: "stunde", // Fälligkeit: "stunde", "morgen", "woche" oder "datum"
  faellig: null,
  dauer: 30,
  klDatum: null,
  art: "klausur",
  punkte: null,
  noDatum: null,
  notiz: "",
  klausurId: null
};

const $ = (auswahl) => document.querySelector(auswahl);

// Kleine Symbole als SVG
const SYMBOL = {
  pfeil: '<svg class="pfeil" viewBox="0 0 8 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 1l6 6-6 6"/></svg>',
  zurueck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  haken: '<svg viewBox="0 0 24 24" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  kreuz: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  fertig: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="20"/><path d="M15 24.5l6 6L33 18"/></svg>',
  zahnrad: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4.5" width="4" height="15" rx="1.2"/><rect x="14" y="4.5" width="4" height="15" rx="1.2"/></svg>',
  stopp: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2.5"/></svg>',
  weiter: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 5.5v13a1 1 0 0 0 1.55.83L15.5 13.3v5.2a1 1 0 0 0 2 0v-13a1 1 0 0 0-2 0v5.2L6.55 4.67A1 1 0 0 0 5 5.5z"/></svg>',
  runter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  hakenKlein: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  diagramm: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 20v-7M10 20V5M15 20v-10M20 20v-4"/></svg>',
  links: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  rechts: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  klausur: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M28 6H14a5 5 0 0 0-5 5v26a5 5 0 0 0 5 5h20a5 5 0 0 0 5-5V17z"/><path d="M28 6v11h11M17 26h14M17 34h9"/></svg>'
};

// ---------- Hilfsfunktionen ----------

// "07:55" → 475 (Minuten seit Mitternacht)
function minuten(zeit) {
  const [stunde, minute] = zeit.split(":").map(Number);
  return stunde * 60 + minute;
}

// 475 → "07:55"
function zeitText(min) {
  const stunde = Math.floor(min / 60) % 24;
  return `${String(stunde).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

function jetztInMinuten(datum) {
  return datum.getHours() * 60 + datum.getMinutes();
}

function dauerText(min) {
  if (min < 60) return min + " Min.";
  const std = Math.floor(min / 60);
  const rest = min % 60;
  return rest ? `${std} Std. ${rest} Min.` : `${std} Std.`;
}

// Schützt vor Sonderzeichen, wenn wir Text in HTML einsetzen
function esc(text) {
  return String(text).replace(/[&<>"']/g, (z) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[z]);
}

// Im Browser speichern und laden (klappt nicht überall, z. B. im privaten Fenster)
function laden(schluessel, standard) {
  try {
    const wert = localStorage.getItem(schluessel);
    return wert ? JSON.parse(wert) : standard;
  } catch (fehler) {
    return standard;
  }
}

function speichern(schluessel, wert) {
  try {
    localStorage.setItem(schluessel, JSON.stringify(wert));
  } catch (fehler) {
    // Nicht schlimm – die App funktioniert trotzdem, merkt sich nur nichts
  }
}

function neueId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function kalenderwoche(datum) {
  const d = new Date(Date.UTC(datum.getFullYear(), datum.getMonth(), datum.getDate()));
  const tag = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - tag);
  const jahresanfang = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - jahresanfang) / 86400000 + 1) / 7);
}

// ---------- Einstellungen & Farbschema ----------

function einstellungen() {
  return { theme: "dunkel", name: "", pause: 60, fokus: 25, ...laden(EINST_SCHLUESSEL, {}) };
}

function einstellungAendern(name, wert) {
  speichern(EINST_SCHLUESSEL, { ...einstellungen(), [name]: wert });
}

const hellAbfrage = window.matchMedia("(prefers-color-scheme: light)");

function farbschemaAnwenden(mitUebergang) {
  const modus = einstellungen().theme;
  const hell = modus === "hell" || (modus === "auto" && hellAbfrage.matches);
  const html = document.documentElement;
  if (mitUebergang) {
    html.classList.add("farbwechsel");
    setTimeout(() => html.classList.remove("farbwechsel"), 600);
  }
  html.dataset.theme = hell ? "light" : "dark";
  $('meta[name="theme-color"]').setAttribute("content", hell ? "#f2f2f7" : "#000000");
}

// ---------- Datum ----------

// Ein Datum als Text "2026-10-19" – so lässt es sich leicht speichern und sortieren
function datumKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function keyZuDatum(key) {
  const [jahr, monat, tag] = key.split("-").map(Number);
  return new Date(jahr, monat - 1, tag);
}

function inTagen(anzahl) {
  const d = new Date();
  d.setDate(d.getDate() + anzahl);
  return datumKey(d);
}

// Wie viele Tage bis zu diesem Datum? (0 = heute, 1 = morgen, -1 = gestern)
function tageBis(key) {
  const heute = keyZuDatum(datumKey(new Date()));
  return Math.round((keyZuDatum(key) - heute) / 86400000);
}

function faelligText(key) {
  const n = tageBis(key);
  if (n === 0) return "heute";
  if (n === 1) return "morgen";
  if (n === -1) return "gestern";
  const d = keyZuDatum(key);
  if (n > 1 && n < 7) return WOCHENTAGE[d.getDay()];
  return `${TAG_KURZ[d.getDay()]}, ${d.getDate()}. ${MONATE_KURZ[d.getMonth()]}`;
}

function datumLang(key) {
  const d = keyZuDatum(key);
  return `${WOCHENTAGE[d.getDay()]}, ${d.getDate()}. ${MONATE[d.getMonth()]}`;
}

function countdownText(n) {
  if (n === 0) return "heute";
  if (n === 1) return "morgen";
  return `in ${n} Tagen`;
}

// ---------- Stundenplan auswerten ----------

// Alle Stunden eines Tages (0 = Sonntag … 6 = Samstag) mit allen Infos
function stundenAm(tag) {
  const plan = STUNDENPLAN[tag] || [];
  const stunden = [];
  plan.forEach((eintrag, i) => {
    // Nur Stunden mit bekanntem Fach und bekannter Uhrzeit
    if (eintrag && STUNDEN[i] && FAECHER[eintrag[0]]) {
      stunden.push({ ...STUNDEN[i], tag, fachId: eintrag[0], raum: eintrag[1], fach: FAECHER[eintrag[0]] });
    }
  });
  return stunden;
}

// Alle Stunden eines Fachs in der Woche
function stundenVonFach(id) {
  const alle = [];
  for (let tag = 1; tag <= 5; tag++) {
    alle.push(...stundenAm(tag).filter((s) => s.fachId === id));
  }
  return alle;
}

function naechsterSchultag(tag) {
  for (let abstand = 1; abstand <= 7; abstand++) {
    const t = (tag + abstand) % 7;
    if (stundenAm(t).length) return { tag: t, abstand };
  }
  return null;
}

// Wann hat ein Fach als Nächstes Unterricht?
function naechsteStunde(id) {
  const jetzt = new Date();
  const heute = jetzt.getDay();
  const min = jetztInMinuten(jetzt);

  for (let abstand = 0; abstand <= 7; abstand++) {
    const t = (heute + abstand) % 7;
    const treffer = stundenAm(t).find((s) => s.fachId === id && (abstand > 0 || minuten(s.ende) > min));
    if (treffer) {
      let wann = abstand === 0 ? "Heute" : abstand === 1 ? "Morgen" : WOCHENTAGE[t];
      if (abstand === 0 && minuten(treffer.start) <= min) wann = "Gerade jetzt";
      return { ...treffer, wann };
    }
  }
  return null;
}

// Das Datum der nächsten Stunde eines Fachs ab morgen – der Standard für Hausaufgaben
function naechsterUnterrichtstag(id) {
  const heute = new Date().getDay();
  for (let abstand = 1; abstand <= 7; abstand++) {
    const t = (heute + abstand) % 7;
    if (stundenAm(t).some((s) => s.fachId === id)) return inTagen(abstand);
  }
  return inTagen(1);
}

// Das Datum eines Wochentags in der aktuellen (am Wochenende: der nächsten) Schulwoche
function datumVonWochentag(tag) {
  const heute = new Date().getDay();
  const abstand = heute === 6 ? tag + 1 : tag - heute;
  return inTagen(abstand);
}

// Das Fach, das gerade läuft oder zuletzt war – praktisch beim Eintragen von Hausaufgaben
function aktuellesFach() {
  const jetzt = new Date();
  const min = jetztInMinuten(jetzt);
  const begonnen = stundenAm(jetzt.getDay()).filter((s) => minuten(s.start) <= min);
  return begonnen.length ? begonnen[begonnen.length - 1].fachId : null;
}

function themenVon(id) {
  return laden("lb-themen-" + id, []);
}

// ---------- Hausaufgaben ----------

function hausaufgaben() {
  return laden(HA_SCHLUESSEL, []);
}

function offeneHausaufgaben() {
  return hausaufgaben()
    .filter((a) => !a.erledigt)
    .sort((a, b) => a.faellig.localeCompare(b.faellig) || a.erstellt - b.erstellt);
}

// Gibt es offene Hausaufgaben für dieses Fach an diesem Tag?
function hatHausaufgabe(fachId, key) {
  return hausaufgaben().some((a) => !a.erledigt && a.fachId === fachId && a.faellig === key);
}

// ---------- Klausuren ----------

function klausuren() {
  return laden(KL_SCHLUESSEL, []).sort((a, b) => a.datum.localeCompare(b.datum));
}

function kommendeKlausuren() {
  return klausuren().filter((k) => tageBis(k.datum) >= 0);
}

function naechsteKlausurVon(fachId) {
  return kommendeKlausuren().find((k) => k.fachId === fachId);
}

function hatKlausur(fachId, key) {
  return klausuren().some((k) => k.fachId === fachId && k.datum === key);
}

// ---------- Noten ----------

function noten() {
  return laden(NO_SCHLUESSEL, []).sort((a, b) => b.datum.localeCompare(a.datum) || b.erstellt - a.erstellt);
}

function notenVon(fachId) {
  return noten().filter((n) => n.fachId === fachId);
}

function mittelwert(zahlen) {
  return zahlen.length ? zahlen.reduce((s, z) => s + z, 0) / zahlen.length : null;
}

// 10.25 → "10,3"
function zahlText(zahl) {
  return (Math.round(zahl * 10) / 10).toFixed(1).replace(".", ",");
}

function noteVonPunkten(punkte) {
  return NOTEN[Math.max(0, Math.min(15, Math.round(punkte)))];
}

// Schnitt eines Fachs: Klausuren und Mitarbeit (inkl. Tests) zählen je zur Hälfte
function fachSchnitt(fachId) {
  const liste = notenVon(fachId);
  if (!liste.length) return null;
  const klausur = mittelwert(liste.filter((n) => n.art === "klausur").map((n) => n.punkte));
  const somi = mittelwert(liste.filter((n) => n.art !== "klausur").map((n) => n.punkte));
  const gesamt = klausur !== null && somi !== null ? (klausur + somi) / 2 : klausur !== null ? klausur : somi;
  return { gesamt, klausur, somi, anzahl: liste.length };
}

// Gesamtschnitt: Mittelwert aller Fächer, die schon Noten haben
function gesamtSchnitt() {
  const schnitte = Object.keys(FAECHER).map(fachSchnitt).filter(Boolean).map((s) => s.gesamt);
  return mittelwert(schnitte);
}

// Welche Klausuren wurden heute schon gelernt? (wird jeden Tag neu gezählt)
function gelerntHeute() {
  const gelernt = laden(GELERNT_SCHLUESSEL, {});
  return gelernt.datum === datumKey(new Date()) ? gelernt.ids : [];
}

// ---------- Der Tagesplan ----------
// Sortiert offene Hausaufgaben und Lernblöcke für Klausuren nach Dringlichkeit
// und verteilt sie mit Uhrzeiten auf den Nachmittag.

function tagesplan(jetzt) {
  const heuteKey = datumKey(jetzt);
  const alle = hausaufgaben();
  const gelernt = gelerntHeute();
  const kandidaten = [];

  alle.filter((a) => !a.erledigt).forEach((a) => {
    kandidaten.push({ typ: "ha", prio: Math.max(tageBis(a.faellig), 0) * 10, dauer: a.dauer || 30, aufgabe: a });
  });

  // Lernblöcke: je näher die Klausur, desto länger und wichtiger
  kommendeKlausuren().forEach((k) => {
    const n = tageBis(k.datum);
    if (n < 1 || n > 10) return;
    kandidaten.push({
      typ: "lernen",
      prio: (n - 2) * 10 + 5, // Klausuren wiegen etwas schwerer als normale Hausaufgaben
      dauer: n <= 2 ? 60 : n <= 5 ? 45 : 30,
      klausur: k,
      erledigt: gelernt.includes(k.id)
    });
  });

  kandidaten.sort((a, b) => a.prio - b.prio);

  // Alles Dringende (bis übermorgen) kommt rein, der Rest nur bis ca. 2,5 Stunden
  const ausgewaehlt = [];
  let summe = 0;
  kandidaten.forEach((e) => {
    if (e.prio <= 20 || summe < 150) {
      ausgewaehlt.push(e);
      summe += e.dauer;
    }
  });

  // Startzeit: nach Schulschluss plus Pause – aber nie in der Vergangenheit
  const stunden = stundenAm(jetzt.getDay());
  const jetztGerundet = Math.ceil(jetztInMinuten(jetzt) / 5) * 5;
  const schulende = stunden.length ? minuten(stunden[stunden.length - 1].ende) + einstellungen().pause : 10 * 60;
  const start = Math.max(schulende, jetztGerundet);

  const offen = ausgewaehlt.filter((e) => !e.erledigt);
  let zeit = start;
  offen.forEach((e) => {
    e.start = zeit;
    zeit += e.dauer + 10; // 10 Minuten Pause zwischen den Aufgaben
  });

  // Was heute schon geschafft wurde, steht unten – das motiviert
  const fertig = [
    ...ausgewaehlt.filter((e) => e.erledigt),
    ...alle
      .filter((a) => a.erledigt && a.erledigtAm && datumKey(new Date(a.erledigtAm)) === heuteKey)
      .map((a) => ({ typ: "ha", aufgabe: a, dauer: a.dauer || 30 }))
  ];

  return {
    start,
    ende: zeit - 10,
    offen,
    fertig,
    minuten: offen.reduce((s, e) => s + e.dauer, 0)
  };
}

// ---------- Bausteine (kleine HTML-Stücke) ----------

function monoHtml(fach, gross) {
  const klassen = ["mono", fach.kurs === "Leistungskurs" ? "lk" : "", gross ? "gross" : ""].join(" ");
  return `<span class="${klassen}" aria-hidden="true">${esc(fach.kuerzel)}</span>`;
}

// Markierungen für eine Stunde: Klausur und/oder Hausaufgabe fällig
function markenHtml(fachId, key) {
  if (!key) return "";
  let html = "";
  if (hatKlausur(fachId, key)) html += '<span class="ha-marke klausur-marke">Klausur</span>';
  if (hatHausaufgabe(fachId, key)) html += '<span class="ha-marke" title="Hausaufgabe fällig">HA</span>';
  return html;
}

function zeileHtml(s, jetzt, istHeute, key) {
  const min = jetztInMinuten(jetzt);
  let status = "";
  if (istHeute && min >= minuten(s.ende)) status = "vorbei";
  else if (istHeute && min >= minuten(s.start)) status = "jetzt";

  return `
    <button class="zeile drueckbar ${status}" data-fach="${s.fachId}">
      <span class="zeile-zeit">${s.start}<small>${s.ende}</small></span>
      ${monoHtml(s.fach)}
      <span>
        <span class="zeile-name">${esc(s.fach.name)}${markenHtml(s.fachId, key)}</span>
        <span class="zeile-info">${esc(s.raum)} · ${esc(s.fach.lehrer)}</span>
      </span>
      ${status === "jetzt" ? '<span class="marke">Jetzt</span>' : SYMBOL.pfeil}
    </button>`;
}

// Eine Hausaufgabe. Mit „start“ bekommt sie links eine Uhrzeit (für den Tagesplan).
function aufgabeHtml(a, zeigeFach, start) {
  const fach = FAECHER[a.fachId] || { name: "Allgemein" };
  const n = tageBis(a.faellig);
  const ueberfaellig = !a.erledigt && n < 0;
  const teile = [];
  if (zeigeFach) teile.push(fach.name);
  teile.push(ueberfaellig ? `Überfällig seit ${faelligText(a.faellig)}` : `Fällig ${faelligText(a.faellig)}`);
  // Aufgabe mit fertigem Quiz (js/lernset.js): Fortschritt statt Dauer
  const lernsetName = a.quizSet && typeof lernsetFortschrittText === "function" ? a.quizSet : null;
  if (lernsetName) teile.push(lernsetFortschrittText(lernsetName));
  else if (start !== undefined) teile.push(`${a.dauer || 30} Min.`);

  return `
    <div class="thema aufgabe ${a.erledigt ? "erledigt" : ""} ${ueberfaellig ? "ueberfaellig" : ""}" data-aufgabe="${a.id}">
      ${start !== undefined ? `<span class="plan-zeit">${start === null ? "" : zeitText(start)}</span>` : ""}
      <button class="haken" data-aktion="ha-abhaken" aria-label="Als erledigt markieren" aria-pressed="${a.erledigt}">${SYMBOL.haken}</button>
      <span class="thema-text">${esc(a.text)}<small class="aufgabe-meta">${esc(teile.join(" · "))}</small></span>
      ${lernsetName ? lernsetKnopfHtml(lernsetName) : ""}
      ${start === undefined
        ? `<button class="entfernen" data-aktion="ha-entfernen" aria-label="Hausaufgabe löschen">${SYMBOL.kreuz}</button>`
        : start !== null ? playKnopfHtml() : ""}
    </div>`;
}

function planZeileHtml(e, start) {
  if (e.typ === "ha") return aufgabeHtml(e.aufgabe, true, start);

  const k = e.klausur;
  const fach = FAECHER[k.fachId] || { name: "Klausur" };
  const meta = [`Klausur ${countdownText(tageBis(k.datum))}`, k.thema, `${e.dauer} Min.`].filter(Boolean).join(" · ");
  return `
    <div class="thema aufgabe lernblock ${e.erledigt ? "erledigt" : ""}" data-lernen="${k.id}">
      <span class="plan-zeit">${start === null ? "" : zeitText(start)}</span>
      <button class="haken" data-aktion="lernen-abhaken" aria-label="Als gelernt markieren" aria-pressed="${!!e.erledigt}">${SYMBOL.haken}</button>
      <span class="thema-text">${esc(fach.name)}<small class="aufgabe-meta">${esc(meta)}</small></span>
      ${start !== null ? playKnopfHtml() : ""}
    </div>`;
}

function playKnopfHtml() {
  return `<button class="play-knopf" data-aktion="timer-start" aria-label="Lern-Timer starten">${SYMBOL.play}</button>`;
}

function heroKarte(d) {
  return `
    <button class="hero drueckbar stagger" style="--i:${d.i}" data-fach="${d.fachId}">
      <span class="hero-oben">
        <span class="hero-status">${d.live ? '<span class="punkt"></span>' : ""}${esc(d.status)}</span>
        <span>${esc(d.zeit)}</span>
      </span>
      <span class="hero-fach">${esc(d.titel)}</span>
      <span class="hero-info">${esc(d.info)}</span>
      ${d.wert !== undefined ? `<span class="fortschritt"><span class="fortschritt-balken" data-wert="${d.wert.toFixed(3)}"></span></span>` : ""}
      ${d.unten ? `<span class="hero-rest"><span>${esc(d.unten[0])}</span><span>${esc(d.unten[1])}</span></span>` : ""}
    </button>`;
}

// Die große Karte: Was läuft gerade, was kommt als Nächstes?
function heroHtml(jetzt, i) {
  const tag = jetzt.getDay();
  const min = jetztInMinuten(jetzt);
  const stunden = stundenAm(tag);

  const laufend = stunden.find((s) => min >= minuten(s.start) && min < minuten(s.ende));
  if (laufend) {
    const gesamt = minuten(laufend.ende) - minuten(laufend.start);
    const vergangen = min - minuten(laufend.start);
    const danach = stunden[stunden.indexOf(laufend) + 1];
    return heroKarte({
      i,
      fachId: laufend.fachId,
      live: true,
      status: "Jetzt",
      zeit: `${laufend.start} – ${laufend.ende}`,
      titel: laufend.fach.name,
      info: `${laufend.raum} · ${laufend.fach.lehrer} · ${laufend.nr}. Stunde`,
      wert: vergangen / gesamt,
      unten: [`noch ${dauerText(gesamt - vergangen)}`, danach ? `danach ${danach.fach.name}` : "danach Schulschluss"]
    });
  }

  const naechste = stunden.find((s) => minuten(s.start) > min);
  if (naechste) {
    const bis = minuten(naechste.start) - min;
    const istErste = naechste === stunden[0];
    return heroKarte({
      i,
      fachId: naechste.fachId,
      status: !istErste ? `Pause · noch ${dauerText(bis)}` : bis > 120 ? "Heute zuerst" : `Erste Stunde in ${dauerText(bis)}`,
      zeit: `${naechste.start} – ${naechste.ende}`,
      titel: naechste.fach.name,
      info: `${naechste.raum} · ${naechste.fach.lehrer} · ${naechste.nr}. Stunde`
    });
  }

  // Schule ist vorbei oder heute ist frei → nächsten Schultag zeigen
  const naechsterTag = naechsterSchultag(tag);
  if (!naechsterTag) return "";
  const erste = stundenAm(naechsterTag.tag)[0];
  const wann = naechsterTag.abstand === 1 ? "Morgen" : WOCHENTAGE[naechsterTag.tag];
  let status = "Heute frei";
  if (tag === 0 || tag === 6) status = "Wochenende";
  else if (stunden.length) status = "Schulschluss";

  return heroKarte({
    i,
    fachId: erste.fachId,
    status,
    zeit: `${wann}, ${erste.start}`,
    titel: erste.fach.name,
    info: `${wann} zuerst · ${erste.raum} · ${erste.fach.lehrer}`
  });
}

// Karte für den ersten Start, solange noch kein Stundenplan geladen ist
function willkommenHtml(i) {
  return `
    <div class="noten-karte willkommen stagger" style="--i:${i}">
      <span class="noten-titel">Willkommen</span>
      <h2>Noch kein Stundenplan</h2>
      <p>Damit die App weiß, wann du welches Fach hast, trag deinen Stundenplan <strong>selbst ein</strong>. Oder lade eine <strong>Stundenplan-Datei</strong> bzw. ein <strong>Backup</strong> von einem anderen Gerät.</p>
      <button type="button" class="knopf breit drueckbar" data-aktion="editor-auf">Stundenplan selbst eintragen</button>
      <button type="button" class="knopf breit zweit drueckbar willkommen-zweit" data-aktion="backup-waehlen">Datei auswählen</button>
      <p class="hinweis">Alles, was du einträgst, bleibt nur auf diesem Gerät.</p>
    </div>`;
}

function begruessung(jetzt) {
  const stunde = jetzt.getHours();
  const name = einstellungen().name.trim();
  let gruss = "Guten Abend";
  if (stunde < 5) gruss = "Gute Nacht";
  else if (stunde < 11) gruss = "Guten Morgen";
  else if (stunde < 18) gruss = "Hallo";
  return name ? `${gruss}, ${name}` : gruss;
}

// ---------- Ansicht „Heute“ ----------

function heuteHtml() {
  const jetzt = new Date();
  const tag = jetzt.getDay();
  const min = jetztInMinuten(jetzt);
  const stunden = stundenAm(tag);
  const schuleLaeuft = stunden.length && min < minuten(stunden[stunden.length - 1].ende);
  const offen = offeneHausaufgaben();
  let i = 0;

  let html = `
    <header class="kopf kopf-zeile stagger" style="--i:${i++}">
      <div>
        <p class="kopf-oben">${WOCHENTAGE[tag]}, ${jetzt.getDate()}. ${MONATE[jetzt.getMonth()]}</p>
        <h1>${esc(begruessung(jetzt))}</h1>
      </div>
      <div class="kopf-knoepfe">
        <button class="kopf-knopf" data-aktion="statistik" aria-label="Statistik">${SYMBOL.diagramm}</button>
        <button class="kopf-knopf zahnrad" data-aktion="einstellungen" aria-label="Einstellungen">${SYMBOL.zahnrad}</button>
      </div>
    </header>`;

  // Ganz am Anfang: noch kein Stundenplan geladen
  if (!hatStundenplan()) return html + willkommenHtml(i);

  html += heroHtml(jetzt, i++);

  // Drei kleine Kacheln mit dem Wichtigsten auf einen Blick
  const naechsterTag = naechsterSchultag(tag);
  const morgenStunden = naechsterTag ? stundenAm(naechsterTag.tag) : [];
  const morgenName = naechsterTag && naechsterTag.abstand === 1 ? "Morgen" : naechsterTag ? WOCHENTAGE[naechsterTag.tag] : "";
  const tagKurz = naechsterTag && naechsterTag.abstand === 1 ? "morgen" : naechsterTag ? TAG_KURZ[naechsterTag.tag] : "";
  const kacheln = schuleLaeuft
    ? [[stunden.length, "Stunden"], [offen.length, "Aufgaben", "aufgaben"], [stunden[stunden.length - 1].ende, "Schulschluss"]]
    : [[morgenStunden.length, `Std. ${tagKurz}`], [offen.length, "Aufgaben", "aufgaben"], [morgenStunden[0] ? morgenStunden[0].start : "–", `Beginn ${tagKurz}`]];

  html += `<div class="kacheln stagger" style="--i:${i++}">${kacheln.map(([wert, name, ziel]) => `
    <${ziel ? `button data-gehe="${ziel}"` : "div"} class="kachel ${ziel ? "drueckbar" : ""}">
      <span class="kachel-wert">${esc(wert)}</span>
      <span class="kachel-name">${esc(name)}</span>
    </${ziel ? "button" : "div"}>`).join("")}</div>`;

  // Hinweis auf die nächste Klausur in den kommenden zwei Wochen
  const klausur = kommendeKlausuren().find((k) => tageBis(k.datum) <= 14);
  if (klausur) {
    const n = tageBis(klausur.datum);
    const fach = FAECHER[klausur.fachId] || { name: "Klausur" };
    html += `
      <button class="banner drueckbar stagger" style="--i:${i++}" data-gehe="klausuren">
        <span class="banner-zahl">${n === 0 ? "!" : n}</span>
        <span class="banner-text">
          <strong>${esc(fach.name)}-Klausur</strong>
          <small>${countdownText(n)} · ${esc(klausur.thema || datumLang(klausur.datum))}</small>
        </span>
        ${SYMBOL.pfeil}
      </button>`;
  }

  // Der Plan: Was mache ich wann nach der Schule?
  const plan = tagesplan(jetzt);
  const planTitel = schuleLaeuft ? "Nach der Schule" : "Dein Plan";
  const stundenZahl = String(Math.round((plan.minuten / 60) * 10) / 10).replace(".", ",");
  const planInfo = plan.offen.length ? `ab ${zeitText(plan.start)} · ${plan.minuten < 60 ? plan.minuten + " Min." : stundenZahl + " Std."}` : "";

  html += `
    <h2 class="abschnitt stagger" style="--i:${i++}">${planTitel}
      <span class="abschnitt-aktionen">
        <small>${planInfo}</small>
        <button class="rund-knopf klein drueckbar" data-aktion="sheet-auf" aria-label="Hausaufgabe hinzufügen">${SYMBOL.plus}</button>
      </span>
    </h2>`;

  if (plan.offen.length || plan.fertig.length) {
    html += `<div class="liste plan stagger" style="--i:${i++}">
      ${plan.offen.map((e) => planZeileHtml(e, e.start)).join("")}
      ${plan.fertig.map((e) => planZeileHtml(e, null)).join("")}
    </div>`;
    if (!plan.offen.length) html += '<p class="hinweis">Alles geschafft für heute. Stark!</p>';
  } else {
    html += `<div class="liste stagger" style="--i:${i++}"><p class="leer">Nichts zu tun. Neue Hausaufgabe? Tippe auf +.</p></div>`;
  }

  // Stundenplan: heute – oder nach Schulschluss schon der nächste Schultag
  if (schuleLaeuft) {
    const key = datumKey(jetzt);
    html += `
      <h2 class="abschnitt stagger" style="--i:${i++}">Stundenplan <small>${stunden.length} Stunden · bis ${stunden[stunden.length - 1].ende}</small></h2>
      <div class="liste stagger" style="--i:${i++}">${stunden.map((s) => zeileHtml(s, jetzt, true, key)).join("")}</div>`;
  } else if (morgenStunden.length) {
    const key = inTagen(naechsterTag.abstand);
    html += `
      <h2 class="abschnitt stagger" style="--i:${i++}">${morgenName} <small>${morgenStunden.length} Stunden · ab ${morgenStunden[0].start}</small></h2>
      <div class="liste stagger" style="--i:${i++}">${morgenStunden.map((s) => zeileHtml(s, jetzt, false, key)).join("")}</div>`;
  }
  return html;
}

// ---------- Ansicht „Woche“ ----------

function wocheHtml() {
  const jetzt = new Date();
  const heute = jetzt.getDay();
  if (zustand.wochentag === null) {
    zustand.wochentag = heute >= 1 && heute <= 5 ? heute : 1;
  }
  const t = zustand.wochentag;
  const gesamt = [1, 2, 3, 4, 5].reduce((summe, tag) => summe + stundenAm(tag).length, 0);

  const knoepfe = [1, 2, 3, 4, 5].map((tag) => `
    <button role="tab" data-tag="${tag}" aria-selected="${tag === t}" class="${tag === t ? "aktiv" : ""} ${tag === heute ? "heute" : ""}">${TAG_KURZ[tag]}</button>`).join("");

  return `
    <header class="kopf stagger" style="--i:0">
      <p class="kopf-oben">KW ${kalenderwoche(jetzt)} · ${gesamt} Stunden</p>
      <h1>Woche</h1>
    </header>
    <div class="segment stagger" style="--i:1; --pos:${t - 1}" role="tablist">
      <span class="segment-daumen"></span>${knoepfe}
    </div>
    <div id="wochen-liste" class="stagger" style="--i:2">${tageslisteHtml(t)}</div>
    ${wochenrasterHtml(jetzt)}`;
}

function tageslisteHtml(tag) {
  const jetzt = new Date();
  const stunden = stundenAm(tag);
  if (!stunden.length) return '<div class="liste"><p class="leer">An diesem Tag ist frei.</p></div>';
  const key = datumVonWochentag(tag);
  return `<div class="liste">${stunden.map((s) => zeileHtml(s, jetzt, tag === jetzt.getDay(), key)).join("")}</div>`;
}

function wochenrasterHtml(jetzt) {
  const heute = jetzt.getDay();
  const min = jetztInMinuten(jetzt);
  let html = '<div class="wochenraster stagger" style="--i:1"><span></span>';

  for (let tag = 1; tag <= 5; tag++) {
    html += `<span class="raster-kopf ${tag === heute ? "heute" : ""}">${WOCHENTAGE[tag]}</span>`;
  }

  STUNDEN.forEach((stunde, i) => {
    html += `<span class="raster-zeit"><strong>${stunde.nr}.</strong>${stunde.start}<br>${stunde.ende}</span>`;
    for (let tag = 1; tag <= 5; tag++) {
      const eintrag = (STUNDENPLAN[tag] || [])[i];
      if (!eintrag) {
        html += "<span></span>";
        continue;
      }
      const fach = FAECHER[eintrag[0]];
      const laeuft = tag === heute && min >= minuten(stunde.start) && min < minuten(stunde.ende);
      const klassen = ["raster-zelle", "drueckbar", tag === heute ? "heute-spalte" : "", laeuft ? "jetzt" : ""].join(" ");
      html += `
        <button class="${klassen}" data-fach="${eintrag[0]}">
          <span class="raster-fach">${esc(fach.kurzname || fach.name)}</span>
          <span class="raster-lehrer">${esc(fach.lehrer)}</span>
          <span class="raster-raum">${esc(eintrag[1])}${markenHtml(eintrag[0], datumVonWochentag(tag))}</span>
        </button>`;
    }
  });

  return html + "</div>";
}

function waehleTag(tag) {
  zustand.wochentag = tag;
  const segment = $(".segment");
  segment.style.setProperty("--pos", tag - 1);
  segment.querySelectorAll("button").forEach((knopf) => {
    const aktiv = Number(knopf.dataset.tag) === tag;
    knopf.classList.toggle("aktiv", aktiv);
    knopf.setAttribute("aria-selected", aktiv);
  });

  const liste = $("#wochen-liste");
  liste.innerHTML = tageslisteHtml(tag);
  liste.classList.remove("wechsel");
  void liste.offsetWidth; // Trick: startet die Animation neu
  liste.classList.add("wechsel");
}

// ---------- Ansicht „Aufgaben“ ----------

function aufgabenHtml() {
  const alle = hausaufgaben();
  const offen = offeneHausaufgaben();
  const erledigt = alle
    .filter((a) => a.erledigt)
    .sort((a, b) => (b.erledigtAm || 0) - (a.erledigtAm || 0))
    .slice(0, 15);
  let i = 0;

  let html = `
    <header class="kopf kopf-zeile stagger" style="--i:${i++}">
      <div>
        <p class="kopf-oben">${offen.length ? `${offen.length} offen` : "Alles erledigt"}</p>
        <h1>Aufgaben</h1>
      </div>
      <button class="rund-knopf drueckbar" data-aktion="sheet-auf" aria-label="Hausaufgabe hinzufügen">${SYMBOL.plus}</button>
    </header>`;

  if (!alle.length) {
    return html + `
      <div class="leer-gross stagger" style="--i:${i++}">
        ${SYMBOL.fertig}
        <strong>Keine Hausaufgaben</strong>
        Tippe auf +, um deine erste einzutragen.
      </div>`;
  }

  const gruppen = [
    ["Überfällig", (n) => n < 0],
    ["Heute", (n) => n === 0],
    ["Morgen", (n) => n === 1],
    ["Diese Woche", (n) => n > 1 && n < 7],
    ["Später", (n) => n >= 7]
  ];

  gruppen.forEach(([titel, passt]) => {
    const auswahl = offen.filter((a) => passt(tageBis(a.faellig)));
    if (!auswahl.length) return;
    html += `
      <h2 class="abschnitt stagger" style="--i:${i++}">${titel} <small>${auswahl.length}</small></h2>
      <div class="liste stagger" style="--i:${i++}">${auswahl.map((a) => aufgabeHtml(a, true)).join("")}</div>`;
  });

  if (!offen.length) {
    html += `
      <div class="leer-gross stagger" style="--i:${i++}">
        ${SYMBOL.fertig}
        <strong>Alles erledigt</strong>
        Stark! Gerade ist nichts mehr offen.
      </div>`;
  }

  if (erledigt.length) {
    html += `
      <h2 class="abschnitt stagger" style="--i:${i++}">Erledigt</h2>
      <div class="liste stagger" style="--i:${i++}">${erledigt.map((a) => aufgabeHtml(a, true)).join("")}</div>`;
  }
  return html;
}

// ---------- Ansicht „Klausuren“ ----------

function klausurZeileHtml(k) {
  const fach = FAECHER[k.fachId] || { name: "Klausur", kuerzel: "?", kurs: "" };
  const d = keyZuDatum(k.datum);
  const n = tageBis(k.datum);
  let rest = n === 0 ? "Heute" : n === 1 ? "Morgen" : `in ${n} T.`;
  // Ab dem Klausurtag kann die Note direkt eingetragen werden
  if (n <= 0) {
    const note = laden(NO_SCHLUESSEL, []).find((no) => no.klausurId === k.id);
    rest = note
      ? `<span class="punkte-pill klein">${note.punkte}</span>`
      : '<button class="mini-knopf drueckbar" data-aktion="note-fuer-klausur">Note +</button>';
  }

  return `
    <div class="zeile klausur-zeile ${n < 0 ? "vorbei" : ""}" data-klausur="${k.id}">
      <span class="zeile-zeit">${d.getDate()}.${d.getMonth() + 1}.<small>${TAG_KURZ[d.getDay()]}</small></span>
      ${monoHtml(fach)}
      <span>
        <span class="zeile-name">${esc(fach.name)}</span>
        <span class="zeile-info">${esc(k.thema || "Kein Thema eingetragen")}</span>
      </span>
      <span class="klausur-rest">${rest}</span>
      <button class="entfernen" data-aktion="kl-entfernen" aria-label="Klausur löschen">${SYMBOL.kreuz}</button>
    </div>`;
}

function klausurenHtml() {
  const kommend = kommendeKlausuren();
  const vergangen = klausuren().filter((k) => tageBis(k.datum) < 0).reverse();
  let i = 0;

  let html = `
    <header class="kopf kopf-zeile stagger" style="--i:${i++}">
      <div>
        <p class="kopf-oben">${kommend.length ? `${kommend.length} geplant` : "Keine geplant"}</p>
        <h1>Klausuren</h1>
      </div>
      <button class="rund-knopf drueckbar" data-aktion="klausur-auf" aria-label="Klausur eintragen">${SYMBOL.plus}</button>
    </header>`;

  if (!kommend.length && !vergangen.length) {
    return html + `
      <div class="leer-gross stagger" style="--i:${i++}">
        ${SYMBOL.klausur}
        <strong>Keine Klausuren</strong>
        Trag deine Termine mit + ein. Die App plant dann automatisch Lernzeit für dich ein.
      </div>`;
  }

  // Große Countdown-Karte für die nächste Klausur
  const naechste = kommend[0];
  if (naechste) {
    const fach = FAECHER[naechste.fachId] || { name: "Klausur", lehrer: "" };
    const n = tageBis(naechste.datum);
    html += `
      <div class="hero klausur-hero stagger" style="--i:${i++}">
        <span class="hero-oben"><span class="hero-status">Nächste Klausur</span><span>${esc(datumLang(naechste.datum))}</span></span>
        <span class="klausur-hero-mitte">
          <span>
            <span class="hero-fach">${esc(fach.name)}</span>
            <span class="hero-info">${esc(naechste.thema || fach.lehrer)}</span>
          </span>
          <span class="countdown">
            <span class="countdown-zahl">${n === 0 ? "!" : n}</span>
            <span class="countdown-text">${n === 0 ? "Heute" : n === 1 ? "Tag" : "Tage"}</span>
          </span>
        </span>
      </div>`;
  }

  if (kommend.length) {
    html += `
      <h2 class="abschnitt stagger" style="--i:${i++}">Demnächst <small>${kommend.length}</small></h2>
      <div class="liste stagger" style="--i:${i++}">${kommend.map(klausurZeileHtml).join("")}</div>
      <p class="hinweis stagger" style="--i:${i++}">In den 10 Tagen vor einer Klausur plant die App auf der Startseite automatisch Lernblöcke ein.</p>`;
  }

  if (vergangen.length) {
    html += `
      <h2 class="abschnitt stagger" style="--i:${i++}">Vergangen</h2>
      <div class="liste stagger" style="--i:${i++}">${vergangen.map(klausurZeileHtml).join("")}</div>`;
  }
  return html;
}

// ---------- Ansicht „Fächer“ ----------

function faecherHtml() {
  const faecher = Object.keys(FAECHER).map((id) => ({ id, ...FAECHER[id], stunden: stundenVonFach(id).length }));
  const gesamt = faecher.reduce((summe, f) => summe + f.stunden, 0);
  const offen = offeneHausaufgaben();
  const gruppen = [
    ["Leistungskurse", "Leistungskurs"],
    ["Grundkurse", "Grundkurs"],
    ["Projektkurs", "Projektkurs"]
  ];
  let i = 0;

  let html = `
    <header class="kopf kopf-zeile stagger" style="--i:${i++}">
      <div>
        <p class="kopf-oben">${faecher.length} Kurse · ${gesamt} Stunden pro Woche</p>
        <h1>Fächer</h1>
      </div>
      <button class="rund-knopf drueckbar" data-aktion="note-auf" aria-label="Note eintragen">${SYMBOL.plus}</button>
    </header>`;

  if (!hatStundenplan()) return html + willkommenHtml(i);

  html += notenKarteHtml(i++);

  gruppen.forEach(([titel, kurs]) => {
    const auswahl = faecher.filter((f) => f.kurs === kurs);
    if (!auswahl.length) return;
    html += `<h2 class="abschnitt stagger" style="--i:${i++}">${titel}</h2><div class="raster">`;
    auswahl.forEach((f) => {
      const haOffen = offen.filter((a) => a.fachId === f.id).length;
      const klausur = naechsteKlausurVon(f.id);
      const themen = themenVon(f.id);
      const geschafft = themen.filter((t) => t.erledigt).length;
      let rechts = "";
      if (klausur && tageBis(klausur.datum) <= 14) rechts = `Klausur ${tageBis(klausur.datum) <= 1 ? countdownText(tageBis(klausur.datum)) : tageBis(klausur.datum) + " T."}`;
      else if (haOffen) rechts = `${haOffen} HA`;
      else if (themen.length) rechts = `${geschafft}/${themen.length} ✓`;

      const schnitt = fachSchnitt(f.id);
      html += `
        <button class="fachkarte drueckbar stagger" style="--i:${i++}" data-fach="${f.id}">
          <span class="fachkarte-oben">
            ${monoHtml(f)}
            ${schnitt ? `<span class="fachkarte-schnitt"><small>Ø</small> ${zahlText(schnitt.gesamt)}</span>` : ""}
          </span>
          <span class="fachkarte-name">${esc(f.name)}</span>
          <span class="fachkarte-info">${esc(f.lehrer)}</span>
          <span class="fachkarte-unten">
            <span>${f.stunden} Std./Wo.</span>
            <span>${rechts}</span>
          </span>
        </button>`;
    });
    html += "</div>";
  });

  return html;
}

// Die Übersichtskarte mit Gesamtschnitt und einem Balken pro Fach
function notenKarteHtml(i) {
  const schnitt = gesamtSchnitt();
  if (schnitt === null) {
    return `
      <div class="noten-karte stagger" style="--i:${i}">
        <p class="noten-leer">Noch keine Noten. Tippe auf +, um deine erste einzutragen. Hier siehst du dann deinen Schnitt.</p>
      </div>`;
  }

  const zeilen = Object.keys(FAECHER)
    .map((id) => ({ id, fach: FAECHER[id], schnitt: fachSchnitt(id) }))
    .filter((z) => z.schnitt)
    .sort((a, b) => b.schnitt.gesamt - a.schnitt.gesamt);
  const anzahl = zeilen.reduce((s, z) => s + z.schnitt.anzahl, 0);

  return `
    <div class="noten-karte stagger" style="--i:${i}">
      <div class="noten-kopf">
        <div>
          <span class="noten-titel">Gesamtschnitt</span>
          <span class="schnitt-zahl">${zahlText(schnitt)}<small>Punkte</small></span>
        </div>
        <div class="noten-rechts">
          <span class="noten-note">${noteVonPunkten(schnitt)}</span>
          <span class="noten-titel">${anzahl} ${anzahl === 1 ? "Note" : "Noten"}</span>
        </div>
      </div>
      <div class="noten-balken">
        ${zeilen.map((z) => `
          <button class="balken-zeile" data-fach="${z.id}">
            <span class="balken-name">${esc(z.fach.kurzname || z.fach.name)}</span>
            <span class="balken-spur"><span class="fortschritt-balken" data-wert="${(z.schnitt.gesamt / 15).toFixed(3)}"></span></span>
            <span class="balken-wert">${zahlText(z.schnitt.gesamt)}</span>
          </button>`).join("")}
      </div>
    </div>`;
}

// ---------- Seite, die von rechts hereingleitet (Fach oder Einstellungen) ----------

function detailHtml(id) {
  const fach = FAECHER[id];
  const stunden = stundenVonFach(id);
  const naechste = naechsteStunde(id);
  const klausur = naechsteKlausurVon(id);
  const termine = stunden.map((s) => `${TAG_KURZ[s.tag]} ${s.nr}.`).join(" · ");
  const raeume = [...new Set(stunden.map((s) => s.raum))].join(", ");

  const infos = [
    ["Nächste Stunde", naechste ? `${naechste.wann}, ${naechste.start} · ${naechste.raum}` : "–"],
    ["Nächste Klausur", klausur ? `${faelligText(klausur.datum)} · ${countdownText(tageBis(klausur.datum))}` : "Keine geplant"],
    ["Lehrkraft", fach.lehrer],
    ["Kurs", fach.kurs],
    ["Lernzeit mit Timer", fokusVonFach(id) ? dauerText(fokusVonFach(id)) : "Noch keine"],
    ["Stunden pro Woche", stunden.length],
    ["Termine", termine],
    ["Räume", raeume]
  ];

  return `
    <div class="detail-leiste">
      <button class="zurueck" data-aktion="zurueck">${SYMBOL.zurueck}${ANSICHT_NAMEN[zustand.ansicht]}</button>
    </div>
    <div class="detail-inhalt">
      <div class="detail-kopf stagger" style="--i:0">
        ${monoHtml(fach, true)}
        <h1>${esc(fach.name)}</h1>
        <p>${esc(fach.kurs)} · ${esc(fach.lehrer)}</p>
      </div>

      <div class="liste stagger" style="--i:1">
        ${infos.map(([name, wert]) => `<div class="infozeile"><span>${name}</span><span>${esc(wert)}</span></div>`).join("")}
      </div>

      <h2 class="abschnitt stagger" style="--i:2">Noten
        <span class="abschnitt-aktionen">
          <button class="rund-knopf klein drueckbar" data-aktion="note-auf" aria-label="Note eintragen">${SYMBOL.plus}</button>
        </span>
      </h2>
      <div class="stagger" style="--i:2" id="fach-noten"></div>

      <h2 class="abschnitt stagger" style="--i:2">Hausaufgaben
        <span class="abschnitt-aktionen">
          <button class="rund-knopf klein drueckbar" data-aktion="sheet-auf" aria-label="Hausaufgabe hinzufügen">${SYMBOL.plus}</button>
        </span>
      </h2>
      <div class="liste stagger" style="--i:3" id="fach-aufgaben"></div>

      <h2 class="abschnitt stagger" style="--i:4">Quiz</h2>
      <div class="stagger" style="--i:4" id="fach-quiz"></div>

      <h2 class="abschnitt stagger" style="--i:4">Lernthemen <small id="themen-zaehler"></small></h2>
      <form class="eingabe stagger" style="--i:5" id="themen-form">
        <input id="themen-eingabe" type="text" maxlength="120" autocomplete="off" placeholder="Neues Thema hinzufügen …" aria-label="Neues Lernthema">
        <button class="knopf drueckbar" type="submit">Hinzufügen</button>
      </form>
      <div class="liste stagger" style="--i:6" id="themen-liste"></div>

      <h2 class="abschnitt stagger" style="--i:7">Notizen <small id="notiz-status"></small></h2>
      <textarea class="notizen stagger" style="--i:8" id="notizen" placeholder="Was du dir zu ${esc(fach.name)} merken willst …"></textarea>
    </div>`;
}

function segmentHtml(name, optionen, aktuell) {
  const pos = Math.max(0, optionen.findIndex(([wert]) => wert === aktuell));
  return `
    <div class="segment" role="radiogroup" style="--anzahl:${optionen.length}; --pos:${pos}">
      <span class="segment-daumen"></span>
      ${optionen.map(([wert, text], i) => `<button type="button" role="radio" aria-checked="${i === pos}" class="${i === pos ? "aktiv" : ""}" data-einstellung="${name}" data-wert="${wert}">${text}</button>`).join("")}
    </div>`;
}

function einstellungenHtml() {
  const e = einstellungen();
  return `
    <div class="detail-leiste">
      <button class="zurueck" data-aktion="zurueck">${SYMBOL.zurueck}${ANSICHT_NAMEN[zustand.ansicht]}</button>
    </div>
    <div class="detail-inhalt einstellungen">
      <header class="kopf stagger" style="--i:0"><h1>Einstellungen</h1></header>

      <h2 class="abschnitt stagger" style="--i:1">Darstellung</h2>
      <div class="stagger" style="--i:2">
        ${segmentHtml("theme", [["dunkel", "Dunkel"], ["hell", "Hell"], ["auto", "Automatisch"]], e.theme)}
        <p class="hinweis">„Automatisch“ richtet sich nach der Einstellung deines Geräts.</p>
      </div>

      <h2 class="abschnitt stagger" style="--i:3">Persönlich</h2>
      <div class="liste stagger" style="--i:4">
        <label class="infozeile">
          <span>Dein Name</span>
          <input class="einst-input" id="einst-name" type="text" maxlength="30" autocomplete="off" placeholder="Für die Begrüßung" value="${esc(e.name)}">
        </label>
      </div>

      <h2 class="abschnitt stagger" style="--i:5">Lernplan</h2>
      <div class="stagger" style="--i:6">
        ${segmentHtml("pause", [[30, "30 Min."], [60, "1 Std."], [90, "1,5 Std."]], e.pause)}
        <p class="hinweis">So viel Pause plant die App nach Schulschluss ein, bevor dein Tagesplan beginnt.</p>
      </div>

      <h2 class="abschnitt stagger" style="--i:6">Lern-Timer</h2>
      <div class="stagger" style="--i:6">
        ${segmentHtml("fokus", [[25, "25 Min."], [30, "30 Min."], [45, "45 Min."]], e.fokus)}
        <p class="hinweis">Länge einer Fokus-Runde. Danach folgen 5 Min. Pause, nach vier Runden 15 Min.</p>
      </div>

      ${typeof editorBereichHtml === "function" ? editorBereichHtml() : ""}

      ${typeof backupBereichHtml === "function" ? backupBereichHtml() : ""}

      <h2 class="abschnitt stagger" style="--i:8">Über</h2>
      <div class="liste stagger" style="--i:8">
        <div class="infozeile"><span>Version</span><span>0.7</span></div>
        <div class="infozeile"><span>Speicherort</span><span>Nur in diesem Browser</span></div>
      </div>
      <p class="hinweis stagger" style="--i:9">Deine Hausaufgaben, Klausuren und Notizen bleiben auf diesem Gerät. Nichts wird ins Internet geschickt. Sichere sie deshalb ab und zu mit „Daten sichern“.</p>
    </div>`;
}

// ---------- Statistik ----------

// Montag der Woche (offset 0 = diese Woche, -1 = letzte Woche …)
function wochenStart(offset) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offset * 7);
  return d;
}

// Lernzeit einer Woche: pro Tag, pro Fach und insgesamt
function wochenDaten(offset) {
  const fokus = laden(FOKUS_SCHLUESSEL, {});
  const start = wochenStart(offset);
  const tage = [];
  const faecher = {};

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = datumKey(d);
    const eintrag = fokus[key] || { minuten: 0, faecher: {} };
    tage.push({ key, minuten: eintrag.minuten });
    Object.entries(eintrag.faecher || {}).forEach(([fachId, min]) => {
      faecher[fachId] = (faecher[fachId] || 0) + min;
    });
  }
  return { start, tage, faecher, summe: tage.reduce((s, t) => s + t.minuten, 0) };
}

// Wie viele Tage in Folge wurde gelernt? Heute zählt mit, sobald gelernt wurde.
function lernSerie() {
  const fokus = laden(FOKUS_SCHLUESSEL, {});
  const d = new Date();
  if (!(fokus[datumKey(d)] || {}).minuten) d.setDate(d.getDate() - 1);
  let serie = 0;
  while ((fokus[datumKey(d)] || {}).minuten > 0) {
    serie++;
    d.setDate(d.getDate() - 1);
  }
  return serie;
}

function erledigtInWoche(start) {
  const ende = new Date(start);
  ende.setDate(ende.getDate() + 7);
  return hausaufgaben().filter((a) => a.erledigt && a.erledigtAm >= start.getTime() && a.erledigtAm < ende.getTime()).length;
}

// 75 → "1" + "Std. 15 Min." – Zahl und Einheit getrennt, damit die Zahl groß sein kann
function grosseDauerHtml(min) {
  if (min < 60) return `${min}<small>Min.</small>`;
  const rest = min % 60;
  return `${Math.floor(min / 60)}<small>Std.</small>${rest ? ` ${rest}<small>Min.</small>` : ""}`;
}

// 75 → "1,3" Std. bzw. 45 → "45" Min. – für die kleinen Kacheln
function kachelDauerHtml(min) {
  if (min < 60) return `${min}<small> Min.</small>`;
  return `${String(Math.round((min / 60) * 10) / 10).replace(".", ",")}<small> Std.</small>`;
}

function statistikHtml() {
  const offset = zustand.statWoche;
  const woche = wochenDaten(offset);
  const vorwoche = wochenDaten(offset - 1);
  const heuteKey = datumKey(new Date());
  const ende = new Date(woche.start);
  ende.setDate(ende.getDate() + 6);

  const titel = offset === 0 ? "Diese Woche" : offset === -1 ? "Letzte Woche" : `KW ${kalenderwoche(woche.start)}`;
  const zeitraum = `KW ${kalenderwoche(woche.start)} · ${woche.start.getDate()}.${woche.start.getMonth() + 1}. – ${ende.getDate()}.${ende.getMonth() + 1}.`;

  const diff = woche.summe - vorwoche.summe;
  let vergleich = "Noch keine Lernzeit mit dem Timer.";
  if (woche.summe || vorwoche.summe) {
    vergleich = diff > 0 ? `▲ ${dauerText(diff)} mehr als in der Woche davor`
      : diff < 0 ? `▼ ${dauerText(-diff)} weniger als in der Woche davor`
      : "Genauso viel wie in der Woche davor";
  }

  // Säulendiagramm: Skala in 30-Minuten-Schritten, mindestens 1 Stunde
  const maxTag = Math.max(...woche.tage.map((t) => t.minuten));
  const skala = Math.max(60, Math.ceil(maxTag / 30) * 30);
  const saeulen = woche.tage.map((t, i) => {
    const d = keyZuDatum(t.key);
    const zeit = t.minuten ? dauerText(t.minuten) : "keine Lernzeit";
    const klassen = ["spalte", t.key === heuteKey ? "heute" : "", t.key > heuteKey ? "zukunft" : "", maxTag && t.minuten === maxTag ? "max" : ""].join(" ");
    return `
      <div class="${klassen}" tabindex="0" role="img" aria-label="${WOCHENTAGE[d.getDay()]}, ${d.getDate()}. ${MONATE[d.getMonth()]}: ${zeit}" style="--i:${i}">
        <span class="saeulen-flaeche" data-wert="${(t.minuten / skala).toFixed(3)}">
          <span class="saeule ${t.minuten ? "hat-wert" : ""}"></span>
          <span class="tipp">${t.minuten ? t.minuten + " Min." : "–"}</span>
        </span>
        <span class="spalte-tag">${TAG_KURZ[d.getDay()]}</span>
      </div>`;
  }).join("");

  // Kacheln
  const lerntage = woche.tage.filter((t) => t.minuten > 0).length;
  const schnitt = lerntage ? Math.round(woche.summe / lerntage) : 0;
  const serie = lernSerie();
  const erledigt = erledigtInWoche(woche.start);

  // Lernzeit nach Fach, sortiert von viel nach wenig
  const faecher = Object.entries(woche.faecher).filter(([, min]) => min > 0).sort((a, b) => b[1] - a[1]);
  const maxFach = faecher.length ? faecher[0][1] : 1;

  return `
    <div class="detail-leiste">
      <button class="zurueck" data-aktion="zurueck">${SYMBOL.zurueck}${ANSICHT_NAMEN[zustand.ansicht]}</button>
    </div>
    <div class="detail-inhalt statistik">
      <header class="kopf kopf-zeile stagger" style="--i:0">
        <div>
          <p class="kopf-oben">${zeitraum}</p>
          <h1>Statistik</h1>
        </div>
        <div class="kopf-knoepfe">
          <button class="kopf-knopf" data-aktion="stat-zurueck" aria-label="Vorherige Woche">${SYMBOL.links}</button>
          <button class="kopf-knopf" data-aktion="stat-vor" aria-label="Nächste Woche" ${offset === 0 ? "disabled" : ""}>${SYMBOL.rechts}</button>
        </div>
      </header>

      <div class="noten-karte stagger" style="--i:1">
        <span class="noten-titel">Lernzeit · ${titel}</span>
        <span class="schnitt-zahl">${grosseDauerHtml(woche.summe)}</span>
        <p class="stat-vergleich">${vergleich}</p>

        <div class="diagramm" role="group" aria-label="Lernzeit pro Tag">
          <div class="diagramm-raster" aria-hidden="true">
            <span style="--y:1">${skala} Min.</span>
            <span style="--y:0.5">${skala / 2}</span>
          </div>
          <div class="diagramm-spalten">${saeulen}</div>
        </div>
      </div>

      <div class="kacheln stagger" style="--i:2">
        <div class="kachel"><span class="kachel-wert">${kachelDauerHtml(schnitt)}</span><span class="kachel-name">Ø pro Tag</span></div>
        <div class="kachel"><span class="kachel-wert">${serie}<small> ${serie === 1 ? "Tag" : "Tage"}</small></span><span class="kachel-name">Lernserie</span></div>
        <div class="kachel"><span class="kachel-wert">${erledigt}</span><span class="kachel-name">Erledigt</span></div>
      </div>

      <h2 class="abschnitt stagger" style="--i:3">Nach Fach</h2>
      <div class="noten-karte stagger" style="--i:4">
        ${faecher.length ? `
          <div class="noten-balken">
            ${faecher.map(([fachId, min]) => {
              const fach = FAECHER[fachId] || { name: "Sonstiges" };
              return `
                <button class="balken-zeile breit" data-fach="${fachId}">
                  <span class="balken-name">${esc(fach.kurzname || fach.name)}</span>
                  <span class="balken-spur"><span class="fortschritt-balken" data-wert="${(min / maxFach).toFixed(3)}"></span></span>
                  <span class="balken-wert">${dauerText(min)}</span>
                </button>`;
            }).join("")}
          </div>`
        : '<p class="noten-leer">Starte den Lern-Timer mit ▶ in deinem Tagesplan. Dann siehst du hier, wie viel du pro Fach lernst.</p>'}
      </div>
    </div>`;
}

function oeffneStatistik() {
  zustand.offenesFach = null;
  zustand.einstellungenOffen = false;
  zustand.statistikOffen = true;
  zustand.editorOffen = false;
  zustand.statWoche = 0;
  seiteOeffnen(statistikHtml());
}

function statistikWoche(richtung) {
  zustand.statWoche = Math.min(0, zustand.statWoche + richtung);
  const detail = $("#detail");
  detail.innerHTML = statistikHtml();
  const inhalt = detail.querySelector(".detail-inhalt");
  inhalt.classList.add("wechsel");
  balkenSetzen(detail, true);
}

function fachAufgabenRendern(id) {
  const ziel = $("#fach-aufgaben");
  if (!ziel) return;
  const offen = offeneHausaufgaben().filter((a) => a.fachId === id);
  ziel.innerHTML = offen.length
    ? offen.map((a) => aufgabeHtml(a, false)).join("")
    : '<p class="leer">Keine offenen Hausaufgaben in diesem Fach.</p>';
}

function fachNotenRendern(id) {
  const ziel = $("#fach-noten");
  if (!ziel) return;
  const schnitt = fachSchnitt(id);
  if (!schnitt) {
    ziel.innerHTML = '<div class="liste"><p class="leer">Noch keine Noten in diesem Fach.</p></div>';
    return;
  }

  const teil = (name, wert) => `<span>${name}<b>${wert === null ? "–" : zahlText(wert)}</b></span>`;
  ziel.innerHTML = `
    <div class="liste">
      <div class="fach-schnitt">
        <span class="schnitt-zahl">${zahlText(schnitt.gesamt)}<small>Ø Punkte · Note ${noteVonPunkten(schnitt.gesamt)}</small></span>
        <span class="schnitt-teile">${teil("Klausuren", schnitt.klausur)}${teil("Mitarbeit", schnitt.somi)}</span>
      </div>
      ${notenVon(id).map((n) => `
        <div class="thema note-zeile" data-note="${n.id}">
          <span class="punkte-pill">${n.punkte}</span>
          <span class="thema-text">${esc(NOTEN_ARTEN[n.art] || "Note")}${n.notiz ? " · " + esc(n.notiz) : ""}<small class="aufgabe-meta">${esc(faelligText(n.datum).replace(/^./, (z) => z.toUpperCase()))} · Note ${NOTEN[n.punkte]}</small></span>
          <button class="entfernen" data-aktion="no-entfernen" aria-label="Note löschen">${SYMBOL.kreuz}</button>
        </div>`).join("")}
    </div>`;
}

function themenRendern(id, neuerIndex) {
  const themen = themenVon(id);
  const liste = $("#themen-liste");
  const geschafft = themen.filter((t) => t.erledigt).length;

  $("#themen-zaehler").textContent = themen.length ? `${geschafft} von ${themen.length} geschafft` : "";

  if (!themen.length) {
    liste.innerHTML = '<p class="leer">Noch keine Themen. Schreib oben dein erstes hinein.</p>';
    return;
  }

  liste.innerHTML = themen.map((thema, i) => `
    <div class="thema ${thema.erledigt ? "erledigt" : ""} ${i === neuerIndex ? "neu" : ""}" data-index="${i}">
      <button class="haken" data-aktion="abhaken" aria-label="Als erledigt markieren" aria-pressed="${thema.erledigt}">${SYMBOL.haken}</button>
      <span class="thema-text">${esc(thema.text)}</span>
      <button class="entfernen" data-aktion="entfernen" aria-label="Thema entfernen">${SYMBOL.kreuz}</button>
    </div>`).join("");
}

function seiteOeffnen(html) {
  const detail = $("#detail");
  detail.innerHTML = html;
  detail.scrollTop = 0;
  detail.setAttribute("aria-hidden", "false");
  animieren(detail);
  balkenSetzen(detail, true);
  requestAnimationFrame(() => {
    detail.classList.add("offen");
    $(".app").classList.add("detail-offen");
  });
}

function oeffneFach(id) {
  if (!FAECHER[id]) return;
  zustand.offenesFach = id;
  zustand.einstellungenOffen = false;
  zustand.statistikOffen = false;
  zustand.editorOffen = false;
  seiteOeffnen(detailHtml(id));
  fachNotenRendern(id);
  fachAufgabenRendern(id);
  if (typeof quizBereichRendern === "function") quizBereichRendern(id);
  themenRendern(id);
  $("#notizen").value = laden("lb-notizen-" + id, "");
}

function oeffneEinstellungen() {
  zustand.offenesFach = null;
  zustand.einstellungenOffen = true;
  zustand.statistikOffen = false;
  zustand.editorOffen = false;
  seiteOeffnen(einstellungenHtml());
}

function schliesseSeite() {
  if (!zustand.offenesFach && !zustand.einstellungenOffen && !zustand.statistikOffen && !zustand.editorOffen && !zustand.anleitungOffen) return;
  zustand.offenesFach = null;
  zustand.einstellungenOffen = false;
  zustand.statistikOffen = false;
  zustand.editorOffen = false;
  zustand.anleitungOffen = false;
  const detail = $("#detail");
  detail.classList.remove("offen");
  detail.setAttribute("aria-hidden", "true");
  $(".app").classList.remove("detail-offen");
  render(zustand.ansicht, false); // z. B. Name in der Begrüßung oder Zähler aktualisieren
}

function einstellungWaehlen(knopf) {
  const name = knopf.dataset.einstellung;
  const wert = name === "pause" || name === "fokus" ? Number(knopf.dataset.wert) : knopf.dataset.wert;
  einstellungAendern(name, wert);

  const segment = knopf.closest(".segment");
  const knoepfe = [...segment.querySelectorAll("button")];
  segment.style.setProperty("--pos", knoepfe.indexOf(knopf));
  knoepfe.forEach((k) => {
    k.classList.toggle("aktiv", k === knopf);
    k.setAttribute("aria-checked", k === knopf);
  });

  if (name === "theme") farbschemaAnwenden(true);
}

// ---------- Fenster von unten („Sheet“) ----------

function fachChipsHtml() {
  return Object.keys(FAECHER).map((id) => `
    <button type="button" class="chip ${id === blatt.fachId ? "aktiv" : ""}" data-blatt-fach="${id}">
      ${esc(FAECHER[id].kurzname || FAECHER[id].name)}
    </button>`).join("");
}

function sheetKopfHtml(titel) {
  return `
    <div class="sheet-griff"></div>
    <div class="sheet-kopf">
      <button type="button" class="text-knopf" data-aktion="sheet-zu">Abbrechen</button>
      <h2>${titel}</h2>
      <span></span>
    </div>`;
}

function faelligOptionen() {
  const stundeKey = naechsterUnterrichtstag(blatt.fachId);
  return [
    ["stunde", "Nächste Stunde", TAG_KURZ[keyZuDatum(stundeKey).getDay()], stundeKey],
    ["morgen", "Morgen", "", inTagen(1)],
    ["woche", "In einer Woche", "", inTagen(7)]
  ];
}

function faelligChipsHtml() {
  return faelligOptionen().map(([modus, name, extra, key]) => `
    <button type="button" class="chip ${blatt.modus === modus ? "aktiv" : ""}" data-ha-faellig="${modus}" data-key="${key}">
      ${name}${extra ? ` <b>${extra}</b>` : ""}
    </button>`).join("");
}

function hausaufgabeSheetHtml() {
  const dauern = [15, 30, 45, 60, 90];
  return `
    ${sheetKopfHtml("Neue Hausaufgabe")}
    <form id="ha-form" autocomplete="off">
      <span class="feld-titel">Fach</span>
      <div class="chips" id="blatt-faecher">${fachChipsHtml()}</div>

      <label class="feld-titel" for="ha-text">Aufgabe</label>
      <textarea class="feld" id="ha-text" rows="3" maxlength="300" placeholder="z. B. Buch S. 42, Nr. 3a–c"></textarea>

      <span class="feld-titel">Fällig</span>
      <div class="chips" id="ha-faellig">${faelligChipsHtml()}</div>
      <label class="datumzeile">
        <span>Datum</span>
        <input type="date" id="ha-datum" min="${datumKey(new Date())}" value="${blatt.faellig}">
      </label>

      <span class="feld-titel">Dauer (geschätzt)</span>
      <div class="chips" id="ha-dauer">
        ${dauern.map((d) => `<button type="button" class="chip ${d === blatt.dauer ? "aktiv" : ""}" data-ha-dauer="${d}">${d} Min.</button>`).join("")}
      </div>

      <button class="knopf breit drueckbar" type="submit" id="blatt-speichern" disabled>Hinzufügen</button>
    </form>`;
}

function klausurDatumChipsHtml() {
  return [["In 1 Woche", 7], ["In 2 Wochen", 14], ["In 3 Wochen", 21]].map(([name, tage]) => {
    const key = inTagen(tage);
    return `<button type="button" class="chip ${key === blatt.klDatum ? "aktiv" : ""}" data-kl-datum="${key}">${name}</button>`;
  }).join("");
}

function klausurSheetHtml() {
  return `
    ${sheetKopfHtml("Neue Klausur")}
    <form id="kl-form" autocomplete="off">
      <span class="feld-titel">Fach</span>
      <div class="chips" id="blatt-faecher">${fachChipsHtml()}</div>

      <span class="feld-titel">Termin</span>
      <div class="chips" id="kl-chips">${klausurDatumChipsHtml()}</div>
      <label class="datumzeile">
        <span>Datum</span>
        <input type="date" id="kl-datum" min="${datumKey(new Date())}" value="${blatt.klDatum}">
      </label>

      <label class="feld-titel" for="kl-thema">Thema (optional)</label>
      <input class="feld" id="kl-thema" type="text" maxlength="80" placeholder="z. B. Analysis: Ableitungen">

      <button class="knopf breit drueckbar" type="submit" id="blatt-speichern">Eintragen</button>
    </form>`;
}

function noteSheetHtml() {
  const punkte = [];
  for (let p = 15; p >= 0; p--) punkte.push(p);

  return `
    ${sheetKopfHtml("Neue Note")}
    <form id="no-form" autocomplete="off">
      <span class="feld-titel">Fach</span>
      <div class="chips" id="blatt-faecher">${fachChipsHtml()}</div>

      <span class="feld-titel">Art</span>
      <div class="chips" id="no-arten">
        ${Object.entries(NOTEN_ARTEN).map(([art, name]) => `<button type="button" class="chip ${art === blatt.art ? "aktiv" : ""}" data-no-art="${art}">${name}</button>`).join("")}
      </div>

      <span class="feld-titel">Punkte</span>
      <div class="punkte-raster" id="no-punkte">
        ${punkte.map((p) => `
          <button type="button" class="punkte-knopf ${p === blatt.punkte ? "aktiv" : ""}" data-no-punkte="${p}" aria-label="${p} Punkte, Note ${NOTEN[p]}">
            <b>${p}</b><small>${NOTEN[p]}</small>
          </button>`).join("")}
      </div>

      <label class="datumzeile">
        <span>Datum</span>
        <input type="date" id="no-datum" max="${datumKey(new Date())}" value="${blatt.noDatum}">
      </label>

      <label class="feld-titel" for="no-notiz">Notiz (optional)</label>
      <input class="feld" id="no-notiz" type="text" maxlength="80" placeholder="z. B. Gedichtanalyse" value="${esc(blatt.notiz)}">

      <button class="knopf breit drueckbar" type="submit" id="blatt-speichern" ${blatt.punkte === null ? "disabled" : ""}>Speichern</button>
    </form>`;
}

function faelligSetzen(modus, key) {
  blatt.modus = modus;
  blatt.faellig = key;
  $("#ha-faellig").innerHTML = faelligChipsHtml();
  $("#ha-datum").value = key;
}

function klausurDatumSetzen(key) {
  blatt.klDatum = key;
  $("#kl-chips").innerHTML = klausurDatumChipsHtml();
  $("#kl-datum").value = key;
}

// „extra“ füllt das Fenster vor, z. B. beim Eintragen der Note zu einer Klausur
function oeffneSheet(typ, fachId, extra = {}) {
  if (!hatStundenplan()) return zeigeToast("Lade zuerst deinen Stundenplan (Startseite oder Einstellungen).");
  blatt.fachId = fachId || aktuellesFach() || Object.keys(FAECHER)[0];
  blatt.modus = "stunde";
  blatt.faellig = naechsterUnterrichtstag(blatt.fachId);
  blatt.dauer = 30;
  blatt.klDatum = inTagen(14);
  blatt.art = extra.art || "klausur";
  blatt.punkte = null;
  blatt.noDatum = extra.datum || datumKey(new Date());
  blatt.notiz = extra.notiz || "";
  blatt.klausurId = extra.klausurId || null;
  zustand.sheet = typ;

  const inhalte = { hausaufgabe: hausaufgabeSheetHtml, klausur: klausurSheetHtml, note: noteSheetHtml };
  const titel = { hausaufgabe: "Neue Hausaufgabe", klausur: "Neue Klausur", note: "Neue Note" };
  const sheet = $("#sheet");
  sheet.innerHTML = inhalte[typ]();
  sheet.setAttribute("aria-label", titel[typ]);
  sheet.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => {
    sheet.classList.add("offen");
    $("#sheet-hintergrund").classList.add("offen");
    const aktiv = sheet.querySelector("#blatt-faecher .aktiv");
    if (aktiv) aktiv.scrollIntoView({ inline: "center", block: "nearest" });
  });
  if (typ === "hausaufgabe") setTimeout(() => $("#ha-text").focus({ preventScroll: true }), 450);
}

function schliesseSheet() {
  if (!zustand.sheet) return;
  zustand.sheet = null;
  const sheet = $("#sheet");
  sheet.classList.remove("offen");
  sheet.setAttribute("aria-hidden", "true");
  $("#sheet-hintergrund").classList.remove("offen");
  if (document.activeElement) document.activeElement.blur();
}

function hausaufgabeSpeichern() {
  const text = $("#ha-text").value.trim();
  if (!text || !blatt.faellig) return;

  const liste = hausaufgaben();
  liste.push({
    id: neueId(),
    fachId: blatt.fachId,
    text,
    faellig: blatt.faellig,
    dauer: blatt.dauer,
    erledigt: false,
    erstellt: Date.now()
  });
  speichern(HA_SCHLUESSEL, liste);

  schliesseSheet();
  allesAktualisieren(true);
  zeigeToast(`${FAECHER[blatt.fachId].name} · fällig ${faelligText(blatt.faellig)}`);
}

function klausurSpeichern() {
  if (!blatt.klDatum) return;
  const liste = laden(KL_SCHLUESSEL, []);
  liste.push({
    id: neueId(),
    fachId: blatt.fachId,
    datum: blatt.klDatum,
    thema: $("#kl-thema").value.trim(),
    erstellt: Date.now()
  });
  speichern(KL_SCHLUESSEL, liste);

  schliesseSheet();
  allesAktualisieren(true);
  zeigeToast(`${FAECHER[blatt.fachId].name}-Klausur ${countdownText(tageBis(blatt.klDatum))}`);
}

function noteSpeichern() {
  if (blatt.punkte === null) return;
  const liste = laden(NO_SCHLUESSEL, []);
  liste.push({
    id: neueId(),
    fachId: blatt.fachId,
    punkte: blatt.punkte,
    art: blatt.art,
    datum: $("#no-datum").value || datumKey(new Date()),
    notiz: $("#no-notiz").value.trim(),
    klausurId: blatt.klausurId,
    erstellt: Date.now()
  });
  speichern(NO_SCHLUESSEL, liste);

  schliesseSheet();
  allesAktualisieren(true);
  zeigeToast(`${FAECHER[blatt.fachId].name}: ${blatt.punkte} Punkte (${NOTEN[blatt.punkte]})`);
}

function noteLoeschen(knopf) {
  const zeile = knopf.closest("[data-note]");
  speichern(NO_SCHLUESSEL, laden(NO_SCHLUESSEL, []).filter((n) => n.id !== zeile.dataset.note));
  zeile.classList.add("weg");
  spaeterAktualisieren(300);
}

function noteFuerKlausur(knopf) {
  const zeile = knopf.closest("[data-klausur]");
  const klausur = klausuren().find((k) => k.id === zeile.dataset.klausur);
  if (!klausur) return;
  oeffneSheet("note", klausur.fachId, { art: "klausur", datum: klausur.datum, notiz: klausur.thema, klausurId: klausur.id });
}

// ---------- Lern-Timer (Pomodoro) ----------
// 25 Min. Fokus → 5 Min. Pause, nach 4 Runden 15 Min. Pause.
// Der Timer merkt sich seine Endzeit, damit er auch nach dem Neuladen weiterläuft.

const TIMER_SCHLUESSEL = "lb-timer";
const FOKUS_SCHLUESSEL = "lb-fokus";
const RING_UMFANG = 2 * Math.PI * 100;
const PHASEN = { fokus: "Fokus", pause: "Kurze Pause", langpause: "Lange Pause" };

let timer = null;
let timerOffen = false;
let audio = null;

function phasenDauer(phase) {
  if (phase === "fokus") return einstellungen().fokus * 60;
  return phase === "langpause" ? 15 * 60 : 5 * 60;
}

function timerSpeichern() {
  speichern(TIMER_SCHLUESSEL, timer);
}

function restSekunden() {
  if (!timer) return 0;
  return timer.laeuft ? Math.max(0, Math.ceil((timer.ende - Date.now()) / 1000)) : timer.rest;
}

// 1499 → "24:59"
function uhr(sekunden) {
  return `${String(Math.floor(sekunden / 60)).padStart(2, "0")}:${String(sekunden % 60).padStart(2, "0")}`;
}

// Lernzeit pro Tag und Fach mitzählen
function fokusGutschreiben(min, fachId) {
  if (min < 1) return;
  const alle = laden(FOKUS_SCHLUESSEL, {});
  const key = datumKey(new Date());
  const tag = alle[key] || { minuten: 0, faecher: {} };
  tag.minuten += min;
  if (fachId) tag.faecher[fachId] = (tag.faecher[fachId] || 0) + min;
  alle[key] = tag;
  speichern(FOKUS_SCHLUESSEL, alle);
}

function fokusHeute() {
  return (laden(FOKUS_SCHLUESSEL, {})[datumKey(new Date())] || { minuten: 0 }).minuten;
}

function fokusVonFach(fachId) {
  return Object.values(laden(FOKUS_SCHLUESSEL, {})).reduce((summe, tag) => summe + ((tag.faecher || {})[fachId] || 0), 0);
}

// Bisher geschaffte Minuten der laufenden Fokus-Phase gutschreiben
function fokusAbrechnen() {
  if (timer && timer.phase === "fokus") {
    fokusGutschreiben(Math.floor((timer.dauer - restSekunden()) / 60), timer.fachId);
  }
}

// Der Browser darf erst nach einem Klick Töne abspielen – deshalb hier vorbereiten
function tonVorbereiten() {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === "suspended") audio.resume();
  } catch (fehler) {
    audio = null;
  }
}

// Ein sanfter Zwei-Ton-Gong
function klingeln() {
  if (!audio) return;
  try {
    [[784, 0], [1046.5, 0.18]].forEach(([frequenz, verzoegerung]) => {
      const ton = audio.createOscillator();
      const lautstaerke = audio.createGain();
      const t = audio.currentTime + verzoegerung;
      ton.type = "sine";
      ton.frequency.value = frequenz;
      lautstaerke.gain.setValueAtTime(0.0001, t);
      lautstaerke.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      lautstaerke.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      ton.connect(lautstaerke).connect(audio.destination);
      ton.start(t);
      ton.stop(t + 0.75);
    });
  } catch (fehler) {
    // Ohne Ton geht es auch
  }
}

function timerStarten(knopf) {
  const zeile = knopf.closest("[data-aufgabe], [data-lernen]");
  let bezug, titel, fachId;

  if (zeile.dataset.aufgabe) {
    const aufgabe = hausaufgaben().find((a) => a.id === zeile.dataset.aufgabe);
    if (!aufgabe) return;
    bezug = { typ: "ha", id: aufgabe.id };
    titel = aufgabe.text;
    fachId = aufgabe.fachId;
  } else {
    const klausur = klausuren().find((k) => k.id === zeile.dataset.lernen);
    if (!klausur) return;
    bezug = { typ: "lernen", id: klausur.id };
    titel = klausur.thema ? `Lernen: ${klausur.thema}` : "Lernen für die Klausur";
    fachId = klausur.fachId;
  }

  // Eine laufende Fokus-Sitzung (Fokus-Tab) wird nicht einfach abgebrochen
  if (timer && timer.art === "fokus" && !timer.fertig) {
    zeigeToast("Deine Fokus-Zeit läuft noch");
    return oeffneTimer();
  }
  if (timer && timer.aktiv && timer.art !== "fokus") fokusAbrechnen(); // ein laufender Timer wird sauber beendet
  tonVorbereiten();

  const dauer = phasenDauer("fokus");
  timer = { aktiv: true, bezug, titel, fachId, phase: "fokus", dauer, ende: Date.now() + dauer * 1000, rest: dauer, laeuft: true, runde: 0 };
  timerSpeichern();
  oeffneTimer();
}

function naechstePhase(abgeschlossen) {
  if (timer.phase === "fokus") {
    if (abgeschlossen) {
      timer.runde++;
      fokusGutschreiben(Math.round(timer.dauer / 60), timer.fachId);
    } else {
      fokusAbrechnen();
    }
    timer.phase = abgeschlossen && timer.runde % 4 === 0 ? "langpause" : "pause";
  } else {
    timer.phase = "fokus";
  }

  timer.dauer = phasenDauer(timer.phase);
  timer.ende = Date.now() + timer.dauer * 1000;
  timer.rest = timer.dauer;
  timer.laeuft = true;
  timerSpeichern();

  if (abgeschlossen) {
    klingeln();
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    zeigeToast(timer.phase === "fokus" ? "Pause vorbei – weiter geht's" : `Runde geschafft! ${PHASEN[timer.phase]}`);
  }
  timerRendern();
}

function timerUmschalten() {
  if (!timer || timer.art === "fokus") return; // Fokus-Zeit lässt sich nicht pausieren
  tonVorbereiten();
  if (timer.laeuft) {
    timer.rest = restSekunden();
    timer.laeuft = false;
  } else {
    timer.ende = Date.now() + timer.rest * 1000;
    timer.laeuft = true;
  }
  timerSpeichern();
  timerRendern();
}

// Restzeit um ±5 Minuten ändern (mindestens 1 Minute bleibt übrig)
function timerAnpassen(minutenDelta) {
  if (!timer || timer.art === "fokus") return;
  const rest = restSekunden();
  const neu = Math.max(60, rest + minutenDelta * 60);
  timer.dauer = Math.max(timer.dauer + (neu - rest), neu);
  if (timer.laeuft) timer.ende = Date.now() + neu * 1000;
  else timer.rest = neu;
  timerSpeichern();
  timerTick();
}

function timerStoppen() {
  if (!timer) return;
  if (timer.art === "fokus") fokusSitzungBeenden(); // speichert die Sitzung und hebt die Sperre auf (js/fokus.js)
  else fokusAbrechnen();
  timer = null;
  timerSpeichern();
  schliesseTimer();
  document.title = "Lernbegleiter";
  allesAktualisieren();
}

// „Aufgabe erledigt“: Hausaufgabe abhaken bzw. Lernblock als gelernt markieren
function timerErledigt() {
  if (!timer || !timer.bezug) return; // freies Lernen im Fokus-Tab hat keine Aufgabe
  const { bezug } = timer;
  timer.erledigt = true;
  if (bezug.typ === "ha") {
    const liste = hausaufgaben();
    const aufgabe = liste.find((a) => a.id === bezug.id);
    if (aufgabe && !aufgabe.erledigt) {
      aufgabe.erledigt = true;
      aufgabe.erledigtAm = Date.now();
      speichern(HA_SCHLUESSEL, liste);
    }
  } else {
    const ids = gelerntHeute();
    if (!ids.includes(bezug.id)) speichern(GELERNT_SCHLUESSEL, { datum: datumKey(new Date()), ids: [...ids, bezug.id] });
  }
  timerStoppen();
  zeigeToast("Erledigt – stark! ✓");
}

function timerHtml() {
  if (timer.art === "fokus") return fokusTimerHtml(); // eigene Ansicht für die Fokus-Zeit (js/fokus.js)
  const fach = FAECHER[timer.fachId] || { name: "" };
  const istFokus = timer.phase === "fokus";
  const geschafft = istFokus ? timer.runde % 4 : timer.runde % 4 || (timer.runde ? 4 : 0);
  const rest = restSekunden();

  return `
    <div class="timer-leiste">
      <button class="text-knopf" data-aktion="timer-zu">${SYMBOL.runter} Minimieren</button>
      <button class="text-knopf timer-heute" data-aktion="statistik-aus-timer">${fokusHeute() ? `Heute ${dauerText(fokusHeute())} fokussiert` : "Deine erste Runde heute"} ›</button>
    </div>
    <div class="timer-inhalt ${istFokus ? "" : "ist-pause"}">
      <p class="timer-phase">${PHASEN[timer.phase]}${istFokus ? ` · Runde ${(timer.runde % 4) + 1} von 4` : ""}</p>
      <h2 class="timer-titel">${esc(istFokus ? timer.titel : "Kurz durchatmen")}</h2>
      <p class="timer-fach">${esc(istFokus ? fach.name : `Danach: ${timer.titel}`)}</p>

      <div class="timer-ring">
        <svg viewBox="0 0 220 220" aria-hidden="true">
          <circle class="ring-spur" cx="110" cy="110" r="100"/>
          <circle class="ring-wert" id="ring-wert" cx="110" cy="110" r="100" stroke-dasharray="${RING_UMFANG}" stroke-dashoffset="${RING_UMFANG * (1 - rest / timer.dauer)}"/>
        </svg>
        <div class="timer-mitte">
          <span class="timer-zeit" id="timer-zeit" role="timer">${uhr(rest)}</span>
          <span class="timer-bis" id="timer-bis"></span>
        </div>
      </div>

      <div class="timer-anpassen">
        <button class="chip" data-aktion="timer-minus" aria-label="5 Minuten weniger">−5 Min.</button>
        <button class="chip" data-aktion="timer-plus" aria-label="5 Minuten mehr">+5 Min.</button>
      </div>

      <div class="timer-punkte" aria-label="${geschafft} von 4 Runden geschafft">
        ${[0, 1, 2, 3].map((i) => `<span class="${i < geschafft ? "voll" : ""}"></span>`).join("")}
      </div>

      <div class="timer-knoepfe">
        <button class="timer-knopf" data-aktion="timer-stopp" aria-label="Timer beenden">${SYMBOL.stopp}</button>
        <button class="timer-knopf gross" data-aktion="timer-pause" aria-label="${timer.laeuft ? "Pausieren" : "Fortsetzen"}">${timer.laeuft ? SYMBOL.pause : SYMBOL.play}</button>
        <button class="timer-knopf" data-aktion="timer-weiter" aria-label="Phase überspringen">${SYMBOL.weiter}</button>
      </div>

      <button class="knopf timer-erledigt drueckbar" data-aktion="timer-erledigt">${SYMBOL.hakenKlein} Aufgabe erledigt</button>
    </div>`;
}

function timerRendern() {
  if (!timer) return;
  if (timerOffen) $("#timer").innerHTML = timerHtml();
  miniAktualisieren();
  timerTick();
}

// Läuft viermal pro Sekunde: Zeit, Ring und Mini-Pille aktualisieren
function timerTick() {
  if (!timer || !timer.aktiv || timer.fertig) return;
  if (timer.laeuft && Date.now() >= timer.ende) {
    if (timer.art !== "fokus") return naechstePhase(true);
    if (typeof fokusGeschafft === "function") fokusGeschafft(true);
    return;
  }

  const rest = restSekunden();
  const zeit = uhr(rest);

  if (timerOffen) {
    const anzeige = $("#timer-zeit");
    if (anzeige && anzeige.textContent !== zeit) anzeige.textContent = zeit;
    const ring = $("#ring-wert");
    if (ring) ring.style.strokeDashoffset = RING_UMFANG * (1 - rest / timer.dauer);
    const bis = $("#timer-bis");
    if (bis) bis.textContent = timer.laeuft ? `bis ${zeitText(jetztInMinuten(new Date(timer.ende)))}` : "pausiert";
  }

  const miniZeit = $("#timer-mini .mini-zeit");
  if (miniZeit) miniZeit.textContent = zeit;
  document.title = `${zeit} · ${PHASEN[timer.phase]}`;
  if (timer.art === "fokus" && typeof fokusTick === "function") fokusTick(rest);
}

function miniAktualisieren() {
  const mini = $("#timer-mini");
  const zeigen = !!timer && !timerOffen;
  if (zeigen) {
    mini.innerHTML = `
      <span class="punkt ${timer.laeuft ? "" : "steht"}"></span>
      <span class="mini-zeit">${timer.fertig ? "Geschafft ✓" : uhr(restSekunden())}</span>
      <span class="mini-titel">${esc(timer.phase === "fokus" ? timer.titel : PHASEN[timer.phase])}</span>`;
  }
  mini.classList.toggle("sichtbar", zeigen);
  mini.setAttribute("aria-hidden", String(!zeigen));
}

function oeffneTimer() {
  if (!timer) return;
  timerOffen = true;
  const element = $("#timer");
  element.setAttribute("aria-hidden", "false");
  timerRendern();
  requestAnimationFrame(() => element.classList.add("offen"));
}

function schliesseTimer() {
  timerOffen = false;
  const element = $("#timer");
  element.classList.remove("offen");
  element.setAttribute("aria-hidden", "true");
  miniAktualisieren();
}

// Beim Start: einen gespeicherten Timer wieder aufnehmen
function timerLaden() {
  timer = laden(TIMER_SCHLUESSEL, null);
  if (!timer || !timer.aktiv) {
    timer = null;
    return;
  }
  // Ist die Phase abgelaufen, während die App zu war? Dann pausiert in die nächste Phase.
  // (Eine abgelaufene Fokus-Zeit schließt js/fokus.js beim Start ab.)
  if (timer.art !== "fokus" && timer.laeuft && Date.now() >= timer.ende) {
    if (timer.phase === "fokus") {
      timer.runde++;
      fokusGutschreiben(Math.round(timer.dauer / 60), timer.fachId);
      timer.phase = timer.runde % 4 === 0 ? "langpause" : "pause";
    } else {
      timer.phase = "fokus";
    }
    timer.dauer = phasenDauer(timer.phase);
    timer.rest = timer.dauer;
    timer.laeuft = false;
    timerSpeichern();
  }
  miniAktualisieren();
  timerTick();
}

// ---------- Abhaken & Löschen ----------

let aktualisierenTimer;
function spaeterAktualisieren(verzoegerung) {
  clearTimeout(aktualisierenTimer);
  aktualisierenTimer = setTimeout(() => allesAktualisieren(), verzoegerung);
}

function aufgabeUmschalten(knopf) {
  const zeile = knopf.closest("[data-aufgabe]");
  const liste = hausaufgaben();
  const aufgabe = liste.find((a) => a.id === zeile.dataset.aufgabe);
  if (!aufgabe) return;

  // Eine Quiz-Aufgabe hakt sich selbst ab, sobald alle Fragen sitzen
  if (aufgabe.quizSet && !aufgabe.erledigt && typeof lernsetFortschritt === "function") {
    const f = lernsetFortschritt(aufgabe.quizSet);
    if (f && f.sitzen < f.gesamt) return zeigeToast(`Erledigt sich von selbst, wenn alle ${f.gesamt} Fragen sitzen`);
  }

  aufgabe.erledigt = !aufgabe.erledigt;
  aufgabe.erledigtAm = aufgabe.erledigt ? Date.now() : null;
  speichern(HA_SCHLUESSEL, liste);

  zeile.classList.toggle("erledigt", aufgabe.erledigt);
  knopf.setAttribute("aria-pressed", aufgabe.erledigt);
  spaeterAktualisieren(900); // erst den Haken zeigen, dann neu sortieren
}

function aufgabeLoeschen(knopf) {
  const zeile = knopf.closest("[data-aufgabe]");
  speichern(HA_SCHLUESSEL, hausaufgaben().filter((a) => a.id !== zeile.dataset.aufgabe));
  zeile.classList.add("weg");
  spaeterAktualisieren(300);
}

function lernenUmschalten(knopf) {
  const zeile = knopf.closest("[data-lernen]");
  const id = zeile.dataset.lernen;
  const ids = gelerntHeute();
  const gelernt = !ids.includes(id);
  speichern(GELERNT_SCHLUESSEL, { datum: datumKey(new Date()), ids: gelernt ? [...ids, id] : ids.filter((x) => x !== id) });

  zeile.classList.toggle("erledigt", gelernt);
  knopf.setAttribute("aria-pressed", gelernt);
  spaeterAktualisieren(900);
}

function klausurLoeschen(knopf) {
  const zeile = knopf.closest("[data-klausur]");
  speichern(KL_SCHLUESSEL, laden(KL_SCHLUESSEL, []).filter((k) => k.id !== zeile.dataset.klausur));
  zeile.style.transition = "opacity 0.3s, transform 0.3s";
  zeile.style.opacity = "0";
  zeile.style.transform = "translateX(30px)";
  spaeterAktualisieren(300);
}

// Alles neu zeichnen, was sich durch eine Änderung verschoben haben könnte
function allesAktualisieren(sanft) {
  const bereich = document.getElementById("ansicht-" + zustand.ansicht);
  render(zustand.ansicht, false);
  if (sanft) {
    bereich.classList.remove("wechsel");
    void bereich.offsetWidth;
    bereich.classList.add("wechsel");
  }
  if (zustand.offenesFach) {
    fachNotenRendern(zustand.offenesFach);
    fachAufgabenRendern(zustand.offenesFach);
    if (typeof quizBereichRendern === "function") quizBereichRendern(zustand.offenesFach);
  }
}

let toastTimer;
function zeigeToast(text) {
  const toast = $("#toast");
  toast.textContent = text;
  toast.classList.add("sichtbar");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("sichtbar"), 2200);
}

// ---------- Anzeigen & Animieren ----------

// Startet die „Nacheinander-hochgleiten“-Animation für einen Bereich
function animieren(bereich) {
  bereich.classList.remove("animieren");
  void bereich.offsetWidth;
  bereich.classList.add("animieren");
  clearTimeout(bereich._timer);
  bereich._timer = setTimeout(() => bereich.classList.remove("animieren"), 1600);
}

// Fortschrittsbalken füllen – beim ersten Anzeigen mit Animation
function balkenSetzen(bereich, animiert) {
  bereich.querySelectorAll("[data-wert]").forEach((balken) => {
    if (animiert) {
      requestAnimationFrame(() => requestAnimationFrame(() => balken.style.setProperty("--wert", balken.dataset.wert)));
    } else {
      balken.style.transition = "none";
      balken.style.setProperty("--wert", balken.dataset.wert);
    }
  });
}

const ANSICHT_HTML = {
  heute: heuteHtml,
  woche: wocheHtml,
  aufgaben: aufgabenHtml,
  klausuren: klausurenHtml,
  faecher: faecherHtml
};

function render(name, animiert) {
  const bereich = document.getElementById("ansicht-" + name);
  bereich.innerHTML = ANSICHT_HTML[name]();
  if (animiert) animieren(bereich);
  balkenSetzen(bereich, animiert);
}

function zeigeAnsicht(name) {
  if (!ANSICHTEN.includes(name)) return;
  zustand.ansicht = name;

  document.querySelectorAll(".ansicht").forEach((a) => a.classList.toggle("aktiv", a.dataset.ansicht === name));
  document.querySelectorAll(".tab").forEach((tab) => {
    const aktiv = tab.dataset.ziel === name;
    tab.classList.toggle("aktiv", aktiv);
    if (aktiv) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
  });
  $(".tabbar").style.setProperty("--pos", ANSICHTEN.indexOf(name));

  render(name, true);
  window.scrollTo({ top: 0 });
}

// ---------- Lernthemen auf der Fachseite ----------

function themaUmschalten(knopf) {
  const id = zustand.offenesFach;
  const zeile = knopf.closest(".thema");
  const themen = themenVon(id);
  const thema = themen[Number(zeile.dataset.index)];
  thema.erledigt = !thema.erledigt;
  speichern("lb-themen-" + id, themen);

  zeile.classList.toggle("erledigt", thema.erledigt);
  knopf.setAttribute("aria-pressed", thema.erledigt);
  const geschafft = themen.filter((t) => t.erledigt).length;
  $("#themen-zaehler").textContent = `${geschafft} von ${themen.length} geschafft`;
}

function themaLoeschen(knopf) {
  const id = zustand.offenesFach;
  const zeile = knopf.closest(".thema");
  const themen = themenVon(id);
  themen.splice(Number(zeile.dataset.index), 1);
  speichern("lb-themen-" + id, themen);
  zeile.classList.add("weg");
  setTimeout(() => themenRendern(id), 280);
}

// ---------- Klicks & Eingaben ----------

const AKTIONEN = {
  "zurueck": () => schliesseSeite(),
  "einstellungen": () => oeffneEinstellungen(),
  "statistik": () => oeffneStatistik(),
  "stat-zurueck": () => statistikWoche(-1),
  "stat-vor": () => statistikWoche(1),
  "statistik-aus-timer": () => {
    schliesseTimer();
    oeffneStatistik();
  },
  "abhaken": themaUmschalten,
  "entfernen": themaLoeschen,
  "ha-abhaken": aufgabeUmschalten,
  "ha-entfernen": aufgabeLoeschen,
  "lernen-abhaken": lernenUmschalten,
  "kl-entfernen": klausurLoeschen,
  "sheet-auf": () => oeffneSheet("hausaufgabe", zustand.offenesFach),
  "klausur-auf": () => oeffneSheet("klausur", zustand.offenesFach),
  "note-auf": () => oeffneSheet("note", zustand.offenesFach),
  "note-fuer-klausur": noteFuerKlausur,
  "no-entfernen": noteLoeschen,
  "timer-start": timerStarten,
  "timer-auf": () => oeffneTimer(),
  "timer-zu": () => schliesseTimer(),
  "timer-pause": () => timerUmschalten(),
  "timer-weiter": () => naechstePhase(false),
  "timer-stopp": () => timerStoppen(),
  "timer-minus": () => timerAnpassen(-5),
  "timer-plus": () => timerAnpassen(5),
  "timer-erledigt": () => timerErledigt(),
  "sheet-zu": () => schliesseSheet()
};

document.addEventListener("click", (e) => {
  const aktionKnopf = e.target.closest("[data-aktion]");
  if (aktionKnopf && AKTIONEN[aktionKnopf.dataset.aktion]) {
    return AKTIONEN[aktionKnopf.dataset.aktion](aktionKnopf);
  }

  const tab = e.target.closest(".tab, [data-gehe]");
  if (tab) return zeigeAnsicht(tab.dataset.ziel || tab.dataset.gehe);

  const tagKnopf = e.target.closest("[data-tag]");
  if (tagKnopf) return waehleTag(Number(tagKnopf.dataset.tag));

  const einstellung = e.target.closest("[data-einstellung]");
  if (einstellung) return einstellungWaehlen(einstellung);

  // Fach im Fenster von unten wählen
  const fachChip = e.target.closest("[data-blatt-fach]");
  if (fachChip) {
    blatt.fachId = fachChip.dataset.blattFach;
    $("#blatt-faecher").querySelectorAll(".chip").forEach((c) => c.classList.toggle("aktiv", c === fachChip));
    fachChip.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    if (zustand.sheet === "hausaufgabe") {
      if (blatt.modus === "stunde") faelligSetzen("stunde", naechsterUnterrichtstag(blatt.fachId));
      else $("#ha-faellig").innerHTML = faelligChipsHtml();
    }
    return;
  }

  const faelligChip = e.target.closest("[data-ha-faellig]");
  if (faelligChip) return faelligSetzen(faelligChip.dataset.haFaellig, faelligChip.dataset.key);

  const dauerChip = e.target.closest("[data-ha-dauer]");
  if (dauerChip) {
    blatt.dauer = Number(dauerChip.dataset.haDauer);
    $("#ha-dauer").querySelectorAll(".chip").forEach((c) => c.classList.toggle("aktiv", c === dauerChip));
    return;
  }

  const klDatumChip = e.target.closest("[data-kl-datum]");
  if (klDatumChip) return klausurDatumSetzen(klDatumChip.dataset.klDatum);

  const artChip = e.target.closest("[data-no-art]");
  if (artChip) {
    blatt.art = artChip.dataset.noArt;
    $("#no-arten").querySelectorAll(".chip").forEach((c) => c.classList.toggle("aktiv", c === artChip));
    return;
  }

  const punkteKnopf = e.target.closest("[data-no-punkte]");
  if (punkteKnopf) {
    blatt.punkte = Number(punkteKnopf.dataset.noPunkte);
    $("#no-punkte").querySelectorAll(".punkte-knopf").forEach((k) => k.classList.toggle("aktiv", k === punkteKnopf));
    $("#blatt-speichern").disabled = false;
    return;
  }

  const fachKnopf = e.target.closest("[data-fach]");
  if (fachKnopf) return oeffneFach(fachKnopf.dataset.fach);
});

document.addEventListener("submit", (e) => {
  e.preventDefault();

  if (e.target.id === "ha-form") return hausaufgabeSpeichern();
  if (e.target.id === "kl-form") return klausurSpeichern();
  if (e.target.id === "no-form") return noteSpeichern();

  if (e.target.id === "themen-form") {
    const eingabe = $("#themen-eingabe");
    const text = eingabe.value.trim();
    if (!text) return;
    const id = zustand.offenesFach;
    const themen = themenVon(id);
    themen.push({ text, erledigt: false });
    speichern("lb-themen-" + id, themen);
    eingabe.value = "";
    themenRendern(id, themen.length - 1);
  }
});

let notizTimer;
document.addEventListener("input", (e) => {
  const ziel = e.target;

  if (ziel.id === "ha-text") $("#blatt-speichern").disabled = !ziel.value.trim();
  if (ziel.id === "ha-datum" && ziel.value) faelligSetzen("datum", ziel.value);
  if (ziel.id === "kl-datum" && ziel.value) klausurDatumSetzen(ziel.value);
  if (ziel.id === "einst-name") einstellungAendern("name", ziel.value.trim());

  // Notizen speichern sich automatisch, kurz nachdem du aufhörst zu tippen
  if (ziel.id === "notizen") {
    const id = zustand.offenesFach;
    const status = $("#notiz-status");
    status.textContent = "Speichert …";
    clearTimeout(notizTimer);
    notizTimer = setTimeout(() => {
      speichern("lb-notizen-" + id, ziel.value);
      status.textContent = "Gespeichert";
    }, 500);
  }
});

document.addEventListener("keydown", (e) => {
  // Während eines Quiz kümmert sich js/quiz.js um die Tasten
  if (typeof quizOffen !== "undefined" && quizOffen) return;

  // Escape: erst Timer bzw. Fenster schließen, dann die Seite
  if (e.key === "Escape") {
    if (timerOffen) schliesseTimer();
    else if (zustand.sheet) schliesseSheet();
    else schliesseSeite();
  }
  // Leertaste pausiert den Timer, wenn er offen ist
  if (e.key === " " && timerOffen && !["INPUT", "TEXTAREA"].includes(e.target.tagName)) {
    e.preventDefault();
    timerUmschalten();
  }
  // Strg/Cmd + Enter speichert im Fenster
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && zustand.sheet) {
    if (zustand.sheet === "hausaufgabe") hausaufgabeSpeichern();
    else if (zustand.sheet === "klausur") klausurSpeichern();
    else if (zustand.sheet === "note") noteSpeichern();
  }
});

// ---------- Start ----------

farbschemaAnwenden(false);
hellAbfrage.addEventListener("change", () => farbschemaAnwenden(true));
zeigeAnsicht("heute");
timerLaden();
setInterval(timerTick, 250);

// Jede halbe Minute die Zeiten aktualisieren (ohne Animation)
setInterval(() => {
  if (zustand.ansicht === "heute" && !zustand.sheet) render("heute", false);
}, 30000);
