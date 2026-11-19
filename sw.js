// Service worker: lets the site work offline after the first visit.
const V = "attendance-v1";
const SHELL = ["./", "index.html", "scanner.html", "dashboard.html", "card-maker.html", "sample-ids.html",
  "manifest.json", "kumi-logo.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"];

const LIBS = [
  "https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js"
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(V).then((c) =>
    c.addAll(SHELL).then(() => Promise.all(LIBS.map((u) => c.add(new Request(u, { mode: "no-cors" })).catch(() => {}))))
  ).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  // Never touch the online database: attendance data must always come from the network.
  if (u.hostname === "script.google.com" || u.hostname.endsWith("googleusercontent.com")) return;
  if (u.origin === location.origin) {
    // Our own pages: newest version when online, saved copy when offline.
    e.respondWith(fetch(r).then((res) => {
      const copy = res.clone();
      caches.open(V).then((c) => c.put(r, copy));
      return res;
    }).catch(() => caches.match(r).then((m) => m || caches.match("index.html"))));
    return;
  }
  // Libraries and fonts from other sites: keep a copy after the first load.
  e.respondWith(caches.match(r).then((m) => m || fetch(r).then((res) => {
    if (res && (res.ok || res.type === "opaque")) {
      const copy = res.clone();
      caches.open(V).then((c) => c.put(r, copy));
    }
    return res;
  })));
});
