/* Buszparkolók – webes híd (GitHub Pages / böngésző).
 * Az oldalak (index.html = belépés, parkolok.html) a Niotron WebViewerhez készültek: window.AppInventor.setWebViewString("ÜZENET")
 * hívással szólnak a „natív” oldalnak, az pedig bpAuthInit / bpInit / bpNativePos / bpBack függvényeket hív vissza.
 * Ez a fájl ugyanezt a felületet adja a böngésző saját eszközeivel (localStorage, navigator.geolocation, history).
 */
(function () {
  var PAGE = /parkolok\.html/i.test(location.pathname) ? "park" : "login";
  var root = document.documentElement;

  function get(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }
  function set(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }
  // kérjük, hogy a böngésző ne törölje magától a tárolt adatokat (belépés, lista)
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}

  /* ---- átvezető kép a lista oldalon: az első kirajzolásig ugyanaz a sötét kép, mint az „Indulás” ---- */
  function bootOff() {
    if (!root.classList.contains("bp-boot")) return;
    root.classList.add("bp-boot-out");
    setTimeout(function () { root.classList.remove("bp-boot", "bp-boot-out"); }, 260);
  }
  if (PAGE === "park") {
    root.classList.add("bp-boot");
    var st = document.createElement("style");
    st.textContent =
      "html.bp-boot{background:#14121C!important}" +
      "html.bp-boot body{visibility:hidden}" +
      "html.bp-boot::before,html.bp-boot::after{position:fixed;left:0;right:0;z-index:2147483647;pointer-events:none;transition:opacity .22s ease}" +
      "html.bp-boot::before{content:'';top:0;bottom:0;background:#14121C url(bp_icon.png) no-repeat center calc(50% - 22px)/104px 104px}" +
      "html.bp-boot::after{content:'Buszparkolók';top:calc(50% + 44px);text-align:center;color:#F4F1EA;font:900 18px Roboto,Arial,sans-serif}" +
      "html.bp-boot-out::before,html.bp-boot-out::after{opacity:0}";
    (document.head || root).appendChild(st);
    setTimeout(bootOff, 5000); // biztonsági háló
  }

  /* ---- helymeghatározás ---- */
  var watchId = null;
  function locStop() { if (watchId !== null) { try { navigator.geolocation.clearWatch(watchId); } catch (e) {} watchId = null; } }
  function locErr(kind) { locStop(); if (window.bpNativePosErr) window.bpNativePosErr(kind); }
  function locStart() {
    if (watchId !== null) return;
    if (!navigator.geolocation) { locErr("timeout"); return; }
    watchId = navigator.geolocation.watchPosition(function (pos) {
      if (window.bpNativePos) window.bpNativePos(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
    }, function (err) {
      locErr(err && err.code === 1 ? "perm" : "timeout");
    }, { enableHighAccuracy: true, timeout: 25000, maximumAge: 0 });
  }

  /* ---- külső hivatkozás (Google Maps, telefonszám, weboldal) ---- */
  function openExternal(uri) {
    if (/^https?:/i.test(uri)) {
      // (a "noopener" kapcsolóval a window.open mindig null-t ad, ezért kézzel bontjuk a kapcsolatot)
      var w = null; try { w = window.open(uri, "_blank"); } catch (e) {}
      if (w) { try { w.opener = null; } catch (e) {} } else location.href = uri; // felugró ablak tiltva: ugyanitt nyílik meg
    }
    else location.href = uri; // tel:, geo: stb.
  }

  /* ---- az oldalak üzenetei (ugyanazok, mint a Niotron blokkokban) ---- */
  function onMessage(s) {
    s = String(s || "");
    if (PAGE === "login") {
      if (s === "login_start") { location.href = "parkolok.html"; return; }
      if (s.indexOf("AUTHSAVE:") === 0) { set("bpAuth", s.substring(9)); return; }
      if (s.indexOf("LOGIN:") === 0) { set("bpLastStart", s.substring(6)); location.href = "parkolok.html#s=" + encodeURIComponent(s.substring(6)); return; }
      return;
    }
    if (s.indexOf("PCACHE:") === 0) return; // a lista oldal maga is elmenti (bpCache)
    if (s.indexOf("NAV:") === 0) { openExternal(s.substring(4)); return; }
    if (s === "PBACK") { locStop(); leaving = true; location.replace("index.html"); return; }
    if (s === "LOCATE") { locStart(); return; }
    if (s === "LOCATE_STOP") { locStop(); return; }
  }
  window.AppInventor = { setWebViewString: onMessage, getWebViewString: function () { return ""; } };

  /* ---- vissza (telefon vissza gombja / böngésző vissza): az app saját visszalépése ---- */
  var leaving = false;
  if (PAGE === "park") {
    try { history.replaceState({ bpBase: 1 }, ""); history.pushState({ bpTop: 1 }, ""); } catch (e) {}
    window.addEventListener("popstate", function () {
      if (leaving) return;
      try { history.pushState({ bpTop: 1 }, ""); } catch (e) {}
      if (window.bpBack) window.bpBack(); else { leaving = true; location.replace("index.html"); }
    });
  }

  /* ---- indítás: amit a Niotron PageLoaded blokkja csinált ---- */
  function start() {
    if (PAGE === "login") { if (window.bpAuthInit) window.bpAuthInit(get("bpAuth")); return; }
    var m = /[#&]s=([^&]*)/.exec(location.hash || "");
    var startVal = m ? decodeURIComponent(m[1]) : get("bpLastStart");
    try { if (window.bpInit) window.bpInit(startVal, ""); } catch (e) {}
    requestAnimationFrame(function () { requestAnimationFrame(bootOff); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else setTimeout(start, 0);

  document.addEventListener("visibilitychange", function () { if (document.hidden) locStop(); });

  /* ---- offline működés: service worker ---- */
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
  }
})();
