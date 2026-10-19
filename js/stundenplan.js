// ==========================================================
// Lernbegleiter – Stundenplan bearbeiten
// Fächer, Stundenzeiten und Wochenplan direkt in der App ändern
// und den Stundenplan als Datei teilen.
// Nutzt Hilfsfunktionen aus app.js, deshalb wird diese Datei nach app.js geladen.
//
// Änderungen wirken sofort: FAECHER, STUNDEN und STUNDENPLAN (aus daten.js)
// werden direkt verändert und danach im Speicher gesichert.
// ==========================================================

// Vorschlag für neue Nutzer ohne Stundenplan (45-Minuten-Stunden)
const STANDARD_STUNDEN = [
  { nr: 1, start: "08:00", ende: "08:45" },
  { nr: 2, start: "08:50", ende: "09:35" },
  { nr: 3, start: "09:55", ende: "10:40" },
  { nr: 4, start: "10:45", ende: "11:30" },
  { nr: 5, start: "11:50", ende: "12:35" },
  { nr: 6, start: "12:40", ende: "13:25" }
];

const KURSE = [["Leistungskurs", "LK"], ["Grundkurs", "GK"], ["Projektkurs", "Projektkurs"]];

// Was im Editor gerade los ist
const editor = {
  reiter: "plan", // "plan", "faecher" oder "zeiten"
  tag: 1, // 1 = Montag … 5 = Freitag
  von: "einstellungen", // wohin „Zurück“ führt
  fachId: null, // das Fach im Bearbeiten-Fenster (null = neues Fach)
  kurs: "Grundkurs",
  loeschenBestaetigen: false,
  slot: null, // die Stunde im Belegen-Fenster
  fachWahl: null
};

// ---------- Speichern ----------

function stundenplanSpeichern() {
  speichern(STUNDENPLAN_SCHLUESSEL, { faecher: FAECHER, stunden: STUNDEN, plan: STUNDENPLAN });
}

// Sorgt dafür, dass es Stundenzeiten und für jeden Tag eine Liste gibt
function stundenplanVorbereiten() {
  if (!STUNDEN.length) STANDARD_STUNDEN.forEach((s) => STUNDEN.push({ ...s }));
  for (let tag = 1; tag <= 5; tag++) {
    if (!Array.isArray(STUNDENPLAN[tag])) STUNDENPLAN[tag] = [];
  }
}

function stundenProWocheGesamt() {
  return [1, 2, 3, 4, 5].reduce((summe, tag) => summe + (STUNDENPLAN[tag] || []).filter((e) => e && FAECHER[e[0]]).length, 0);
}

// "Mathematik" → "mathematik", "Ev. Religion" → "ev-religion"; immer eindeutig
function neueFachId(name) {
  const basis = name.toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "fach";
  let id = basis;
  for (let i = 2; FAECHER[id]; i++) id = `${basis}-${i}`;
  return id;
}

// ---------- Die Editor-Seite ----------

function editorKopfText() {
  const faecher = Object.keys(FAECHER).length;
  return `${faecher} ${faecher === 1 ? "Fach" : "Fächer"} · ${stundenProWocheGesamt()} Stunden pro Woche`;
}

function editorHtml() {
  const reiter = [["plan", "Wochenplan"], ["faecher", "Fächer"], ["zeiten", "Zeiten"]];
  const pos = reiter.findIndex(([wert]) => wert === editor.reiter);
  const zurueckName = editor.von === "einstellungen" ? "Einstellungen" : ANSICHT_NAMEN[zustand.ansicht];

  return `
    <div class="detail-leiste">
      <button class="zurueck" data-aktion="zurueck">${SYMBOL.zurueck}${zurueckName}</button>
    </div>
    <div class="detail-inhalt editor">
      <header class="kopf stagger" style="--i:0">
        <p class="kopf-oben" id="editor-kopf">${editorKopfText()}</p>
        <h1>Stundenplan</h1>
      </header>

      <div class="segment stagger" style="--i:1; --anzahl:3; --pos:${pos}" role="tablist" id="editor-reiter">
        <span class="segment-daumen"></span>
        ${reiter.map(([wert, text], i) => `<button type="button" role="tab" aria-selected="${i === pos}" class="${i === pos ? "aktiv" : ""}" data-editor-reiter="${wert}">${text}</button>`).join("")}
      </div>

      <div class="stagger" style="--i:2" id="editor-inhalt">${editorInhaltHtml()}</div>

      <h2 class="abschnitt stagger" style="--i:3">Teilen</h2>
      <div class="stagger" style="--i:3">
        <button type="button" class="knopf breit zweit drueckbar editor-teilen" data-aktion="stundenplan-teilen">Stundenplan als Datei teilen</button>
        <p class="hinweis">Die Datei enthält nur Fächer, Lehrkräfte, Räume und Zeiten, keine Noten und keine Hausaufgaben. Wer dieselben Kurse hat, lädt sie unter Einstellungen → Wiederherstellen.</p>
      </div>
    </div>`;
}

function editorInhaltHtml() {
  if (editor.reiter === "faecher") return faecherListeHtml();
  if (editor.reiter === "zeiten") return zeitenListeHtml();
  return wochenplanHtml();
}

// --- Reiter „Wochenplan“ ---

function wochenplanHtml() {
  if (!Object.keys(FAECHER).length) {
    return `
      <div class="liste"><p class="leer">Lege zuerst deine Fächer an. Danach kannst du sie hier in den Wochenplan eintragen.</p></div>
      <button type="button" class="knopf breit drueckbar editor-knopf" data-editor-reiter="faecher">Zu den Fächern</button>`;
  }

  const tage = [1, 2, 3, 4, 5];
  const plan = STUNDENPLAN[editor.tag] || [];
  return `
    <div class="segment editor-tage" style="--pos:${editor.tag - 1}" role="tablist">
      <span class="segment-daumen"></span>
      ${tage.map((tag) => `<button type="button" role="tab" aria-selected="${tag === editor.tag}" class="${tag === editor.tag ? "aktiv" : ""}" data-editor-tag="${tag}">${TAG_KURZ[tag]}</button>`).join("")}
    </div>
    <div class="liste">
      ${STUNDEN.map((stunde, i) => {
        const eintrag = plan[i];
        const fach = eintrag && FAECHER[eintrag[0]];
        return `
          <button type="button" class="zeile drueckbar" data-editor-slot="${i}">
            <span class="zeile-zeit">${stunde.start}<small>${stunde.ende}</small></span>
            ${fach ? monoHtml(fach) : '<span class="mono leer" aria-hidden="true">–</span>'}
            <span>
              <span class="zeile-name ${fach ? "" : "frei"}">${fach ? esc(fach.name) : "Frei"}</span>
              <span class="zeile-info">${fach ? esc([eintrag[1], fach.lehrer].filter(Boolean).join(" · ") || "Kein Raum") : `${stunde.nr}. Stunde`}</span>
            </span>
            ${SYMBOL.pfeil}
          </button>`;
      }).join("")}
    </div>
    <p class="hinweis">Tippe auf eine Stunde, um ein Fach und den Raum einzutragen.</p>`;
}

// --- Reiter „Fächer“ ---

function faecherListeHtml() {
  const ids = Object.keys(FAECHER);
  const liste = ids.length
    ? `<div class="liste">${ids.map((id) => {
        const fach = FAECHER[id];
        const info = [fach.kurs, fach.lehrer].filter(Boolean).join(" · ");
        return `
          <button type="button" class="editor-zeile drueckbar" data-editor-fach="${id}">
            ${monoHtml(fach)}
            <span>
              <span class="zeile-name">${esc(fach.name)}</span>
              <span class="zeile-info">${esc(info)}</span>
            </span>
            ${SYMBOL.pfeil}
          </button>`;
      }).join("")}</div>`
    : '<div class="liste"><p class="leer">Noch keine Fächer. Leg dein erstes Fach an.</p></div>';

  return `${liste}
    <button type="button" class="knopf breit drueckbar editor-knopf" data-aktion="editor-fach-neu">Fach hinzufügen</button>`;
}

// --- Reiter „Zeiten“ ---

function zeitenListeHtml() {
  return `
    <div class="liste">
      ${STUNDEN.map((stunde, i) => `
        <div class="editor-zeit">
          <span class="editor-nr">${i + 1}.</span>
          <input type="time" id="zeit-${i}-start" data-zeit="${i}" data-feld="start" value="${stunde.start}" aria-label="${i + 1}. Stunde Beginn">
          <span class="editor-bis">bis</span>
          <input type="time" id="zeit-${i}-ende" data-zeit="${i}" data-feld="ende" value="${stunde.ende}" aria-label="${i + 1}. Stunde Ende">
          <button type="button" class="entfernen" data-aktion="editor-stunde-loeschen" data-index="${i}" aria-label="${i + 1}. Stunde entfernen">${SYMBOL.kreuz}</button>
        </div>`).join("")}
    </div>
    <p class="quiz-fehler" id="zeit-fehler" role="alert"></p>
    <button type="button" class="knopf breit drueckbar editor-knopf" data-aktion="editor-stunde-neu">Stunde hinzufügen</button>`;
}

// ---------- Öffnen, Umschalten, Schließen ----------

function editorOeffnen() {
  editor.von = zustand.einstellungenOffen ? "einstellungen" : "ansicht";
  editor.reiter = hatStundenplan() ? "plan" : "faecher";
  const heute = new Date().getDay();
  editor.tag = heute >= 1 && heute <= 5 ? heute : 1;
  stundenplanVorbereiten();

  zustand.offenesFach = null;
  zustand.einstellungenOffen = false;
  zustand.statistikOffen = false;
  zustand.editorOffen = true;
  seiteOeffnen(editorHtml());
}

function editorInhaltRendern() {
  const inhalt = $("#editor-inhalt");
  if (!inhalt) return;
  inhalt.innerHTML = editorInhaltHtml();
  const kopf = $("#editor-kopf");
  if (kopf) kopf.textContent = editorKopfText();
}

function reiterWaehlen(reiter) {
  editor.reiter = reiter;
  const segment = $("#editor-reiter");
  const knoepfe = [...segment.querySelectorAll("button")];
  const pos = knoepfe.findIndex((k) => k.dataset.editorReiter === reiter);
  segment.style.setProperty("--pos", pos);
  knoepfe.forEach((k, i) => {
    k.classList.toggle("aktiv", i === pos);
    k.setAttribute("aria-selected", i === pos);
  });
  editorInhaltRendern();
  const inhalt = $("#editor-inhalt");
  inhalt.classList.remove("wechsel");
  void inhalt.offsetWidth;
  inhalt.classList.add("wechsel");
}

function editorSchliessen() {
  if (editor.von === "einstellungen") {
    zustand.editorOffen = false;
    oeffneEinstellungen();
  } else {
    schliesseSeite(); // setzt editorOffen selbst zurück und zeichnet die Ansicht neu
  }
}

// ---------- Fenster: Fach anlegen oder bearbeiten ----------

function editorSheetOeffnen(html, titel, typ) {
  zustand.sheet = typ;
  const sheet = $("#sheet");
  sheet.innerHTML = html;
  sheet.setAttribute("aria-label", titel);
  sheet.setAttribute("aria-hidden", "false");
  sheet.scrollTop = 0;
  requestAnimationFrame(() => {
    sheet.classList.add("offen");
    $("#sheet-hintergrund").classList.add("offen");
  });
}

function fachSheetHtml() {
  const fach = editor.fachId ? FAECHER[editor.fachId] : null;
  return `
    ${sheetKopfHtml(fach ? "Fach bearbeiten" : "Neues Fach")}
    <label class="feld-titel" for="sp-name">Name</label>
    <input class="feld" id="sp-name" type="text" maxlength="40" autocomplete="off" placeholder="z. B. Mathematik" value="${fach ? esc(fach.name) : ""}">

    <div class="sp-zwei">
      <div>
        <label class="feld-titel" for="sp-kuerzel">Kürzel</label>
        <input class="feld" id="sp-kuerzel" type="text" maxlength="3" autocomplete="off" placeholder="M" value="${fach ? esc(fach.kuerzel) : ""}">
      </div>
      <div>
        <label class="feld-titel" for="sp-lehrer">Lehrkraft</label>
        <input class="feld" id="sp-lehrer" type="text" maxlength="40" autocomplete="off" placeholder="z. B. Frau Müller" value="${fach ? esc(fach.lehrer || "") : ""}">
      </div>
    </div>

    <span class="feld-titel">Kurs</span>
    <div class="chips stundenplan-faecher sp-fachwahl" id="sp-kurse">
      ${KURSE.map(([kurs, kurz]) => `<button type="button" class="chip ${kurs === editor.kurs ? "aktiv" : ""}" data-sp-kurs="${kurs}">${kurs === "Projektkurs" ? kurs : `${kurs} (${kurz})`}</button>`).join("")}
    </div>

    <p class="quiz-fehler" id="sp-fehler" role="alert"></p>
    <div class="quiz-knoepfe">
      <button type="button" class="knopf breit drueckbar" data-aktion="editor-fach-speichern">Speichern</button>
      ${fach ? '<button type="button" class="knopf breit zweit drueckbar" id="sp-loeschen" data-aktion="editor-fach-loeschen">Fach löschen</button>' : ""}
      <p class="hinweis sp-loeschen-info" id="sp-loeschen-info" hidden></p>
    </div>`;
}

function fachSheetOeffnen(id) {
  editor.fachId = id || null;
  editor.kurs = id ? FAECHER[id].kurs || "Grundkurs" : "Grundkurs";
  editor.loeschenBestaetigen = false;
  editorSheetOeffnen(fachSheetHtml(), id ? "Fach bearbeiten" : "Neues Fach", "editor-fach");
  if (!id) setTimeout(() => $("#sp-name").focus({ preventScroll: true }), 450);
}

// "Mathematik" → "MA", "Ev. Religion" → "ER"
function kuerzelVorschlag(name) {
  const woerter = name.replace(/[^A-Za-zÄÖÜäöüß ]/g, " ").split(/\s+/).filter(Boolean);
  if (woerter.length >= 2) return (woerter[0][0] + woerter[1][0]).toUpperCase();
  return (woerter[0] || "").slice(0, 2).toUpperCase();
}

function fachSpeichern() {
  const name = $("#sp-name").value.trim();
  const lehrer = $("#sp-lehrer").value.trim();
  const kuerzel = ($("#sp-kuerzel").value.trim() || kuerzelVorschlag(name)).toUpperCase();
  const fehler = $("#sp-fehler");

  if (!name) {
    fehler.textContent = "Gib dem Fach einen Namen.";
    $("#sp-name").focus();
    return;
  }
  const doppelt = Object.entries(FAECHER).find(([id, f]) => id !== editor.fachId && f.name.toLowerCase() === name.toLowerCase());
  if (doppelt) {
    fehler.textContent = `Das Fach „${name}“ gibt es schon.`;
    return;
  }

  const daten = { name, kuerzel, kurs: editor.kurs, lehrer };
  if (editor.fachId) {
    // Bestehendes Fach ändern – die Kennung bleibt, damit Noten & Co. dazugehören
    const alt = FAECHER[editor.fachId];
    FAECHER[editor.fachId] = { ...daten, ...(alt.kurzname && alt.name === name ? { kurzname: alt.kurzname } : {}) };
  } else {
    FAECHER[neueFachId(name)] = daten;
  }

  stundenplanSpeichern();
  schliesseSheet();
  editorInhaltRendern();
  zeigeToast(editor.fachId ? "Fach gespeichert" : `${name} hinzugefügt`);
}

function fachLoeschen() {
  const id = editor.fachId;
  if (!id) return;

  // Erster Klick: nachfragen und zeigen, was am Fach hängt
  if (!editor.loeschenBestaetigen) {
    editor.loeschenBestaetigen = true;
    const anzahl = [
      [hausaufgaben().filter((a) => a.fachId === id).length, "Hausaufgabe", "Hausaufgaben"],
      [laden(NO_SCHLUESSEL, []).filter((n) => n.fachId === id).length, "Note", "Noten"],
      [klausuren().filter((k) => k.fachId === id).length, "Klausur", "Klausuren"]
    ].filter(([n]) => n).map(([n, eins, viele]) => `${n} ${n === 1 ? eins : viele}`);
    const info = $("#sp-loeschen-info");
    info.textContent = anzahl.length
      ? `Zu diesem Fach gibt es noch ${anzahl.join(", ")}. Sie bleiben erhalten, aber ohne Fach. Das Fach wird auch aus dem Wochenplan entfernt.`
      : "Das Fach wird auch aus dem Wochenplan entfernt.";
    info.hidden = false;
    const knopf = $("#sp-loeschen");
    knopf.textContent = "Wirklich löschen";
    knopf.classList.add("gefahr");
    return;
  }

  // Zweiter Klick: löschen
  const name = FAECHER[id].name;
  delete FAECHER[id];
  for (let tag = 1; tag <= 5; tag++) {
    (STUNDENPLAN[tag] || []).forEach((e, i) => {
      if (e && e[0] === id) STUNDENPLAN[tag][i] = null;
    });
    freieStundenAbschneiden(tag);
  }
  stundenplanSpeichern();
  schliesseSheet();
  editorInhaltRendern();
  zeigeToast(`${name} gelöscht`);
}

// Freie Stunden am Ende eines Tages braucht der Plan nicht zu speichern
function freieStundenAbschneiden(tag) {
  const plan = STUNDENPLAN[tag];
  while (Array.isArray(plan) && plan.length && !plan[plan.length - 1]) plan.pop();
}

// ---------- Fenster: eine Stunde im Wochenplan belegen ----------

// Der zuletzt eingetragene Raum eines Fachs – praktisch als Vorschlag
function letzterRaum(fachId) {
  for (let tag = 1; tag <= 5; tag++) {
    const treffer = (STUNDENPLAN[tag] || []).find((e) => e && e[0] === fachId && e[1]);
    if (treffer) return treffer[1];
  }
  return "";
}

function slotSheetHtml() {
  const stunde = STUNDEN[editor.slot];
  const eintrag = (STUNDENPLAN[editor.tag] || [])[editor.slot];
  return `
    ${sheetKopfHtml(`${WOCHENTAGE[editor.tag]} · ${editor.slot + 1}. Stunde`)}
    <p class="backup-herkunft">${stunde.start} – ${stunde.ende}</p>

    <span class="feld-titel">Fach</span>
    <div class="chips stundenplan-faecher sp-fachwahl" id="sp-fachwahl">
      <button type="button" class="chip ${!editor.fachWahl ? "aktiv" : ""}" data-sp-fachwahl="">Frei</button>
      ${Object.entries(FAECHER).map(([id, f]) => `<button type="button" class="chip ${id === editor.fachWahl ? "aktiv" : ""}" data-sp-fachwahl="${id}">${esc(f.kurzname || f.name)}</button>`).join("")}
    </div>

    <label class="feld-titel" for="sp-raum">Raum</label>
    <input class="feld" id="sp-raum" type="text" maxlength="20" autocomplete="off" placeholder="z. B. A219" value="${eintrag ? esc(eintrag[1] || "") : ""}" ${editor.fachWahl ? "" : "disabled"}>

    <button type="button" class="knopf breit drueckbar" data-aktion="editor-slot-speichern">Speichern</button>`;
}

function slotSheetOeffnen(index) {
  editor.slot = index;
  const eintrag = (STUNDENPLAN[editor.tag] || [])[index];
  editor.fachWahl = eintrag && FAECHER[eintrag[0]] ? eintrag[0] : null;
  editorSheetOeffnen(slotSheetHtml(), `${WOCHENTAGE[editor.tag]}, ${index + 1}. Stunde`, "editor-slot");
}

function slotFachWaehlen(fachId) {
  editor.fachWahl = fachId || null;
  $("#sp-fachwahl").querySelectorAll(".chip").forEach((c) => c.classList.toggle("aktiv", c.dataset.spFachwahl === (fachId || "")));
  const raum = $("#sp-raum");
  raum.disabled = !fachId;
  if (fachId && !raum.value.trim()) raum.value = letzterRaum(fachId);
}

function slotSpeichern() {
  const tag = editor.tag;
  const plan = STUNDENPLAN[tag] || (STUNDENPLAN[tag] = []);
  while (plan.length <= editor.slot) plan.push(null);
  plan[editor.slot] = editor.fachWahl ? [editor.fachWahl, $("#sp-raum").value.trim()] : null;
  freieStundenAbschneiden(tag);

  stundenplanSpeichern();
  schliesseSheet();
  editorInhaltRendern();
}

// ---------- Stundenzeiten ----------

function zeitGeaendert(feld) {
  const i = Number(feld.dataset.zeit);
  const wert = feld.value;
  const meldung = $("#zeit-fehler");
  if (!/^\d{2}:\d{2}$/.test(wert)) return;

  const neu = { ...STUNDEN[i], [feld.dataset.feld]: wert };
  if (minuten(neu.start) >= minuten(neu.ende)) {
    meldung.textContent = `Die ${i + 1}. Stunde muss enden, nachdem sie beginnt.`;
    feld.value = STUNDEN[i][feld.dataset.feld];
    return;
  }
  meldung.textContent = "";
  STUNDEN[i] = neu;
  stundenplanSpeichern();
}

function stundeHinzufuegen() {
  const letzte = STUNDEN[STUNDEN.length - 1];
  const beginn = letzte ? minuten(letzte.ende) + 5 : 8 * 60;
  if (beginn + 45 >= 24 * 60) return zeigeToast("Später geht es nicht mehr.");
  STUNDEN.push({ nr: STUNDEN.length + 1, start: zeitText(beginn), ende: zeitText(beginn + 45) });
  stundenplanSpeichern();
  editorInhaltRendern();
}

function stundeLoeschen(knopf) {
  const i = Number(knopf.dataset.index);
  const belegt = [1, 2, 3, 4, 5].filter((tag) => (STUNDENPLAN[tag] || [])[i]);
  if (belegt.length) {
    $("#zeit-fehler").textContent = `Die ${i + 1}. Stunde ist noch belegt (${belegt.map((t) => TAG_KURZ[t]).join(", ")}). Setze sie im Wochenplan zuerst auf „Frei“.`;
    return;
  }
  STUNDEN.splice(i, 1);
  STUNDEN.forEach((s, n) => { s.nr = n + 1; });
  for (let tag = 1; tag <= 5; tag++) {
    if (Array.isArray(STUNDENPLAN[tag]) && STUNDENPLAN[tag].length > i) STUNDENPLAN[tag].splice(i, 1);
  }
  stundenplanSpeichern();
  editorInhaltRendern();
}

// ---------- Teilen ----------

function stundenplanTeilen() {
  if (!hatStundenplan()) return zeigeToast("Trag zuerst Fächer ein.");
  const datei = {
    app: "lernbegleiter",
    inhalt: "stundenplan",
    version: 1,
    erstellt: new Date().toISOString(),
    stundenplan: { faecher: FAECHER, stunden: STUNDEN, plan: STUNDENPLAN }
  };
  const blob = new Blob([JSON.stringify(datei, null, 2)], { type: "application/json" });
  const adresse = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = adresse;
  link.download = `stundenplan-${datumKey(new Date())}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(adresse), 2000);
  zeigeToast("Stundenplan gespeichert – im Ordner Downloads");
}

// ---------- Bereich in den Einstellungen ----------

function editorBereichHtml() {
  const zusammenfassung = hatStundenplan() ? `${Object.keys(FAECHER).length} Fächer · ${stundenProWocheGesamt()} Std.` : "Noch leer";
  return `
    <h2 class="abschnitt stagger" style="--i:6">Stundenplan</h2>
    <div class="stagger" style="--i:6">
      <button type="button" class="liste editor-link drueckbar" data-aktion="editor-auf">
        <span class="infozeile"><span>Stundenplan bearbeiten</span><span>${zusammenfassung} ›</span></span>
      </button>
    </div>`;
}

// ---------- Klicks & Eingaben ----------

const zurueckVorher = AKTIONEN["zurueck"];

Object.assign(AKTIONEN, {
  "zurueck": () => (zustand.editorOffen ? editorSchliessen() : zurueckVorher()),
  "editor-auf": () => editorOeffnen(),
  "editor-fach-neu": () => fachSheetOeffnen(null),
  "editor-fach-speichern": () => fachSpeichern(),
  "editor-fach-loeschen": () => fachLoeschen(),
  "editor-slot-speichern": () => slotSpeichern(),
  "editor-stunde-neu": () => stundeHinzufuegen(),
  "editor-stunde-loeschen": stundeLoeschen,
  "stundenplan-teilen": () => stundenplanTeilen()
});

document.addEventListener("click", (e) => {
  const reiter = e.target.closest("[data-editor-reiter]");
  if (reiter) return reiterWaehlen(reiter.dataset.editorReiter);

  const tag = e.target.closest("[data-editor-tag]");
  if (tag) {
    editor.tag = Number(tag.dataset.editorTag);
    editorInhaltRendern();
    return;
  }

  const fach = e.target.closest("[data-editor-fach]");
  if (fach) return fachSheetOeffnen(fach.dataset.editorFach);

  const slot = e.target.closest("[data-editor-slot]");
  if (slot) return slotSheetOeffnen(Number(slot.dataset.editorSlot));

  const kurs = e.target.closest("[data-sp-kurs]");
  if (kurs) {
    editor.kurs = kurs.dataset.spKurs;
    $("#sp-kurse").querySelectorAll(".chip").forEach((c) => c.classList.toggle("aktiv", c === kurs));
    return;
  }

  const wahl = e.target.closest("[data-sp-fachwahl]");
  if (wahl) slotFachWaehlen(wahl.dataset.spFachwahl);
});

document.addEventListener("change", (e) => {
  if (e.target.matches("[data-zeit]")) zeitGeaendert(e.target);
});

document.addEventListener("input", (e) => {
  if (e.target.id === "sp-name" || e.target.id === "sp-kuerzel") $("#sp-fehler").textContent = "";
});

// Enter im Fach-Fenster speichert
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && zustand.sheet === "editor-fach" && e.target.matches("#sp-name, #sp-kuerzel, #sp-lehrer")) {
    e.preventDefault();
    fachSpeichern();
  }
});
