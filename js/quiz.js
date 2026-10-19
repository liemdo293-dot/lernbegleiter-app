// ==========================================================
// Lernbegleiter – KI-Quiz pro Fach
// Ablauf: Anfrage erstellen → Quiz beschaffen → JSON prüfen → Quiz spielen → Ergebnis speichern.
// Nutzt Hilfsfunktionen aus app.js (laden, speichern, esc, $, FAECHER …),
// deshalb wird diese Datei nach app.js geladen.
// ==========================================================

const QUIZ_SCHLUESSEL = "lb-quiz";

// Woher das Quiz kommt. Heute: Anfrage kopieren und Claudes Antwort einfügen.
// Später: "supabase" – dann ruft quizBeschaffen() direkt eine KI-Funktion auf.
const QUIZ_QUELLE = "kopieren";

const QUIZ_STUFEN = {
  leicht: "Grundbegriffe und Faktenwissen",
  mittel: "Verstehen und Anwenden, etwa auf Klausurniveau",
  schwer: "Transfer, Analyse und knifflige Details, etwa auf Abiturniveau"
};
const QUIZ_STUFEN_NAMEN = { leicht: "Leicht", mittel: "Mittel", schwer: "Schwer" };

// Ab wie viel Prozent gibt es wie viele Notenpunkte? (übliche Tabelle der Oberstufe)
// 95 % → 15 Punkte, 90 % → 14 Punkte … 20 % → 1 Punkt, darunter 0
const PUNKTE_GRENZEN = [95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 33, 27, 20];

// Die Auswahl im Quiz-Fenster
const quizWahl = {
  fachId: null,
  themen: [], // Positionen der gewählten Lernthemen
  eigenes: "",
  anzahl: 10,
  stufe: "mittel"
};

// Das laufende Quiz
let quizLauf = null;
let quizOffen = false;

// ---------- 1. Die Anfrage an Claude ----------

function quizThemen() {
  const themen = themenVon(quizWahl.fachId);
  const gewaehlt = quizWahl.themen.map((i) => themen[i] && themen[i].text).filter(Boolean);
  const eigene = quizWahl.eigenes.split(/[,;\n]/).map((t) => t.trim()).filter(Boolean);
  return [...gewaehlt, ...eigene];
}

function quizAnfrageErstellen() {
  const fach = FAECHER[quizWahl.fachId];
  const themen = quizThemen();
  const beispiel = {
    thema: "Kurzer Titel für das Quiz",
    fragen: [
      {
        frage: "Fragetext?",
        antworten: ["Antwort A", "Antwort B", "Antwort C", "Antwort D"],
        richtig: 2,
        erklaerung: "Kurze Erklärung, warum Antwort C richtig ist."
      }
    ]
  };

  return [
    "Erstelle ein Lern-Quiz für die gymnasiale Oberstufe in Nordrhein-Westfalen.",
    "",
    `Fach: ${fach.name} (${fach.kurs})`,
    `Themen: ${themen.length ? themen.join("; ") : "typische Themen dieses Fachs in der Oberstufe"}`,
    `Anzahl der Fragen: ${quizWahl.anzahl}`,
    `Schwierigkeit: ${quizWahl.stufe} – ${QUIZ_STUFEN[quizWahl.stufe]}`,
    "",
    "Regeln:",
    "- Jede Frage ist Multiple Choice mit genau 4 Antworten, von denen genau eine richtig ist.",
    "- Die falschen Antworten sind plausibel, aber eindeutig falsch.",
    "- Die richtige Antwort steht zufällig verteilt an Position 1, 2, 3 oder 4.",
    "- Zu jeder Frage gibt es eine kurze Erklärung (1–2 Sätze).",
    "- Schreibe auf Deutsch. In Fremdsprachen-Fächern dürfen Fragen und Antworten in der Fremdsprache sein.",
    "",
    "Antworte AUSSCHLIESSLICH mit gültigem JSON – ohne Text davor oder danach und ohne Markdown-Codeblock – in genau diesem Format:",
    JSON.stringify(beispiel, null, 2),
    "",
    '"richtig" ist die Position der richtigen Antwort in "antworten": 0 = erste, 1 = zweite, 2 = dritte, 3 = vierte.',
    `Das Array "fragen" enthält genau ${quizWahl.anzahl} Fragen.`
  ].join("\n");
}

// ---------- 2. Das Quiz beschaffen – DIE Stelle für den späteren KI-Aufruf ----------

// Gibt zurück:
//   { art: "manuell", kopiert: true/false }  → du fügst Claudes Antwort selbst ein
//   { art: "fertig", ergebnis }              → das Quiz ist schon da (Ergebnis von quizPruefen)
async function quizBeschaffen(anfrage) {
  if (QUIZ_QUELLE === "supabase") {
    // So könnte der Austausch später aussehen. Der KI-Schlüssel liegt dann
    // sicher in der Supabase-Funktion, NICHT hier im Code:
    //
    // const antwort = await fetch("https://<projekt>.supabase.co/functions/v1/quiz", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json", Authorization: "Bearer <anon-key>" },
    //   body: JSON.stringify({ anfrage })
    // });
    // return { art: "fertig", ergebnis: quizPruefen(await antwort.text()) };
  }

  const kopiert = await inZwischenablage(anfrage);
  return { art: "manuell", kopiert };
}

async function inZwischenablage(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (fehler) {
    // Ältere Methode als Ersatz (z. B. wenn die Seite als Datei geöffnet ist)
  }
  try {
    const feld = document.createElement("textarea");
    feld.value = text;
    feld.setAttribute("readonly", "");
    feld.style.position = "fixed";
    feld.style.opacity = "0";
    document.body.appendChild(feld);
    feld.select();
    const geklappt = document.execCommand("copy");
    feld.remove();
    return geklappt;
  } catch (fehler) {
    return false;
  }
}

// ---------- 3. Das JSON prüfen ----------

// "richtig" darf 0–3 sein, notfalls auch "2" oder "C"
function richtigIndex(wert) {
  if (Number.isInteger(wert) && wert >= 0 && wert <= 3) return wert;
  if (typeof wert === "string") {
    const text = wert.trim().toUpperCase();
    if (/^[0-3]$/.test(text)) return Number(text);
    if (/^[A-D]$/.test(text)) return text.charCodeAt(0) - 65;
  }
  return null;
}

// Gibt { ok: true, quiz } oder { ok: false, fehler: "verständliche Meldung" } zurück
function quizPruefen(text) {
  const roh = String(text || "").trim();
  if (!roh) return { ok: false, fehler: "Das Feld ist leer. Füge hier die komplette Antwort von Claude ein." };

  // Markdown-Rahmen (```json) und Text vor/nach dem JSON wegschneiden
  const ohneRahmen = roh.replace(/```(?:json)?/gi, "");
  const anfang = ohneRahmen.indexOf("{");
  const ende = ohneRahmen.lastIndexOf("}");
  if (anfang === -1) {
    return { ok: false, fehler: "Ich finde kein JSON in deinem Text. Hast du die ganze Antwort von Claude kopiert? Sie beginnt mit { und endet mit }." };
  }
  if (ende <= anfang) {
    return { ok: false, fehler: "Das JSON ist unvollständig, das Ende fehlt. War Claudes Antwort abgeschnitten? Schreib Claude „Bitte vollständig wiederholen“ und kopiere die neue Antwort." };
  }

  let daten;
  try {
    daten = JSON.parse(ohneRahmen.slice(anfang, ende + 1));
  } catch (fehler) {
    return { ok: false, fehler: "Das JSON ist unvollständig oder fehlerhaft, vielleicht fehlt am Ende etwas oder ein Komma. Kopiere Claudes Antwort am besten noch einmal komplett." };
  }

  const fragen = Array.isArray(daten) ? daten : daten.fragen;
  if (!Array.isArray(fragen) || !fragen.length) {
    return { ok: false, fehler: "Im JSON fehlt die Liste „fragen“, oder sie ist leer." };
  }

  const probleme = [];
  const sauber = fragen.map((f, i) => {
    const nr = `Frage ${i + 1}`;
    if (!f || typeof f !== "object") {
      probleme.push(`${nr} ist kein gültiger Eintrag.`);
      return null;
    }
    const frage = typeof f.frage === "string" ? f.frage.trim() : "";
    if (!frage) probleme.push(`${nr} hat keinen Fragetext („frage“).`);

    const antworten = Array.isArray(f.antworten) ? f.antworten.map((a) => (a == null ? "" : String(a).trim())) : [];
    if (antworten.length !== 4) probleme.push(`${nr} hat ${antworten.length} Antworten statt 4.`);
    else if (antworten.some((a) => !a)) probleme.push(`${nr} hat eine leere Antwort.`);

    const richtig = richtigIndex(f.richtig);
    if (richtig === null) probleme.push(`${nr}: „richtig“ muss eine Zahl von 0 bis 3 sein.`);

    return { frage, antworten, richtig, erklaerung: typeof f.erklaerung === "string" ? f.erklaerung.trim() : "" };
  });

  if (probleme.length) {
    const rest = probleme.length > 3 ? ` (und ${probleme.length - 3} weitere Probleme)` : "";
    return { ok: false, fehler: probleme.slice(0, 3).join(" ") + rest };
  }

  const thema = typeof daten.thema === "string" ? daten.thema.trim() : "";
  return { ok: true, quiz: { thema, fragen: sauber } };
}

// ---------- 4. Das Quiz-Fenster (von unten) ----------

function quizSegmentHtml(feld, optionen, aktuell) {
  const pos = Math.max(0, optionen.findIndex(([wert]) => wert === aktuell));
  return `
    <div class="segment" role="radiogroup" style="--anzahl:${optionen.length}; --pos:${pos}">
      <span class="segment-daumen"></span>
      ${optionen.map(([wert, text], i) => `<button type="button" role="radio" aria-checked="${i === pos}" class="${i === pos ? "aktiv" : ""}" data-quiz-feld="${feld}" data-wert="${wert}">${text}</button>`).join("")}
    </div>`;
}

function quizSheetHtml() {
  const fach = FAECHER[quizWahl.fachId];
  const themen = themenVon(quizWahl.fachId);

  return `
    ${sheetKopfHtml(`Quiz · ${esc(fach.kurzname || fach.name)}`)}

    <span class="feld-titel">Themen</span>
    ${themen.length
      ? `<div class="chips" id="quiz-themen">${themen.map((t, i) => `<button type="button" class="chip ${quizWahl.themen.includes(i) ? "aktiv" : ""}" data-quiz-thema="${i}">${esc(t.text)}</button>`).join("")}</div>`
      : '<p class="quiz-hinweis">Noch keine Lernthemen in diesem Fach. Tippe einfach unten ein Thema ein.</p>'}
    <input class="feld quiz-eigenes" id="quiz-eigenes" type="text" maxlength="160" autocomplete="off" placeholder="Eigenes Thema, z. B. Present Perfect" value="${esc(quizWahl.eigenes)}">

    <span class="feld-titel">Anzahl der Fragen</span>
    ${quizSegmentHtml("anzahl", [[5, "5"], [10, "10"], [15, "15"]], quizWahl.anzahl)}

    <span class="feld-titel">Schwierigkeit</span>
    ${quizSegmentHtml("stufe", [["leicht", "Leicht"], ["mittel", "Mittel"], ["schwer", "Schwer"]], quizWahl.stufe)}

    <div class="quiz-schritt">
      <p class="schritt-titel"><span class="schritt-nr">1</span>Anfrage kopieren und in Claude einfügen</p>
      <button type="button" class="knopf breit drueckbar" id="quiz-kopieren" data-aktion="quiz-kopieren">Anfrage kopieren</button>
      <textarea class="feld code" id="quiz-anfrage-text" rows="5" readonly hidden aria-label="Anfrage zum Kopieren"></textarea>
    </div>

    <div class="quiz-schritt">
      <p class="schritt-titel"><span class="schritt-nr">2</span>Claudes Antwort hier einfügen</p>
      <textarea class="feld code" id="quiz-antwort" rows="5" placeholder='{ "thema": "…", "fragen": [ … ] }' aria-label="Antwort von Claude"></textarea>
      <p class="quiz-fehler" id="quiz-fehler" role="alert"></p>
      <button type="button" class="knopf breit drueckbar" data-aktion="quiz-starten">Quiz starten</button>
    </div>`;
}

function oeffneQuizSheet(fachId) {
  quizWahl.fachId = fachId;
  quizWahl.themen = [];
  quizWahl.eigenes = "";
  zustand.sheet = "quiz";

  const sheet = $("#sheet");
  sheet.innerHTML = quizSheetHtml();
  sheet.setAttribute("aria-label", "Quiz erstellen");
  sheet.setAttribute("aria-hidden", "false");
  sheet.scrollTop = 0;
  requestAnimationFrame(() => {
    sheet.classList.add("offen");
    $("#sheet-hintergrund").classList.add("offen");
  });
}

async function quizAnfrageKopieren() {
  quizWahl.eigenes = $("#quiz-eigenes").value;
  const anfrage = quizAnfrageErstellen();
  const antwort = await quizBeschaffen(anfrage);

  // Später (Supabase): Das Quiz ist direkt da
  if (antwort.art === "fertig") {
    if (!antwort.ergebnis.ok) return quizFehlerZeigen(antwort.ergebnis.fehler);
    return quizAusErgebnisStarten(antwort.ergebnis.quiz);
  }

  // Heute: kopieren – oder den Text zum Selbst-Kopieren zeigen
  const ersatz = $("#quiz-anfrage-text");
  const knopf = $("#quiz-kopieren");
  if (antwort.kopiert) {
    ersatz.hidden = true;
    knopf.textContent = "Kopiert ✓";
    setTimeout(() => {
      if (knopf.isConnected) knopf.textContent = "Erneut kopieren";
    }, 1800);
    zeigeToast("Anfrage kopiert – jetzt in Claude einfügen");
  } else {
    ersatz.value = anfrage;
    ersatz.hidden = false;
    ersatz.focus();
    ersatz.select();
    zeigeToast("Bitte den Text selbst kopieren (Strg + C)");
  }
}

function quizFehlerZeigen(text) {
  const feld = $("#quiz-fehler");
  if (!feld) return zeigeToast(text);
  feld.textContent = text;
  feld.classList.remove("wackeln");
  void feld.offsetWidth;
  feld.classList.add("wackeln");
}

function quizAusEingabeStarten() {
  const ergebnis = quizPruefen($("#quiz-antwort").value);
  if (!ergebnis.ok) return quizFehlerZeigen(ergebnis.fehler);
  quizAusErgebnisStarten(ergebnis.quiz);
}

function quizAusErgebnisStarten(quiz) {
  const themen = quizThemen();
  const fach = FAECHER[quizWahl.fachId];
  schliesseSheet();
  quizStarten({
    fachId: quizWahl.fachId,
    thema: quiz.thema || themen.join(", ") || fach.name,
    stufe: quizWahl.stufe,
    art: "quiz",
    fragen: quiz.fragen
  });
}

// ---------- 5. Das Quiz spielen ----------

function quizStarten({ fachId, thema, stufe, art, fragen }) {
  quizLauf = { fachId, thema, stufe, art, fragen, index: 0, gewaehlt: [], fertig: false, ergebnis: null };
  quizOffen = true;
  const element = $("#quiz");
  element.setAttribute("aria-hidden", "false");
  quizRendern();
  element.scrollTop = 0;
  requestAnimationFrame(() => element.classList.add("offen"));
}

function quizFrageHtml() {
  const f = quizLauf.fragen[quizLauf.index];
  const fach = FAECHER[quizLauf.fachId] || { name: "" };
  const anzahl = quizLauf.fragen.length;
  const unterzeile = quizLauf.art === "wiederholung" ? "Fehler wiederholen" : quizLauf.thema;

  return `
    <div class="quiz-leiste">
      <button class="text-knopf" data-aktion="quiz-abbrechen">Abbrechen</button>
      <span class="quiz-zaehler">Frage ${quizLauf.index + 1} von ${anzahl}</span>
    </div>
    <div class="quiz-fortschritt"><span class="quiz-fortschritt-wert" style="--wert:${quizLauf.index / anzahl}"></span></div>

    <div class="quiz-inhalt wechsel">
      <p class="timer-phase">${esc(fach.name)} · ${esc(unterzeile)}</p>
      <h2 class="quiz-frage">${esc(f.frage)}</h2>

      <div class="quiz-antworten">
        ${f.antworten.map((antwort, i) => `
          <button class="quiz-antwort drueckbar" data-quiz-antwort="${i}">
            <span class="antwort-buchstabe">${"ABCD"[i]}</span>
            <span class="antwort-text">${esc(antwort)}</span>
            <span class="antwort-symbol" aria-hidden="true"></span>
          </button>`).join("")}
      </div>

      <div class="quiz-erklaerung" id="quiz-erklaerung" aria-live="polite"></div>
      <button class="knopf breit drueckbar quiz-weiter" id="quiz-weiter" data-aktion="quiz-weiter" hidden>
        ${quizLauf.index + 1 < anzahl ? "Weiter" : "Ergebnis ansehen"}
      </button>
    </div>`;
}

function quizAntworten(wahl) {
  if (!quizLauf || quizLauf.fertig || quizLauf.gewaehlt[quizLauf.index] !== undefined) return;
  const f = quizLauf.fragen[quizLauf.index];
  const richtig = wahl === f.richtig;
  quizLauf.gewaehlt[quizLauf.index] = wahl;

  // Richtige Antwort: gefüllt mit ✓ – deine falsche Antwort: ✕ und durchgestrichen
  document.querySelectorAll(".quiz-antwort").forEach((knopf, i) => {
    knopf.disabled = true;
    if (i === f.richtig) {
      knopf.classList.add("richtig");
      knopf.querySelector(".antwort-symbol").innerHTML = SYMBOL.hakenKlein;
    } else if (i === wahl) {
      knopf.classList.add("falsch");
      knopf.querySelector(".antwort-symbol").innerHTML = SYMBOL.kreuz;
    } else {
      knopf.classList.add("gedimmt");
    }
  });

  const erklaerung = $("#quiz-erklaerung");
  erklaerung.innerHTML = `<strong>${richtig ? "Richtig!" : "Leider falsch."}</strong>${f.erklaerung ? " " + esc(f.erklaerung) : ""}`;
  erklaerung.classList.add("sichtbar");

  $(".quiz-fortschritt-wert").style.setProperty("--wert", (quizLauf.index + 1) / quizLauf.fragen.length);
  const weiter = $("#quiz-weiter");
  weiter.hidden = false;
  weiter.focus({ preventScroll: true });
  if (!richtig && navigator.vibrate) navigator.vibrate(60);
}

function quizWeiter() {
  if (!quizLauf || quizLauf.gewaehlt[quizLauf.index] === undefined) return;
  if (quizLauf.index + 1 < quizLauf.fragen.length) {
    quizLauf.index++;
    quizRendern();
    $("#quiz").scrollTop = 0;
  } else {
    quizBeenden();
  }
}

// ---------- 6. Ergebnis ----------

function prozentZuPunkten(prozent) {
  const i = PUNKTE_GRENZEN.findIndex((grenze) => prozent >= grenze);
  return i === -1 ? 0 : 15 - i;
}

function quizBeenden() {
  const { fragen, gewaehlt } = quizLauf;
  const richtig = fragen.filter((f, i) => gewaehlt[i] === f.richtig).length;
  const prozent = (richtig / fragen.length) * 100;
  const falsch = fragen.map((f, i) => ({ ...f, gewaehlt: gewaehlt[i] })).filter((f) => f.gewaehlt !== f.richtig);

  quizLauf.fertig = true;
  quizLauf.ergebnis = { richtig, prozent, punkte: prozentZuPunkten(prozent), falsch };
  quizErgebnisSpeichern();
  quizRendern();
  $("#quiz").scrollTop = 0;
}

function quizErgebnisHtml() {
  const { ergebnis, fragen } = quizLauf;
  const fach = FAECHER[quizLauf.fachId] || { name: "" };
  const pool = fehlerPool(quizLauf.fachId).length;
  let lob = "Dranbleiben – wiederhole deine Fehler.";
  if (ergebnis.prozent >= 85) lob = "Hervorragend!";
  else if (ergebnis.prozent >= 70) lob = "Gut gemacht!";
  else if (ergebnis.prozent >= 50) lob = "Solide – da geht noch was.";

  return `
    <div class="quiz-leiste">
      <span class="quiz-zaehler">${esc(fach.name)}</span>
      <button class="text-knopf" data-aktion="quiz-schliessen">Fertig</button>
    </div>

    <div class="quiz-inhalt quiz-ergebnis wechsel">
      <p class="timer-phase">Ergebnis${quizLauf.art === "wiederholung" ? " · Fehler wiederholt" : ` · ${esc(quizLauf.thema)}`}</p>
      <h2 class="quiz-frage">${lob}</h2>

      <div class="timer-ring quiz-ring">
        <svg viewBox="0 0 220 220" aria-hidden="true">
          <circle class="ring-spur" cx="110" cy="110" r="100"/>
          <circle class="ring-wert" id="quiz-ring" cx="110" cy="110" r="100" stroke-dasharray="${RING_UMFANG}" stroke-dashoffset="${RING_UMFANG}"/>
        </svg>
        <div class="timer-mitte">
          <span class="timer-zeit">${ergebnis.richtig}<small>/${fragen.length}</small></span>
          <span class="timer-bis">${Math.round(ergebnis.prozent)} % richtig</span>
        </div>
      </div>

      <div class="quiz-punkte">
        <span class="noten-note">${ergebnis.punkte}</span>
        <span>
          <strong>${ergebnis.punkte} ${ergebnis.punkte === 1 ? "Notenpunkt" : "Notenpunkte"} · Note ${NOTEN[ergebnis.punkte]}</strong>
          <small>Nur zur Orientierung, wird nicht als Note gespeichert.</small>
        </span>
      </div>

      ${ergebnis.falsch.length ? `
        <h3 class="abschnitt">Falsch beantwortet <small>${ergebnis.falsch.length}</small></h3>
        <div class="liste">
          ${ergebnis.falsch.map((f) => `
            <div class="fehler-eintrag">
              <p class="fehler-frage">${esc(f.frage)}</p>
              <p class="fehler-antwort falsch">✕ ${esc(f.antworten[f.gewaehlt])}</p>
              <p class="fehler-antwort">✓ ${esc(f.antworten[f.richtig])}</p>
            </div>`).join("")}
        </div>` : ""}

      <div class="quiz-knoepfe">
        ${pool ? `<button class="knopf breit drueckbar" data-aktion="quiz-fehler-wiederholen">Fehler wiederholen (${pool})</button>` : ""}
        <button class="knopf breit zweit drueckbar" data-aktion="quiz-schliessen">Fertig</button>
      </div>
    </div>`;
}

function quizRendern() {
  const element = $("#quiz");
  element.innerHTML = quizLauf.fertig ? quizErgebnisHtml() : quizFrageHtml();

  // Ergebnis-Ring füllt sich animiert
  if (quizLauf.fertig) {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const ring = $("#quiz-ring");
      if (ring) ring.style.strokeDashoffset = RING_UMFANG * (1 - quizLauf.ergebnis.prozent / 100);
    }));
  }
}

function quizSchliessen() {
  quizOffen = false;
  quizLauf = null;
  const element = $("#quiz");
  element.classList.remove("offen");
  element.setAttribute("aria-hidden", "true");
  allesAktualisieren();
}

// ---------- 7. Speichern & Fehler wiederholen ----------

function quizErgebnisse(fachId) {
  return laden(QUIZ_SCHLUESSEL, [])
    .filter((e) => e.fachId === fachId)
    .sort((a, b) => b.erstellt - a.erstellt);
}

function quizErgebnisSpeichern() {
  const alle = laden(QUIZ_SCHLUESSEL, []);
  const { fachId, thema, stufe, art, fragen, gewaehlt, ergebnis } = quizLauf;

  // Beim Wiederholen: richtig beantwortete Fehler gelten als behoben
  if (art === "wiederholung") {
    fragen.forEach((f, i) => {
      if (gewaehlt[i] !== f.richtig) return;
      alle.filter((e) => e.fachId === fachId).forEach((e) => {
        (e.falsch || []).forEach((alt) => {
          if (alt.frage === f.frage) alt.behoben = true;
        });
      });
    });
  }

  alle.push({
    id: neueId(),
    fachId,
    thema,
    datum: datumKey(new Date()),
    stufe,
    art,
    anzahl: fragen.length,
    richtig: ergebnis.richtig,
    punkte: ergebnis.punkte,
    // Bei Wiederholungen bleiben die Fehler in ihrem ursprünglichen Quiz gespeichert
    falsch: art === "wiederholung" ? [] : ergebnis.falsch.map((f) => ({
      id: neueId(),
      frage: f.frage,
      antworten: f.antworten,
      richtig: f.richtig,
      erklaerung: f.erklaerung,
      gewaehlt: f.gewaehlt,
      behoben: false
    })),
    erstellt: Date.now()
  });
  speichern(QUIZ_SCHLUESSEL, alle);
}

// Alle noch nicht behobenen Fehler eines Fachs (jede Frage nur einmal)
function fehlerPool(fachId) {
  const gesehen = new Set();
  const pool = [];
  quizErgebnisse(fachId).forEach((e) => {
    (e.falsch || []).forEach((f) => {
      if (f.behoben || gesehen.has(f.frage)) return;
      gesehen.add(f.frage);
      pool.push({ frage: f.frage, antworten: f.antworten, richtig: f.richtig, erklaerung: f.erklaerung });
    });
  });
  return pool;
}

function fehlerWiederholen(fachId) {
  const pool = fehlerPool(fachId);
  if (!pool.length) return zeigeToast("Keine Fehler zum Wiederholen – stark!");
  // Mischen und höchstens 15 Fragen
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  quizStarten({ fachId, thema: "Fehler wiederholen", stufe: "", art: "wiederholung", fragen: pool.slice(0, 15) });
}

// ---------- 8. Bereich auf der Fachseite ----------

function quizBereichRendern(fachId) {
  const ziel = $("#fach-quiz");
  if (!ziel) return;
  const ergebnisse = quizErgebnisse(fachId).slice(0, 3);
  const pool = fehlerPool(fachId).length;

  const liste = ergebnisse.length
    ? `<div class="liste">${ergebnisse.map((e) => {
        const titel = e.art === "wiederholung" ? "Fehler wiederholt" : e.thema;
        const meta = [`${e.richtig} von ${e.anzahl} richtig`, QUIZ_STUFEN_NAMEN[e.stufe], faelligText(e.datum).replace(/^./, (z) => z.toUpperCase())].filter(Boolean).join(" · ");
        return `
          <div class="thema note-zeile">
            <span class="punkte-pill" title="${e.punkte} Notenpunkte">${e.punkte}</span>
            <span class="thema-text">${esc(titel)}<small class="aufgabe-meta">${esc(meta)}</small></span>
          </div>`;
      }).join("")}</div>`
    : '<div class="liste"><p class="leer">Noch kein Quiz. Erstelle eins aus deinen Lernthemen.</p></div>';

  ziel.innerHTML = `
    ${liste}
    <div class="quiz-start-knoepfe">
      <button class="knopf drueckbar" data-aktion="quiz-auf">Quiz erstellen</button>
      ${pool ? `<button class="knopf zweit drueckbar" data-aktion="quiz-fehler-wiederholen">Fehler wiederholen (${pool})</button>` : ""}
    </div>`;
}

// ---------- 9. Klicks & Tasten ----------

Object.assign(AKTIONEN, {
  "quiz-auf": () => oeffneQuizSheet(zustand.offenesFach),
  "quiz-kopieren": () => quizAnfrageKopieren(),
  "quiz-starten": () => quizAusEingabeStarten(),
  "quiz-weiter": () => quizWeiter(),
  "quiz-abbrechen": () => quizSchliessen(),
  "quiz-schliessen": () => quizSchliessen(),
  "quiz-fehler-wiederholen": () => fehlerWiederholen(quizLauf ? quizLauf.fachId : zustand.offenesFach)
});

document.addEventListener("click", (e) => {
  const themaChip = e.target.closest("[data-quiz-thema]");
  if (themaChip) {
    const i = Number(themaChip.dataset.quizThema);
    quizWahl.themen = quizWahl.themen.includes(i) ? quizWahl.themen.filter((x) => x !== i) : [...quizWahl.themen, i];
    themaChip.classList.toggle("aktiv", quizWahl.themen.includes(i));
    return;
  }

  const wahl = e.target.closest("[data-quiz-feld]");
  if (wahl) {
    const feld = wahl.dataset.quizFeld;
    quizWahl[feld] = feld === "anzahl" ? Number(wahl.dataset.wert) : wahl.dataset.wert;
    const segment = wahl.closest(".segment");
    const knoepfe = [...segment.querySelectorAll("button")];
    segment.style.setProperty("--pos", knoepfe.indexOf(wahl));
    knoepfe.forEach((k) => {
      k.classList.toggle("aktiv", k === wahl);
      k.setAttribute("aria-checked", k === wahl);
    });
    return;
  }

  const antwort = e.target.closest("[data-quiz-antwort]");
  if (antwort) quizAntworten(Number(antwort.dataset.quizAntwort));
});

document.addEventListener("input", (e) => {
  if (e.target.id === "quiz-antwort") $("#quiz-fehler").textContent = "";
  if (e.target.id === "quiz-eigenes") quizWahl.eigenes = e.target.value;
});

document.addEventListener("keydown", (e) => {
  if (!quizOffen || !quizLauf || ["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;

  if (quizLauf.fertig) {
    if (e.key === "Escape") quizSchliessen();
    return;
  }

  // 1–4 oder A–D wählt eine Antwort, Enter geht weiter
  const taste = e.key.toUpperCase();
  const i = "1234".includes(taste) && taste.length === 1 ? Number(taste) - 1 : "ABCD".indexOf(taste);
  const beantwortet = quizLauf.gewaehlt[quizLauf.index] !== undefined;
  if (i >= 0 && taste.length === 1 && !beantwortet) {
    e.preventDefault();
    quizAntworten(i);
  } else if (e.key === "Enter" && beantwortet) {
    e.preventDefault();
    quizWeiter();
  }
});
