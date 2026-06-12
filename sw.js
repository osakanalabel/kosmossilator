/* KOSMOSSILATOR service worker — cache-first offline PWA.
   IMPORTANT: bump VERSION whenever any asset changes, and keep ASSETS in sync. */
"use strict";

var VERSION = "kosmo-v2";
var ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.webmanifest",
  "./js/scales.js",
  "./js/programs.js",
  "./js/state.js",
  "./js/presets.js",
  "./js/engine.js",
  "./js/looper.js",
  "./js/pad.js",
  "./js/ui.js",
  "./js/main.js",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./favicon.svg"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(VERSION).then(function (cache) {
      return cache.addAll(ASSETS);
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== VERSION) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (res) {
        return res;
      }).catch(function () {
        // offline navigation fallback
        if (e.request.mode === "navigate") return caches.match("./index.html");
        return Response.error();
      });
    })
  );
});
