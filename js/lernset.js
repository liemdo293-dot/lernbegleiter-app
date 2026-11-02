// ==========================================================
// Lernbegleiter – fertige Quiz-Sets („Lernsets“), z. B. Wiener Kongress
// Die Fragen stehen in js/quiz-sets.js (aus quiz-daten/ erzeugt).
// Anders als das KI-Quiz merkt sich ein Lernset jede einzelne Frage
// und wiederholt sie so lange, bis sie sitzt:
//   - beim ersten Versuch richtig → sitzt
//   - falsch → kommt nach 3 anderen Fragen wieder, ab dann 2× hintereinander richtig nötig
//     (jede falsche Antwort setzt die Serie auf 0)
//   - richtig, aber noch nicht sicher → kommt nach 5 Fragen wieder
//   - nie dieselbe Frage direkt hintereinander, wenn es andere gibt
// Nutzt Hilfsfunktionen aus app.js und das Vollbild aus quiz.js,
// deshalb wird diese Datei nach beiden geladen.
// ==========================================================

const LERNSET_SCHLUESSEL = "lb-quiz-sets";
const LERNSET_AUFGABE = "Wiener Kongress Quiz"; // Text der Aufgabe, die einmalig angelegt wird

// Was im Lernset-Vollbild gerade los ist (wird nicht gespeichert)
let lernset = null;

// ---------- 1. Speichern & Laden ----------
// lb-quiz-sets = {
//   angelegt: { "wiener-kongress": "<id der Hausaufgabe>" },
//   sets: { "wiener-kongress": {
//     fragen: { "d1": { serie, fehler, sitzt, nachFehler } },
//     warteschlange: ["d4", "k2", …],
//     themen: ["daten", …],          // aktive Themen im Filter
//     runde: { richtig, falsch }
//   } }
// }

function lernsetDaten() {
  const daten = laden(LERNSET_SCHLUESSEL, {});
  return { angelegt: daten.angelegt || {}, sets: daten.sets || {} };
}

function lernsetSpeichern(daten) {
  speichern(LERNSET_SCHLUESSEL, daten);
}

// Der Stand eines Sets – fehlende Teile werden ergänzt, veraltete Fragen aussortiert
function lernsetStand(daten, name) {
  const set = QUIZ_SETS[name];
  const stand = daten.sets[name] || (daten.sets[name] = {});
  const ids = new Set(set.fragen.map((f) => f.id));
  const themen = Object.keys(set.themen);

  stand.fragen = stand.fragen || {};
  stand.warteschlange = (Array.isArray(stand.warteschlange) ? stand.warteschlange : []).filter((id) => ids.has(id));
  stand.themen = (Array.isArray(stand.themen) ? stand.themen : []).filter((t) => themen.includes(t));
  if (!stand.themen.length) stand.themen = themen;
  stand.runde = stand.runde || { richtig: 0, falsch: 0 };
  return stand;
}

function frageStand(stand, id) {
  return stand.fragen[id] || (stand.fragen[id] = { serie: 0, fehler: 0, sitzt: false, nachFehler: false });
}

// "neu", "wackelt" oder "sitzt"
function frageStatus(stand, id) {
  const f = stand.fragen[id];
  if (!f) return "neu";
  if (f.sitzt) return "sitzt";
  return f.fehler > 0 ? "wackelt" : "neu";
}

// Wie oft hintereinander richtig, bis die Frage sitzt?
function noetigRichtig(set, stand, id) {
  return frageStand(stand, id).nachFehler ? set.regeln.noetigNachFehler : 1;
}

function mischen(liste) {
  for (let i = liste.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [liste[i], liste[j]] = [liste[j], liste[i]];
  }
  return liste;
}

// Wie viele Fragen eines Sets sitzen? (alle Themen, unabhängig vom Filter)
function lernsetFortschritt(name) {
  const set = QUIZ_SETS[name];
  if (!set) return null;
  const stand = lernsetStand(lernsetDaten(), name);
  return { sitzen: set.fragen.filter((f) => frageStatus(stand, f.id) === "sitzt").length, gesamt: set.fragen.length };
}

// ---------- 2. Die Aufgabe ----------

// Einmalig eine Hausaufgabe anlegen. Wird sie gelöscht, kommt sie nicht wieder.
function lernsetAufgabenAnlegen() {
  const daten = lernsetDaten();
  let geaendert = false;

  Object.entries(QUIZ_SETS).forEach(([name, set]) => {
    if (daten.angelegt[name]) return;
    // Das Fach über den Namen finden – ohne Stundenplan klappt es beim nächsten Start
    const fachId = Object.keys(FAECHER).find((id) => FAECHER[id].name.toLowerCase().startsWith(set.fach.toLowerCase()));
    if (!fachId) return;

    const aufgabe = {
      id: neueId(),
      fachId,
      text: LERNSET_AUFGABE,
      faellig: set.faellig,
      dauer: 30,
      erledigt: false,
      erledigtAm: null,
      erstellt: Date.now(),
      quizSet: name
    };
    speichern(HA_SCHLUESSEL, [...hausaufgaben(), aufgabe]);
    daten.angelegt[name] = aufgabe.id;
    geaendert = true;
  });

  if (geaendert) lernsetSpeichern(daten);
  return geaendert;
}

// Sitzen alle Fragen? Dann die Aufgabe automatisch abhaken.
function lernsetAufgabeAbgleichen(name) {
  const stand = lernsetFortschritt(name);
  if (!stand || stand.sitzen < stand.gesamt) return;
  const liste = hausaufgaben();
  const offen = liste.filter((a) => a.quizSet === name && !a.erledigt);
  if (!offen.length) return;
  offen.forEach((a) => {
    a.erledigt = true;
    a.erledigtAm = Date.now();
  });
  speichern(HA_SCHLUESSEL, liste);
  zeigeToast(`Alle ${stand.gesamt} Fragen sitzen – Aufgabe erledigt ✓`);
}

// Kleiner Knopf und Fortschritt an der Aufgabe (wird von aufgabeHtml in app.js genutzt)
function lernsetKnopfHtml(name) {
  if (!QUIZ_SETS[name]) return "";
  return `<button class="lernset-knopf drueckbar" data-aktion="lernset-auf" data-set="${esc(name)}" aria-label="Quiz öffnen">Quiz</button>`;
}

function lernsetFortschrittText(name) {
  const f = lernsetFortschritt(name);
  return f ? `${f.sitzen}/${f.gesamt} sitzen` : "";
}

// ---------- 3. Öffnen, Schließen, Ablauf ----------

function lernsetOeffnen(name) {
  if (!QUIZ_SETS[name]) return;
  lernset = { name, ansicht: "uebersicht", id: null, reihenfolge: null, beantwortet: false, rueckmeldung: null, zuruecksetzen: false };
  quizOffen = true; // sperrt die Tasten von app.js, solange das Vollbild offen ist
  const element = $("#quiz");
  element.setAttribute("aria-hidden", "false");
  element.setAttribute("aria-label", QUIZ_SETS[name].titel);
  lernsetRendern(true);
  requestAnimationFrame(() => element.classList.add("offen"));
}

function lernsetSchliessen() {
  if (!lernset) return;
  lernset = null;
  quizSchliessen(); // aus quiz.js: Vollbild zu, Ansichten neu zeichnen
}

// Neue Runde: erst die wackeligen Fragen, dann neue – jeweils gemischt
function warteschlangeBauen(name, nurFehler) {
  const daten = lernsetDaten();
  const set = QUIZ_SETS[name];
  const stand = lernsetStand(daten, name);
  let pool = set.fragen.filter((f) => stand.themen.includes(f.thema));

  if (nurFehler) {
    // Alle Fragen mit mindestens einem Fehler kommen wieder dran, wieder mit 2× richtig
    pool = pool.filter((f) => (stand.fragen[f.id] || {}).fehler > 0);
    pool.forEach((f) => Object.assign(frageStand(stand, f.id), { sitzt: false, serie: 0, nachFehler: true }));
  } else {
    pool = pool.filter((f) => !frageStand(stand, f.id).sitzt);
  }

  const wackelig = mischen(pool.filter((f) => frageStatus(stand, f.id) === "wackelt").map((f) => f.id));
  const neu = mischen(pool.filter((f) => frageStatus(stand, f.id) !== "wackelt").map((f) => f.id));
  stand.warteschlange = [...wackelig, ...neu];
  stand.runde = { richtig: 0, falsch: 0 };
  lernsetSpeichern(daten);
}

function lernsetStarten() {
  const daten = lernsetDaten();
  const stand = lernsetStand(daten, lernset.name);
  const imFilter = (id) => stand.themen.includes(frageNachId(lernset.name, id).thema);
  if (!stand.warteschlange.filter(imFilter).length) {
    warteschlangeBauen(lernset.name, false);
  } else {
    stand.warteschlange = stand.warteschlange.filter(imFilter);
    lernsetSpeichern(daten);
  }
  naechsteFrage();
}

function nurFehlerUeben() {
  warteschlangeBauen(lernset.name, true);
  naechsteFrage();
}

function frageNachId(name, id) {
  return QUIZ_SETS[name].fragen.find((f) => f.id === id);
}

function naechsteFrage() {
  const stand = lernsetStand(lernsetDaten(), lernset.name);
  if (!stand.warteschlange.length) {
    lernset.ansicht = "ende";
  } else {
    lernset.ansicht = "frage";
    lernset.id = stand.warteschlange[0];
    lernset.reihenfolge = mischen([0, 1, 2, 3]); // Antworten bei jeder Anzeige neu mischen
    lernset.beantwortet = false;
    lernset.rueckmeldung = null;
  }
  lernsetRendern(true);
}

// i = Position des angetippten Knopfs (0–3)
function lernsetAntworten(i) {
  if (!lernset || lernset.ansicht !== "frage" || lernset.beantwortet) return;
  const daten = lernsetDaten();
  const set = QUIZ_SETS[lernset.name];
  const { nachFalsch, nachRichtig } = set.regeln;
  const stand = lernsetStand(daten, lernset.name);
  const id = lernset.id;
  const f = frageStand(stand, id);
  const richtig = lernset.reihenfolge[i] === 0;
  const warWackelig = f.fehler > 0;

  stand.warteschlange.shift();
  if (richtig) {
    stand.runde.richtig++;
    f.serie++;
    if (f.serie >= noetigRichtig(set, stand, id)) f.sitzt = true;
    else stand.warteschlange.splice(Math.min(nachRichtig, stand.warteschlange.length), 0, id);
  } else {
    stand.runde.falsch++;
    Object.assign(f, { serie: 0, fehler: f.fehler + 1, nachFehler: true, sitzt: false });
    stand.warteschlange.splice(Math.min(nachFalsch, stand.warteschlange.length), 0, id);
  }
  // Nie dieselbe Frage direkt hintereinander, wenn es andere gibt
  if (stand.warteschlange.length > 1 && stand.warteschlange[0] === id) {
    stand.warteschlange.splice(0, 1);
    stand.warteschlange.splice(1, 0, id);
  }
  lernsetSpeichern(daten);

  lernset.beantwortet = true;
  lernset.rueckmeldung = { richtig, gewaehlt: i, warWackelig };
  if (!richtig && navigator.vibrate) navigator.vibrate(60);
  lernsetRendern(false);
  lernsetAufgabeAbgleichen(lernset.name);

  const weiter = $("#lernset-weiter");
  if (weiter) {
    weiter.focus({ preventScroll: true });
    weiter.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

function lernsetThemaUmschalten(thema) {
  const daten = lernsetDaten();
  const stand = lernsetStand(daten, lernset.name);
  if (stand.themen.includes(thema)) {
    if (stand.themen.length > 1) stand.themen = stand.themen.filter((t) => t !== thema);
    else zeigeToast("Mindestens ein Thema muss an bleiben");
  } else {
    stand.themen.push(thema);
  }
  stand.warteschlange = []; // neue Auswahl → neue Runde
  lernsetSpeichern(daten);
  lernsetRendern(false);
}

function lernsetZuruecksetzen() {
  const daten = lernsetDaten();
  delete daten.sets[lernset.name];
  lernsetSpeichern(daten);
  lernset.zuruecksetzen = false;
  lernsetRendern(true);
  zeigeToast("Fortschritt zurückgesetzt");
}

// ---------- 4. Ansichten ----------

function lernsetRendern(animiert) {
  const element = $("#quiz");
  const html = { uebersicht: lernsetUebersichtHtml, frage: lernsetFrageHtml, ende: lernsetEndeHtml }[lernset.ansicht]();
  element.innerHTML = html;
  if (!animiert) element.querySelector(".quiz-inhalt").classList.remove("wechsel");
  if (animiert) element.scrollTop = 0;
}

// Zahlen für die gerade gewählten Themen
function lernsetAuswahl(set, stand) {
  const ids = set.fragen.filter((f) => stand.themen.includes(f.thema)).map((f) => f.id);
  return { ids, sitzen: ids.filter((id) => frageStatus(stand, id) === "sitzt").length };
}

function lernsetUebersichtHtml() {
  const set = QUIZ_SETS[lernset.name];
  const stand = lernsetStand(lernsetDaten(), lernset.name);
  const alle = set.fragen.map((f) => f.id);
  const zaehler = { neu: 0, wackelt: 0, sitzt: 0 };
  alle.forEach((id) => zaehler[frageStatus(stand, id)]++);

  const auswahl = lernsetAuswahl(set, stand);
  const offenAuswahl = auswahl.ids.length - auswahl.sitzen;
  const inSchlange = stand.warteschlange.filter((id) => stand.themen.includes(frageNachId(lernset.name, id).thema)).length;
  const fehlerAuswahl = auswahl.ids.filter((id) => (stand.fragen[id] || {}).fehler > 0).length;
  const startText = inSchlange ? `Weiter lernen (${inSchlange} offen)` : offenAuswahl ? `Lernen starten (${offenAuswahl} Fragen)` : "Alles sitzt in dieser Auswahl";
  const fach = Object.values(FAECHER).find((f) => f.name.toLowerCase().startsWith(set.fach.toLowerCase()));
  const { noetigNachFehler, nachFalsch } = set.regeln;

  return `
    <div class="quiz-leiste">
      <button class="text-knopf" data-aktion="lernset-schliessen">Schließen</button>
      <span class="quiz-zaehler">${esc(fach ? fach.name : set.fach)} · fällig ${esc(faelligText(set.faellig))}</span>
    </div>

    <div class="quiz-inhalt wechsel">
      <p class="timer-phase">Lernset · ${set.fragen.length} Fragen</p>
      <h2 class="quiz-frage">${esc(set.titel)}</h2>

      <div class="noten-karte lernset-karte">
        <span class="schnitt-zahl">${zaehler.sitzt}<small>von ${alle.length} Fragen sitzen</small></span>
        <div class="lernset-sitze" aria-label="Stand jeder Frage">
          ${alle.map((id) => `<span class="${frageStatus(stand, id)}"></span>`).join("")}
        </div>
        <div class="lernset-legende">
          <span><i class="neu"></i>neu ${zaehler.neu}</span>
          <span><i class="wackelt"></i>wackelt ${zaehler.wackelt}</span>
          <span><i class="sitzt"></i>sitzt ${zaehler.sitzt}</span>
        </div>
      </div>

      <h3 class="abschnitt">Themen <small>${auswahl.sitzen}/${auswahl.ids.length} sitzen</small></h3>
      <div class="lernset-themen">
        ${Object.entries(set.themen).map(([thema, titel]) => {
          const ids = set.fragen.filter((f) => f.thema === thema).map((f) => f.id);
          const sitzen = ids.filter((id) => frageStatus(stand, id) === "sitzt").length;
          const aktiv = stand.themen.includes(thema);
          return `<button class="chip ${aktiv ? "aktiv" : ""}" data-lernset-thema="${thema}" aria-pressed="${aktiv}">${esc(titel)} <b>${sitzen}/${ids.length}</b></button>`;
        }).join("")}
      </div>

      <div class="quiz-knoepfe">
        <button class="knopf breit drueckbar" data-aktion="lernset-start" ${!inSchlange && !offenAuswahl ? "disabled" : ""}>${startText}</button>
        ${fehlerAuswahl ? `<button class="knopf breit zweit drueckbar" data-aktion="lernset-fehler">Nur meine Fehler üben (${fehlerAuswahl})</button>` : ""}
      </div>

      <p class="hinweis lernset-regel">Richtig beim ersten Mal = <b>sitzt</b>. Falsch beantwortete Fragen kommen nach ${nachFalsch} anderen Fragen wieder, so lange, bis du sie <b>${noetigNachFehler}× hintereinander richtig</b> hast. Dein Stand bleibt auf diesem Gerät gespeichert.</p>

      ${lernset.zuruecksetzen
        ? `<div class="lernset-bestaetigen">
            <span>Allen Fortschritt in diesem Quiz löschen?</span>
            <button class="knopf gefahr drueckbar" data-aktion="lernset-reset-ja">Ja, zurücksetzen</button>
            <button class="knopf zweit drueckbar" data-aktion="lernset-reset-nein">Abbrechen</button>
          </div>`
        : `<button class="text-knopf lernset-reset" data-aktion="lernset-reset">Fortschritt zurücksetzen</button>`}
    </div>`;
}

function lernsetFrageHtml() {
  const set = QUIZ_SETS[lernset.name];
  const stand = lernsetStand(lernsetDaten(), lernset.name);
  const frage = frageNachId(lernset.name, lernset.id);
  const f = frageStand(stand, lernset.id);
  const auswahl = lernsetAuswahl(set, stand);
  const r = lernset.rueckmeldung;

  return `
    <div class="quiz-leiste">
      <button class="text-knopf" data-aktion="lernset-uebersicht">‹ Übersicht</button>
      <span class="quiz-zaehler">${stand.warteschlange.length} offen · ${auswahl.sitzen}/${auswahl.ids.length} sitzen</span>
    </div>
    <div class="quiz-fortschritt"><span class="quiz-fortschritt-wert" style="--wert:${auswahl.sitzen / auswahl.ids.length}"></span></div>

    <div class="quiz-inhalt wechsel">
      <p class="timer-phase">${esc(set.themen[frage.thema])}${f.fehler > 0 && !lernset.beantwortet ? ` · Wiederholung · ${f.fehler}× falsch` : ""}</p>
      <h2 class="quiz-frage">${esc(frage.frage)}</h2>

      <div class="quiz-antworten">
        ${lernset.reihenfolge.map((a, i) => {
          let klasse = "";
          let symbol = "";
          if (lernset.beantwortet) {
            if (a === 0) {
              klasse = "richtig";
              symbol = SYMBOL.hakenKlein;
            } else if (r.gewaehlt === i) {
              klasse = "falsch";
              symbol = SYMBOL.kreuz;
            } else {
              klasse = "gedimmt";
            }
          }
          return `
            <button class="quiz-antwort drueckbar ${klasse}" data-lernset-antwort="${i}" ${lernset.beantwortet ? "disabled" : ""}>
              <span class="antwort-buchstabe">${"ABCD"[i]}</span>
              <span class="antwort-text">${esc(frage.antworten[a])}</span>
              <span class="antwort-symbol" aria-hidden="true">${symbol}</span>
            </button>`;
        }).join("")}
      </div>

      ${r ? `
        <div class="quiz-erklaerung sichtbar" aria-live="polite">
          <strong class="lernset-urteil">${r.richtig ? "Richtig!" : `Leider falsch. Richtig ist: ${esc(frage.antworten[0])}`}</strong>
          ${frage.erklaerung ? esc(frage.erklaerung) : ""}
          <span class="lernset-info">${lernsetInfoHtml(set, stand, r)}</span>
        </div>
        <button class="knopf breit drueckbar quiz-weiter" id="lernset-weiter" data-aktion="lernset-weiter">Weiter</button>` : ""}
    </div>`;
}

// „Kommt in 3 Fragen wieder“, „Noch 1× richtig nötig“ …
function lernsetInfoHtml(set, stand, r) {
  const id = lernset.id;
  const f = frageStand(stand, id);
  const noetig = noetigRichtig(set, stand, id);
  const rest = stand.warteschlange.length;

  if (r.richtig && f.sitzt) return r.warWackelig ? "Jetzt sitzt sie. Diese Frage ist erledigt." : "Sitzt beim ersten Versuch.";
  if (r.richtig) {
    const punkte = Array.from({ length: noetig }, (_, i) => `<i class="${i < f.serie ? "voll" : ""}"></i>`).join("");
    return `Noch ${noetig - f.serie}× richtig nötig <span class="lernset-punkte">${punkte}</span> · kommt in ${Math.min(set.regeln.nachRichtig, rest - 1)} Fragen wieder`;
  }
  if (rest === 1) return `Kommt gleich nochmal. ${noetig}× hintereinander richtig, dann sitzt sie.`;
  return `Kommt in ${Math.min(set.regeln.nachFalsch, rest - 1)} Fragen wieder. Danach ${noetig}× hintereinander richtig, dann sitzt sie.`;
}

function lernsetEndeHtml() {
  const set = QUIZ_SETS[lernset.name];
  const stand = lernsetStand(lernsetDaten(), lernset.name);
  const auswahl = lernsetAuswahl(set, stand);
  const alleSitzen = auswahl.sitzen === auswahl.ids.length;
  // Die meistgefalschten Fragen der Auswahl
  const stolpersteine = set.fragen
    .filter((f) => stand.themen.includes(f.thema) && (stand.fragen[f.id] || {}).fehler > 0)
    .sort((a, b) => stand.fragen[b.id].fehler - stand.fragen[a.id].fehler)
    .slice(0, 6);

  return `
    <div class="quiz-leiste">
      <span class="quiz-zaehler">${esc(set.titel)}</span>
      <button class="text-knopf" data-aktion="lernset-schliessen">Fertig</button>
    </div>

    <div class="quiz-inhalt quiz-ergebnis wechsel">
      <p class="timer-phase">Runde geschafft</p>
      <h2 class="quiz-frage">${alleSitzen ? "Alles sitzt. Stark!" : "Runde fertig."}</h2>

      <div class="kacheln lernset-kacheln">
        <div class="kachel"><span class="kachel-wert">${stand.runde.richtig}</span><span class="kachel-name">richtig</span></div>
        <div class="kachel"><span class="kachel-wert">${stand.runde.falsch}</span><span class="kachel-name">falsch</span></div>
        <div class="kachel"><span class="kachel-wert">${auswahl.sitzen}<small>/${auswahl.ids.length}</small></span><span class="kachel-name">sitzen</span></div>
      </div>

      ${stolpersteine.length ? `
        <h3 class="abschnitt">Deine Stolpersteine <small>${stolpersteine.length}</small></h3>
        <div class="liste">
          ${stolpersteine.map((f) => `
            <div class="fehler-eintrag">
              <p class="fehler-frage">${esc(f.frage)}</p>
              <p class="fehler-antwort">✓ ${esc(f.antworten[0])}</p>
              <p class="fehler-antwort lernset-fehlerzahl">${stand.fragen[f.id].fehler}× falsch</p>
            </div>`).join("")}
        </div>` : '<p class="hinweis">Keine einzige falsche Antwort. Stark!</p>'}

      <div class="quiz-knoepfe">
        ${stolpersteine.length ? `<button class="knopf breit drueckbar" data-aktion="lernset-fehler">Nur meine Fehler üben</button>` : ""}
        <button class="knopf breit zweit drueckbar" data-aktion="lernset-uebersicht">Zur Übersicht</button>
      </div>
    </div>`;
}

// ---------- 5. Bereich auf der Fachseite ----------

function lernsetBereichHtml(fachId) {
  const fach = FAECHER[fachId];
  if (!fach) return "";
  const namen = Object.keys(QUIZ_SETS).filter((name) => fach.name.toLowerCase().startsWith(QUIZ_SETS[name].fach.toLowerCase()));
  if (!namen.length) return "";
  return `
    <div class="liste lernset-liste">
      ${namen.map((name) => {
        const f = lernsetFortschritt(name);
        return `
          <button class="thema lernset-zeile" data-aktion="lernset-auf" data-set="${esc(name)}">
            <span class="punkte-pill">${f.sitzen}</span>
            <span class="thema-text">${esc(QUIZ_SETS[name].titel)}<small class="aufgabe-meta">${f.sitzen}/${f.gesamt} sitzen · fertiges Quiz</small></span>
            ${SYMBOL.pfeil}
          </button>`;
      }).join("")}
    </div>`;
}

// ---------- 6. Klicks, Tasten & Start ----------

Object.assign(AKTIONEN, {
  "lernset-auf": (knopf) => lernsetOeffnen(knopf.dataset.set),
  "lernset-schliessen": () => lernsetSchliessen(),
  "lernset-start": () => lernsetStarten(),
  "lernset-fehler": () => nurFehlerUeben(),
  "lernset-weiter": () => naechsteFrage(),
  "lernset-uebersicht": () => {
    lernset.ansicht = "uebersicht";
    lernsetRendern(true);
  },
  "lernset-reset": () => {
    lernset.zuruecksetzen = true;
    lernsetRendern(false);
  },
  "lernset-reset-ja": () => lernsetZuruecksetzen(),
  "lernset-reset-nein": () => {
    lernset.zuruecksetzen = false;
    lernsetRendern(false);
  }
});

document.addEventListener("click", (e) => {
  if (!lernset) return;
  const antwort = e.target.closest("[data-lernset-antwort]");
  if (antwort) return lernsetAntworten(Number(antwort.dataset.lernsetAntwort));
  const thema = e.target.closest("[data-lernset-thema]");
  if (thema) lernsetThemaUmschalten(thema.dataset.lernsetThema);
});

document.addEventListener("keydown", (e) => {
  if (!lernset) return;
  if (e.key === "Escape") {
    if (lernset.ansicht === "frage") AKTIONEN["lernset-uebersicht"]();
    else lernsetSchliessen();
    return;
  }
  if (lernset.ansicht !== "frage") return;

  // 1–4 oder A–D wählt eine Antwort, Enter oder Leertaste geht weiter
  const taste = e.key.toUpperCase();
  const i = taste.length === 1 ? ("1234".includes(taste) ? Number(taste) - 1 : "ABCD".indexOf(taste)) : -1;
  if (!lernset.beantwortet && i >= 0) {
    e.preventDefault();
    lernsetAntworten(i);
  } else if (lernset.beantwortet && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    naechsteFrage();
  }
});

// Beim Start: Aufgabe einmalig anlegen. Danach die Ansicht neu zeichnen –
// app.js hat sie gezeichnet, bevor diese Datei geladen war (ohne Quiz-Fortschritt).
lernsetAufgabenAnlegen();
allesAktualisieren();
