// ==========================================================
// Lernbegleiter – Fokus
// Der Tab „Fokus“: eine Lernzeit am Stück mit großem Timer.
// Auf dem iPhone kann die App währenddessen ablenkende Apps sperren –
// über die Kurzbefehle-App von Apple (einmal einrichten, siehe Anleitung).
// Nutzt Hilfsfunktionen und den Timer aus app.js, deshalb wird diese Datei nach app.js geladen.
//
// Eine Fokus-Zeit ist ein ganz normaler Timer (lb-timer) mit art: "fokus".
// Die Minuten zählen deshalb automatisch in der Statistik und auf der Fachseite mit.
// ==========================================================

const SITZUNGEN_SCHLUESSEL = "lb-sitzungen";
const DAUER_STUFEN = [25, 45, 60, 90, 120];
const KURZBEFEHL_START = "Fokus Start";
const KURZBEFEHL_STOPP = "Fokus Stopp";
const HALTEN_MS = 1500; // so lange muss man „Beenden“ gedrückt halten

const SPRUECHE = [
  "Handy weg, Kopf an.",
  "Eine Sache. Volle Aufmerksamkeit.",
  "Jede Minute zählt.",
  "Kleine Schritte, großer Fortschritt.",
  "Du schaffst das.",
  "Alles andere kann warten."
];

// Was im Fokus-Tab gerade ausgewählt ist
const fokusWahl = {
  dauer: null, // Minuten (null = zuletzt gewählte Dauer aus den Einstellungen)
  fachId: null, // null = freies Lernen
  ziel: null // { typ: "ha" | "lernen", id } – eine Aufgabe aus dem Tagesplan
};

SYMBOL.schloss = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/></svg>';
SYMBOL.minus = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M5 12h14"/></svg>';

// ---------- Hilfsfunktionen ----------

function fokusDauer() {
  return fokusWahl.dauer || einstellungen().fokusDauer || 45;
}

// "bis 16:30" – wann die Fokus-Zeit enden würde, wenn man jetzt startet
function fokusBisText() {
  return `bis ${zeitText(jetztInMinuten(new Date(Date.now() + fokusDauer() * 60000)))}`;
}

function laeuftFokus() {
  return !!timer && timer.art === "fokus" && !timer.fertig;
}

function sitzungen() {
  return laden(SITZUNGEN_SCHLUESSEL, []);
}

function sitzungenHeute() {
  const key = datumKey(new Date());
  return sitzungen().filter((s) => datumKey(new Date(s.start)) === key);
}

// Die laufende Fokus-Zeit als Sitzung merken (die letzten 200 reichen)
function sitzungSpeichern(status, minuten) {
  const alle = sitzungen();
  alle.push({
    id: neueId(),
    start: timer.start,
    ende: Date.now(),
    geplant: Math.round(timer.dauer / 60),
    minuten,
    fachId: timer.fachId || null,
    titel: timer.titel,
    status // "geschafft", "erledigt" oder "abgebrochen"
  });
  speichern(SITZUNGEN_SCHLUESSEL, alle.slice(-200));
}

// Offene Aufgaben aus dem heutigen Tagesplan – daran kann man im Fokus arbeiten
function fokusAufgaben() {
  return tagesplan(new Date()).offen.map((e) => {
    if (e.typ === "ha") {
      const fach = FAECHER[e.aufgabe.fachId] || { name: "Allgemein" };
      return { typ: "ha", id: e.aufgabe.id, fachId: e.aufgabe.fachId, titel: e.aufgabe.text, dauer: e.dauer, info: `${fach.name} · ${e.dauer} Min.` };
    }
    const fach = FAECHER[e.klausur.fachId] || { name: "Klausur" };
    return {
      typ: "lernen",
      id: e.klausur.id,
      fachId: e.klausur.fachId,
      titel: e.klausur.thema ? `Lernen: ${e.klausur.thema}` : "Lernen für die Klausur",
      dauer: e.dauer,
      info: `${fach.name} · Klausur ${countdownText(tageBis(e.klausur.datum))} · ${e.dauer} Min.`
    };
  });
}

// Woran wird gearbeitet? → Bezug (für „Aufgabe erledigt“), Titel und Fach
function fokusZiel() {
  const aufgabe = fokusWahl.ziel && fokusAufgaben().find((a) => a.typ === fokusWahl.ziel.typ && a.id === fokusWahl.ziel.id);
  if (aufgabe) return { bezug: { typ: aufgabe.typ, id: aufgabe.id }, titel: aufgabe.titel, fachId: aufgabe.fachId };
  const fach = FAECHER[fokusWahl.fachId];
  return { bezug: null, titel: fach ? `${fach.name} lernen` : "Fokus-Zeit", fachId: fach ? fokusWahl.fachId : null };
}

function aufgabeSchonErledigt(bezug) {
  if (!bezug) return true;
  if (bezug.typ === "ha") return !!(hausaufgaben().find((a) => a.id === bezug.id) || {}).erledigt;
  return gelerntHeute().includes(bezug.id);
}

// ---------- Apps sperren (über die Kurzbefehle-App) ----------

// Nur auf iPhone und iPad gibt es die Kurzbefehle-App
function istIphone() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function sperreAktiv() {
  const e = einstellungen();
  return !!(e.sperre && e.sperreEingerichtet);
}

// Startet einen Kurzbefehl über seinen Namen, z. B. „Fokus Start“ mit der Dauer in Minuten
function kurzbefehlStarten(name, eingabe) {
  if (!istIphone()) return zeigeToast("Apps sperren klappt nur auf dem iPhone");
  let adresse = "shortcuts://run-shortcut?name=" + encodeURIComponent(name);
  if (eingabe !== undefined) adresse += "&input=text&text=" + encodeURIComponent(eingabe);
  location.href = adresse;
}

function sperreUmschalten() {
  const e = einstellungen();
  if (!e.sperreEingerichtet) return oeffneAnleitung();
  const an = !e.sperre;
  einstellungAendern("sperre", an);
  const zeile = $("#sperre-zeile");
  if (!zeile) return;
  zeile.setAttribute("aria-checked", an);
  zeile.querySelector(".schalter").classList.toggle("an", an);
  zeile.querySelector("small").textContent = an ? "An – startet mit der Fokus-Zeit" : "Aus";
}

// ---------- Fokus-Zeit starten und beenden ----------

function fokusStarten() {
  if (laeuftFokus()) return oeffneTimer();
  if (timer && timer.aktiv && timer.art !== "fokus") fokusAbrechnen(); // ein laufender Lern-Timer wird sauber beendet
  tonVorbereiten();

  const { bezug, titel, fachId } = fokusZiel();
  const min = fokusDauer();
  const dauer = min * 60;
  const sperre = sperreAktiv();
  timer = {
    aktiv: true,
    art: "fokus",
    bezug,
    titel,
    fachId,
    phase: "fokus",
    dauer,
    start: Date.now(),
    ende: Date.now() + dauer * 1000,
    rest: dauer,
    laeuft: true,
    runde: 0,
    sperre,
    spruch: Math.floor(Math.random() * SPRUECHE.length)
  };
  timerSpeichern();
  fokusWahl.ziel = null;
  oeffneTimer();
  if (zustand.ansicht === "fokus") render("fokus", false);

  // Kurz warten, damit man den Timer hereingleiten sieht – dann den Kurzbefehl starten
  if (sperre) setTimeout(() => kurzbefehlStarten(KURZBEFEHL_START, min), 700);
}

// Die Zeit ist abgelaufen: Minuten gutschreiben und „Geschafft“ zeigen
function fokusGeschafft(liveDabei) {
  const min = Math.round(timer.dauer / 60);
  fokusGutschreiben(min, timer.fachId);
  sitzungSpeichern("geschafft", min);
  timer.fertig = true;
  timer.laeuft = false;
  timer.rest = 0;
  timerSpeichern();
  document.title = "Lernbegleiter";

  if (liveDabei) {
    klingeln();
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  }
  if (timerOffen) timerRendern();
  else oeffneTimer();
  allesAktualisieren();
}

// Wird von timerStoppen() in app.js aufgerufen – auch bei „Fertig“ und „Aufgabe erledigt“
function fokusSitzungBeenden() {
  if (timer.fertig) return; // schon abgeschlossen und gespeichert
  const min = Math.floor((timer.dauer - restSekunden()) / 60);
  fokusGutschreiben(min, timer.fachId);
  if (min >= 1 || timer.erledigt) sitzungSpeichern(timer.erledigt ? "erledigt" : "abgebrochen", min);
  // Früher fertig? Dann den iPhone-Fokus ausschalten, damit alle Apps wieder frei sind
  if (timer.sperre) setTimeout(() => kurzbefehlStarten(KURZBEFEHL_STOPP), 400);
}

function fokusNochmal() {
  fokusWahl.dauer = Math.round(timer.dauer / 60);
  fokusWahl.fachId = timer.fachId;
  fokusWahl.ziel = timer.bezug;
  fokusStarten();
}

// Beim Start der App: eine Fokus-Zeit, die abgelaufen ist, während die App zu war
function fokusLaden() {
  if (laeuftFokus() && Date.now() >= timer.ende) fokusGeschafft(false);
}

// ---------- Auswahl im Fokus-Tab ----------

function fokusDauerSetzen(min) {
  fokusWahl.dauer = Math.min(240, Math.max(5, min));
  einstellungAendern("fokusDauer", fokusWahl.dauer);
  fokusAuswahlZeigen();
  const zahl = $("#fokus-zahl");
  if (zahl) {
    zahl.classList.remove("tick");
    void zahl.offsetWidth;
    zahl.classList.add("tick");
  }
}

function fokusFachWaehlen(knopf) {
  fokusWahl.fachId = knopf.dataset.wert || null;
  if (fokusWahl.ziel) {
    const aufgabe = fokusAufgaben().find((a) => a.id === fokusWahl.ziel.id);
    if (!aufgabe || aufgabe.fachId !== fokusWahl.fachId) fokusWahl.ziel = null;
  }
  fokusAuswahlZeigen();
  knopf.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
}

function fokusAufgabeWaehlen(knopf) {
  const { typ, id } = knopf.dataset;
  if (fokusWahl.ziel && fokusWahl.ziel.id === id) {
    fokusWahl.ziel = null;
  } else {
    const aufgabe = fokusAufgaben().find((a) => a.typ === typ && a.id === id);
    if (!aufgabe) return;
    fokusWahl.ziel = { typ, id };
    fokusWahl.fachId = FAECHER[aufgabe.fachId] ? aufgabe.fachId : null;
    fokusWahl.dauer = Math.min(240, Math.max(5, Math.round(aufgabe.dauer / 5) * 5)); // Dauer der Aufgabe vorschlagen
  }
  fokusAuswahlZeigen();
  const chip = document.querySelector("#fokus-faecher .chip.aktiv");
  if (chip) chip.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
}

// Auswahl anzeigen, ohne den ganzen Tab neu zu zeichnen
function fokusAuswahlZeigen() {
  const zahl = $("#fokus-zahl");
  if (!zahl) return;
  zahl.textContent = fokusDauer();
  $("#fokus-bis").textContent = fokusBisText();
  document.querySelectorAll("#fokus-stufen .chip").forEach((c) => c.classList.toggle("aktiv", Number(c.dataset.wert) === fokusDauer()));
  document.querySelectorAll("#fokus-faecher .chip").forEach((c) => c.classList.toggle("aktiv", c.dataset.wert === (fokusWahl.fachId || "")));
  document.querySelectorAll(".fokus-aufgabe").forEach((zeile) => {
    const gewaehlt = !!fokusWahl.ziel && zeile.dataset.id === fokusWahl.ziel.id;
    zeile.classList.toggle("gewaehlt", gewaehlt);
    zeile.setAttribute("aria-pressed", gewaehlt);
  });
}

// ---------- Ansicht „Fokus“ ----------

function fokusHtml() {
  const heute = fokusHeute();
  const anzahl = sitzungenHeute().filter((s) => s.status !== "abgebrochen").length;
  let i = 0;

  let html = `
    <header class="kopf kopf-zeile stagger" style="--i:${i++}">
      <div>
        <p class="kopf-oben">${heute ? `Heute ${dauerText(heute)} fokussiert` : "Bereit, wenn du es bist"}</p>
        <h1>Fokus</h1>
      </div>
      <div class="kopf-knoepfe">
        <button class="kopf-knopf" data-aktion="statistik" aria-label="Statistik">${SYMBOL.diagramm}</button>
      </div>
    </header>`;

  if (laeuftFokus()) {
    // Große Karte mit der laufenden Fokus-Zeit
    const fach = FAECHER[timer.fachId];
    const rest = restSekunden();
    html += `
      <button class="hero drueckbar stagger" style="--i:${i++}" data-aktion="timer-auf">
        <span class="hero-oben">
          <span class="hero-status"><span class="punkt"></span>Fokus läuft</span>
          <span>bis ${zeitText(jetztInMinuten(new Date(timer.ende)))}</span>
        </span>
        <span class="hero-fach fokus-hero-zeit" id="fokus-hero-zeit">${uhr(rest)}</span>
        <span class="hero-info">${esc(timer.titel)}${fach ? " · " + esc(fach.name) : ""}</span>
        <span class="fortschritt"><span class="fortschritt-balken" id="fokus-hero-balken" data-wert="${(1 - rest / timer.dauer).toFixed(3)}"></span></span>
        <span class="hero-rest"><span>${timer.sperre ? "Apps gesperrt" : "Ohne App-Sperre"}</span><span>Öffnen ›</span></span>
      </button>`;
  } else {
    html += fokusEinstellenHtml(i);
    i += 6;
  }

  html += `
    <div class="kacheln stagger" style="--i:${i++}">
      <button class="kachel drueckbar" data-aktion="statistik"><span class="kachel-wert">${kachelDauerHtml(heute)}</span><span class="kachel-name">Heute</span></button>
      <div class="kachel"><span class="kachel-wert">${anzahl}</span><span class="kachel-name">${anzahl === 1 ? "Sitzung" : "Sitzungen"}</span></div>
      <div class="kachel"><span class="kachel-wert">${lernSerie()}<small> ${lernSerie() === 1 ? "Tag" : "Tage"}</small></span><span class="kachel-name">Lernserie</span></div>
    </div>`;

  const letzte = sitzungen().slice(-5).reverse();
  if (letzte.length) {
    html += `
      <h2 class="abschnitt stagger" style="--i:${i++}">Letzte Sitzungen</h2>
      <div class="liste fokus-verlauf stagger" style="--i:${i++}">${letzte.map(sitzungHtml).join("")}</div>`;
  }
  return html;
}

// Dauer, Fach/Aufgabe, Apps sperren und der Start-Knopf
function fokusEinstellenHtml(i) {
  const e = einstellungen();
  const dauer = fokusDauer();
  const aufgaben = fokusAufgaben();
  const iphone = istIphone();
  let sperreInfo = "Aus";
  if (!e.sperreEingerichtet) sperreInfo = iphone ? "Noch nicht eingerichtet" : "Nur auf dem iPhone";
  else if (e.sperre) sperreInfo = "An – startet mit der Fokus-Zeit";

  return `
    <div class="noten-karte fokus-karte stagger" style="--i:${i}">
      <span class="noten-titel">Wie lange?</span>
      <div class="fokus-dauer">
        <button class="rund-knopf klein drueckbar" data-aktion="fokus-minus" aria-label="5 Minuten weniger">${SYMBOL.minus}</button>
        <span class="fokus-zahl"><span id="fokus-zahl" aria-live="polite">${dauer}</span><small>Min.</small></span>
        <button class="rund-knopf klein drueckbar" data-aktion="fokus-plus" aria-label="5 Minuten mehr">${SYMBOL.plus}</button>
      </div>
      <p class="fokus-bis" id="fokus-bis">${fokusBisText()}</p>
      <div class="fokus-chips" id="fokus-stufen">
        ${DAUER_STUFEN.map((min) => `<button class="chip ${min === dauer ? "aktiv" : ""}" data-aktion="fokus-dauer" data-wert="${min}">${min}</button>`).join("")}
      </div>
    </div>

    <h2 class="abschnitt stagger" style="--i:${i + 1}">Woran arbeitest du?</h2>
    <div class="chips fokus-faecher stagger" style="--i:${i + 2}" id="fokus-faecher">
      <button class="chip ${fokusWahl.fachId ? "" : "aktiv"}" data-aktion="fokus-fach" data-wert="">Frei lernen</button>
      ${Object.keys(FAECHER).map((id) => `<button class="chip ${id === fokusWahl.fachId ? "aktiv" : ""}" data-aktion="fokus-fach" data-wert="${id}">${esc(FAECHER[id].kurzname || FAECHER[id].name)}</button>`).join("")}
    </div>
    ${aufgaben.length ? `
      <div class="liste fokus-aufgaben stagger" style="--i:${i + 3}">
        ${aufgaben.map((a) => {
          const gewaehlt = !!fokusWahl.ziel && fokusWahl.ziel.id === a.id;
          return `
            <button class="thema fokus-aufgabe ${a.typ === "lernen" ? "lernblock" : ""} ${gewaehlt ? "gewaehlt" : ""}" data-aktion="fokus-aufgabe" data-typ="${a.typ}" data-id="${a.id}" aria-pressed="${gewaehlt}">
              <span class="haken" aria-hidden="true">${SYMBOL.haken}</span>
              <span class="thema-text">${esc(a.titel)}<small class="aufgabe-meta">${esc(a.info)}</small></span>
            </button>`;
        }).join("")}
      </div>
      <p class="hinweis stagger" style="--i:${i + 3}">Aus deinem Plan für heute. Tippe eine Aufgabe an, um sie in der Fokus-Zeit zu erledigen.</p>` : ""}

    <h2 class="abschnitt stagger" style="--i:${i + 4}">Apps sperren</h2>
    <div class="liste stagger" style="--i:${i + 4}">
      <button class="infozeile schalter-zeile" id="sperre-zeile" data-aktion="sperre-umschalten" role="switch" aria-checked="${sperreAktiv()}">
        <span>Ablenkende Apps sperren<small>${sperreInfo}</small></span>
        <span class="schalter ${sperreAktiv() ? "an" : ""}" aria-hidden="true"></span>
      </button>
      <button class="infozeile" data-aktion="anleitung-auf">
        <span>Einrichten</span>
        <span>${e.sperreEingerichtet ? "Eingerichtet ✓" : "Anleitung"} ›</span>
      </button>
    </div>
    <p class="hinweis stagger" style="--i:${i + 4}">Öffnest du während der Fokus-Zeit z. B. Instagram oder TikTok, schickt dich dein iPhone sofort zurück. Apps, die du zum Lernen brauchst, bleiben offen.</p>

    <button class="knopf breit drueckbar fokus-start stagger" style="--i:${i + 5}" data-aktion="fokus-start">Fokus starten</button>`;
}

function sitzungHtml(s) {
  const d = new Date(s.start);
  const istHeute = datumKey(d) === datumKey(new Date());
  const fach = FAECHER[s.fachId];
  const status = { geschafft: "Geschafft ✓", erledigt: "Aufgabe erledigt ✓", abgebrochen: `Beendet nach ${dauerText(s.minuten)}` }[s.status];
  const teile = [s.status === "abgebrochen" ? `${dauerText(s.geplant)} geplant` : dauerText(s.minuten), fach ? fach.name : "", status].filter(Boolean);
  return `
    <div class="thema sitzung ${s.status}">
      <span class="plan-zeit">${istHeute ? zeitText(jetztInMinuten(d)) : TAG_KURZ[d.getDay()] + "."}</span>
      <span class="thema-text">${esc(s.titel)}<small class="aufgabe-meta">${esc(teile.join(" · "))}</small></span>
    </div>`;
}

// Läuft mit dem Timer mit (aus timerTick in app.js): die große Karte im Tab aktualisieren
function fokusTick(rest) {
  const zeit = $("#fokus-hero-zeit");
  if (zeit) zeit.textContent = uhr(rest);
  const balken = $("#fokus-hero-balken");
  if (balken) balken.style.setProperty("--wert", (1 - rest / timer.dauer).toFixed(3));
}

// ---------- Vollbild während der Fokus-Zeit ----------

function fokusTimerHtml() {
  if (timer.fertig) return fokusFertigHtml();
  const fach = FAECHER[timer.fachId];
  const rest = restSekunden();

  return `
    <div class="timer-leiste">
      <button class="text-knopf" data-aktion="timer-zu">${SYMBOL.runter} Minimieren</button>
      ${timer.sperre
        ? `<span class="fokus-schloss">${SYMBOL.schloss} Apps gesperrt</span>`
        : `<button class="text-knopf timer-heute" data-aktion="statistik-aus-timer">${fokusHeute() ? `Heute ${dauerText(fokusHeute())} fokussiert` : "Deine erste Fokus-Zeit heute"} ›</button>`}
    </div>
    <div class="timer-inhalt fokus-modus">
      <p class="timer-phase">Fokus-Zeit · ${dauerText(Math.round(timer.dauer / 60))}</p>
      <h2 class="timer-titel">${esc(timer.titel)}</h2>
      <p class="timer-fach">${esc(fach ? fach.name : "Freies Lernen")}</p>

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

      <p class="fokus-spruch">${esc(SPRUECHE[timer.spruch] || SPRUECHE[0])}</p>

      <button class="halten-knopf" data-halten aria-label="Fokus-Zeit beenden (gedrückt halten)">
        <span class="halten-fuellung"></span>
        <span class="halten-text">${SYMBOL.stopp} Halten zum Beenden</span>
      </button>

      ${timer.bezug ? `<button class="knopf timer-erledigt drueckbar" data-aktion="timer-erledigt">${SYMBOL.hakenKlein} Aufgabe erledigt</button>` : ""}
    </div>`;
}

function fokusFertigHtml() {
  const min = Math.round(timer.dauer / 60);
  const fach = FAECHER[timer.fachId];
  const heute = fokusHeute();
  const anzahl = sitzungenHeute().filter((s) => s.status !== "abgebrochen").length;
  const serie = lernSerie();

  return `
    <div class="timer-leiste">
      <button class="text-knopf" data-aktion="timer-zu">${SYMBOL.runter} Minimieren</button>
      <button class="text-knopf timer-heute" data-aktion="statistik-aus-timer">Statistik ›</button>
    </div>
    <div class="timer-inhalt fokus-fertig">
      <span class="fokus-fertig-symbol" aria-hidden="true">${SYMBOL.fertig}</span>
      <p class="timer-phase">Geschafft</p>
      <h2 class="timer-titel">${dauerText(min)} fokussiert</h2>
      <p class="timer-fach">${esc(timer.titel)}${fach ? " · " + esc(fach.name) : ""}</p>

      <div class="kacheln">
        <div class="kachel"><span class="kachel-wert">${kachelDauerHtml(heute)}</span><span class="kachel-name">Heute</span></div>
        <div class="kachel"><span class="kachel-wert">${anzahl}</span><span class="kachel-name">${anzahl === 1 ? "Sitzung" : "Sitzungen"}</span></div>
        <div class="kachel"><span class="kachel-wert">${serie}<small> ${serie === 1 ? "Tag" : "Tage"}</small></span><span class="kachel-name">Lernserie</span></div>
      </div>

      ${!aufgabeSchonErledigt(timer.bezug) ? `<button class="knopf breit drueckbar" data-aktion="timer-erledigt">Aufgabe erledigt</button>` : ""}
      <button class="knopf breit drueckbar ${aufgabeSchonErledigt(timer.bezug) ? "" : "zweit"}" data-aktion="timer-stopp">Fertig</button>
      <button class="text-knopf fokus-nochmal" data-aktion="fokus-nochmal">Noch mal ${dauerText(min)}</button>
    </div>`;
}

// „Halten zum Beenden“: Ein kurzer Tipper reicht nicht – so beendet man nicht aus Versehen
let haltenTimer = null;

document.addEventListener("pointerdown", (e) => {
  const knopf = e.target.closest("[data-halten]");
  if (!knopf) return;
  knopf.classList.add("haelt");
  delete knopf.dataset.ausgeloest;
  clearTimeout(haltenTimer);
  haltenTimer = setTimeout(() => {
    haltenTimer = null;
    knopf.classList.remove("haelt");
    knopf.dataset.ausgeloest = "1";
    if (navigator.vibrate) navigator.vibrate(30);
    timerStoppen();
    zeigeToast("Fokus-Zeit beendet");
  }, HALTEN_MS);
});

function haltenAbbrechen() {
  if (!haltenTimer) return;
  clearTimeout(haltenTimer);
  haltenTimer = null;
  document.querySelectorAll(".haelt").forEach((k) => k.classList.remove("haelt"));
}

document.addEventListener("pointerup", haltenAbbrechen);
document.addEventListener("pointercancel", haltenAbbrechen);

document.addEventListener("click", (e) => {
  const knopf = e.target.closest("[data-halten]");
  if (!knopf || knopf.dataset.ausgeloest) return;
  // Mit der Tastatur (Enter/Leertaste) gibt es kein Gedrückthalten – dann lieber nachfragen
  if (e.detail === 0) {
    if (confirm("Fokus-Zeit wirklich beenden?")) timerStoppen();
    return;
  }
  zeigeToast("Zum Beenden gedrückt halten");
});

// ---------- Anleitung „Apps sperren“ (Seite von rechts) ----------

function schrittHtml(nr, titel, punkte, i) {
  return `
    <section class="liste schritt stagger" style="--i:${i}">
      <h3 class="schritt-kopf"><span class="schritt-nr">${nr}</span>${titel}</h3>
      <ul class="schritt-liste">${punkte.map((p) => `<li>${p}</li>`).join("")}</ul>
    </section>`;
}

function anleitungHtml() {
  const eingerichtet = einstellungen().sperreEingerichtet;
  return `
    <div class="detail-leiste">
      <button class="zurueck" data-aktion="zurueck">${SYMBOL.zurueck}${ANSICHT_NAMEN[zustand.ansicht]}</button>
    </div>
    <div class="detail-inhalt anleitung">
      <header class="kopf stagger" style="--i:0">
        <p class="kopf-oben">Einmal einrichten · ca. 10 Min.</p>
        <h1>Apps sperren</h1>
      </header>

      ${istIphone() ? "" : `<p class="hinweis anleitung-warnung stagger" style="--i:0">Du bist gerade nicht auf einem iPhone. Das Sperren klappt nur dort – der Fokus-Timer funktioniert aber überall.</p>`}

      <div class="noten-karte stagger" style="--i:1">
        <p class="anleitung-intro">Web-Apps wie der Lernbegleiter dürfen auf dem iPhone keine anderen Apps sperren. Mit der App <strong>Kurzbefehle</strong> (ist schon auf jedem iPhone) klappt es trotzdem:</p>
        <ul class="schritt-liste">
          <li>Du startest im Lernbegleiter deine <b>Fokus-Zeit</b>.</li>
          <li>Der Kurzbefehl schaltet den iPhone-Fokus <b>„Lernen“</b> ein – genau so lange, wie dein Timer läuft.</li>
          <li>Öffnest du in der Zeit eine gesperrte App, landest du sofort wieder auf dem <b>Home-Bildschirm</b>.</li>
        </ul>
        <p class="hinweis anleitung-namen">Wichtig: Schreib alle Namen <b>genau so</b> wie hier, auch mit Leerzeichen und Großbuchstaben.</p>
      </div>

      ${schrittHtml(1, "Fokus „Lernen“ anlegen", [
        "Öffne <b>Einstellungen → Fokus</b> und tippe oben rechts auf <b>+</b>.",
        "Wähle <b>Eigener</b>, nenne ihn <b>Lernen</b> und tippe auf <b>Weiter</b>.",
        "Tipp: Bei <b>Mitteilungen</b> kannst du nur die Personen und Apps erlauben, die du zum Lernen brauchst. Alles andere bleibt dann still."
      ], 2)}

      ${schrittHtml(2, "Kurzbefehl „Fokus Start“", [
        "Öffne die App <b>Kurzbefehle</b>, unten <b>Kurzbefehle</b>, oben rechts <b>+</b>.",
        "Tippe oben auf den Namen und nenne den Kurzbefehl <b>Fokus Start</b>.",
        "Aktion <b>Datum anpassen</b> hinzufügen: <b>Addieren</b> · als Zahl die Variable <b>Kurzbefehleingabe</b> · Einheit <b>Minuten</b> · Datum <b>Aktuelles Datum</b>.",
        "Aktion <b>Fokus festlegen</b> hinzufügen: <b>Lernen</b> · <b>einschalten</b> · bis <b>Uhrzeit</b> → als Uhrzeit die Variable <b>Angepasstes Datum</b> wählen."
      ], 3)}

      ${schrittHtml(3, "Kurzbefehl „Fokus Stopp“", [
        "Noch ein neuer Kurzbefehl, Name: <b>Fokus Stopp</b>.",
        "Aktion <b>Fokus festlegen</b>: <b>Lernen</b> · <b>ausschalten</b>.",
        "Den braucht die App, wenn du die Fokus-Zeit früher beendest."
      ], 4)}

      ${schrittHtml(4, "Merken, ob der Fokus läuft", [
        "Unten auf <b>Automation</b> → <b>+</b> → <b>Fokus</b> → <b>Lernen</b> → <b>Beim Aktivieren</b> → <b>Sofort ausführen</b> → <b>Weiter</b> → <b>Neuer leerer Kurzbefehl</b>.",
        "Aktion <b>Text</b> mit dem Inhalt <b>an</b>.",
        "Aktion <b>Datei sichern</b>: <b>Speicherort erfragen</b> aus · Pfad <b>fokus.txt</b> · <b>Überschreiben, falls vorhanden</b> an.",
        "Dieselbe Automation noch einmal für <b>Beim Deaktivieren</b> – nur mit dem Text <b>aus</b>. Wenn du magst, hier noch die Aktion <b>Mitteilung anzeigen</b> mit „Fokus-Zeit vorbei 🎉“."
      ], 5)}

      ${schrittHtml(5, "Ablenkende Apps sperren", [
        "<b>Automation</b> → <b>+</b> → <b>App</b> → <b>Auswählen</b>: alle Apps, die dich ablenken, z. B. Instagram, TikTok, YouTube, Snapchat und Spiele.",
        "Apps, die du zum Lernen brauchst (z. B. Taschenrechner, Wörterbuch, Notizen), wählst du <b>nicht</b> aus – die bleiben offen. Den Lernbegleiter selbst und Safari bitte auch nicht.",
        "<b>Wird geöffnet</b> an · <b>Sofort ausführen</b> → <b>Weiter</b> → <b>Neuer leerer Kurzbefehl</b>.",
        "Aktion <b>Datei abrufen</b>: <b>Dokumentauswahl einblenden</b> aus · Pfad <b>fokus.txt</b> · <b>Fehler, falls nicht gefunden</b> aus.",
        "Aktion <b>Text aus Eingabe abrufen</b> (nimmt die Datei).",
        "Aktion <b>Wenn</b>: <b>Text</b> · <b>enthält</b> · <b>an</b>.",
        "Zwischen „Wenn“ und „Sonst“: <b>Mitteilung anzeigen</b> mit „🔒 Fokus läuft – zurück zum Lernen!“ und danach <b>Zum Home-Bildschirm wechseln</b>."
      ], 6)}

      ${schrittHtml(6, "Testen", [
        "Tippe unten auf <b>1 Minute testen</b> und erlaube, dass Kurzbefehle geöffnet wird. Fragt das iPhone nach Erlaubnis für den Fokus, tippe auf <b>Erlauben</b>.",
        "Öffne eine gesperrte App: Du solltest sofort wieder auf dem Home-Bildschirm landen.",
        "Nach einer Minute geht der Fokus von allein aus und alles ist wieder frei."
      ], 7)}

      <div class="stagger" style="--i:8">
        <button class="knopf breit zweit drueckbar" data-aktion="anleitung-test">1 Minute testen</button>
        <button class="knopf breit drueckbar" data-aktion="anleitung-fertig">${eingerichtet ? "Fertig" : "Alles eingerichtet – Sperre einschalten"}</button>
        <p class="hinweis">Nach einem Kurzbefehl kommst du oben links über <b>◀ Lernbegleiter</b> oder per Wischen zurück in die App. Die Sperre hilft dir, sie ist aber nicht unknackbar: In den Kurzbefehlen kannst du sie jederzeit ausschalten.</p>
      </div>
    </div>`;
}

function oeffneAnleitung() {
  zustand.offenesFach = null;
  zustand.einstellungenOffen = false;
  zustand.statistikOffen = false;
  zustand.editorOffen = false;
  zustand.anleitungOffen = true;
  seiteOeffnen(anleitungHtml());
}

function anleitungFertig() {
  const neu = !einstellungen().sperreEingerichtet;
  einstellungAendern("sperreEingerichtet", true);
  if (neu) einstellungAendern("sperre", true);
  schliesseSeite();
  if (neu) zeigeToast("Apps sperren ist eingeschaltet 🔒");
}

// ---------- Klicks & Start ----------

ANSICHT_HTML.fokus = fokusHtml;

Object.assign(AKTIONEN, {
  "fokus-start": () => fokusStarten(),
  "fokus-minus": () => fokusDauerSetzen(fokusDauer() - 5),
  "fokus-plus": () => fokusDauerSetzen(fokusDauer() + 5),
  "fokus-dauer": (knopf) => fokusDauerSetzen(Number(knopf.dataset.wert)),
  "fokus-fach": fokusFachWaehlen,
  "fokus-aufgabe": fokusAufgabeWaehlen,
  "fokus-nochmal": () => fokusNochmal(),
  "sperre-umschalten": () => sperreUmschalten(),
  "anleitung-auf": () => oeffneAnleitung(),
  "anleitung-test": () => kurzbefehlStarten(KURZBEFEHL_START, 1),
  "anleitung-fertig": () => anleitungFertig()
});

// „bis 16:30“ im Fokus-Tab aktuell halten
setInterval(() => {
  const bis = $("#fokus-bis");
  if (bis) bis.textContent = fokusBisText();
}, 15000);

fokusLaden();
