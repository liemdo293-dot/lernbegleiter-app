// ==========================================================
// Lernbegleiter – Offline-Speicher (Service Worker)
// Merkt sich die Dateien der App, damit sie auch ohne Internet startet.
// Mit Internet holt er immer zuerst die neueste Version.
//
// Wichtig: Bei jeder neuen Version die Nummer in CACHE_NAME erhöhen.
// ==========================================================

const CACHE_NAME = "lernbegleiter-v2";

const APP_DATEIEN = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/style.css",
  "./js/daten.js",
  "./js/app.js",
  "./js/quiz.js",
  "./js/backup.js",
  "./js/stundenplan.js",
  "./bilder/apple-touch-icon.png",
  "./bilder/icon-192.png",
  "./bilder/icon-512.png"
];

// Beim Installieren: alle Dateien der App zwischenspeichern
self.addEventListener("install", (ereignis) => {
  ereignis.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_DATEIEN)));
  self.skipWaiting();
});

// Beim Aktivieren: alte Versionen aufräumen
self.addEventListener("activate", (ereignis) => {
  ereignis.waitUntil(
    caches.keys().then((namen) => Promise.all(namen.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
  );
  self.clients.claim();
});

// Zuerst aus dem Netz (höchstens 3 Sekunden warten), sonst aus dem Speicher
async function netzZuerst(anfrage) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const antwort = await Promise.race([
      fetch(anfrage),
      new Promise((_, ablehnen) => setTimeout(() => ablehnen(new Error("zu langsam")), 3000))
    ]);
    if (antwort && antwort.ok) cache.put(anfrage, antwort.clone());
    return antwort;
  } catch (fehler) {
    const gespeichert = await cache.match(anfrage, { ignoreSearch: true });
    if (gespeichert) return gespeichert;
    if (anfrage.mode === "navigate") return cache.match("./index.html");
    throw fehler;
  }
}

// Schriften von Google ändern sich nie: zuerst aus dem Speicher
async function speicherZuerst(anfrage) {
  const cache = await caches.open(CACHE_NAME);
  const gespeichert = await cache.match(anfrage);
  if (gespeichert) return gespeichert;
  const antwort = await fetch(anfrage);
  cache.put(anfrage, antwort.clone());
  return antwort;
}

self.addEventListener("fetch", (ereignis) => {
  const anfrage = ereignis.request;
  if (anfrage.method !== "GET") return;
  const adresse = new URL(anfrage.url);

  if (adresse.origin === self.location.origin) {
    ereignis.respondWith(netzZuerst(anfrage));
  } else if (adresse.hostname === "fonts.googleapis.com" || adresse.hostname === "fonts.gstatic.com") {
    ereignis.respondWith(speicherZuerst(anfrage));
  }
});
