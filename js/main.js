/* KOSMOSSILATOR - bootstrap: state restore, audio unlock, PWA glue */
"use strict";

(function () {

  State.load();
  UI.init();
  Pad.init();

  Clock.subscribers.push(function (b0, b1) { Looper.schedule(b0, b1); });
  Clock.subscribers.push(function (b0, b1) { StepRunner.schedule(b0, b1); });

  /* ---- boot overlay: AudioContext must be created/resumed in a user gesture ---- */
  var boot = document.getElementById("boot");
  var booted = false;

  function powerOn() {
    if (booted) return;
    booted = true;
    Engine.unlock();
    Looper.applyVols();
    Clock.bpm = Settings.bpm;
    Clock.start();
    Engine.updateDelayTime();
    boot.classList.add("hide");
    requestWakeLock();
    UI.refreshChips();
    UI.refreshTransport();
  }
  boot.addEventListener("pointerdown", powerOn);

  /* ---- keep audio alive on iOS ---- */
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
      Engine.resume();
      requestWakeLock();
    }
  });
  document.addEventListener("pointerdown", function () { Engine.resume(); }, true);

  /* ---- screen wake lock (supported on iOS 16.4+/Android) ---- */
  var wakeLock = null;
  function requestWakeLock() {
    if (!("wakeLock" in navigator)) return;
    navigator.wakeLock.request("screen").then(function (wl) {
      wakeLock = wl;
    }).catch(function () { /* low battery etc. — not critical */ });
  }

  /* ---- block browser gestures that fight the instrument ---- */
  document.addEventListener("gesturestart", function (e) { e.preventDefault(); });
  document.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  document.addEventListener("dblclick", function (e) { e.preventDefault(); });

  /* ---- service worker (offline PWA); requires https or localhost ---- */
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("./sw.js").catch(function () {});
    });
  }

})();
