/* Buszparkolók – service worker: az app offline is elindul; frissítéskor mindig a hálózatról jön az új változat. */
var CACHE = "bp-1.3.0";
var SHELL = ["./", "index.html", "parkolok.html", "web-bridge.js", "bus.jpeg", "bp_icon.png", "icon-192.png", "icon-512.png", "manifest.webmanifest"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf("bp-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;
  if (url.origin !== self.location.origin) return; // a szerver (script.google.com) hívásait nem érintjük
  var html = req.mode === "navigate" || /\.(html|js|webmanifest)$/.test(url.pathname) || url.pathname.slice(-1) === "/";
  if (html) {
    // hálózat először (mindig a legfrissebb), net nélkül a tárolt változat
    e.respondWith(fetch(req).then(function (r) {
      if (r && r.ok) { var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, cp); }); }
      return r;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (r) { return r || caches.match("index.html"); });
    }));
  } else {
    e.respondWith(caches.match(req).then(function (r) {
      return r || fetch(req).then(function (n) { if (n && n.ok) { var cp = n.clone(); caches.open(CACHE).then(function (c) { c.put(req, cp); }); } return n; });
    }));
  }
});
