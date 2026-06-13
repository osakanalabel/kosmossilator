/* KOSMOSSILATOR - global settings & localStorage persistence (global: Settings, State) */
"use strict";

var Settings = {
  keyIdx: 9,            // A
  scaleId: "minpent",
  bpm: 120,
  octaves: 2,           // X-axis note range (octaves)
  loopBars: 2,          // 1 | 2 | 4
  gate: "off",          // "off" | "16" | "8" | "16t"
  click: false,
  volume: 0.9
};

var State = {
  KEY: "kosmo-state-v1",
  _t: null,

  scale: function () { return scaleById(Settings.scaleId); },

  save: function () {
    // debounce: settings churn during slider drags
    clearTimeout(State._t);
    State._t = setTimeout(State.saveNow, 400);
  },

  saveNow: function () {
    try {
      var data = {
        v: 1,
        settings: Settings,
        selected: Looper.selected,
        parts: Looper.parts.map(function (p) {
          return { prog: p.prog, muted: p.muted, vol: p.vol, events: p.events };
        })
      };
      localStorage.setItem(State.KEY, JSON.stringify(data));
    } catch (e) { /* private mode etc. */ }
  },

  load: function () {
    try {
      var raw = localStorage.getItem(State.KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      if (!data || data.v !== 1) return;
      var s = data.settings || {};
      for (var k in Settings) {
        if (Object.prototype.hasOwnProperty.call(s, k)) Settings[k] = s[k];
      }
      if (Array.isArray(data.parts)) {
        for (var i = 0; i < Looper.parts.length && i < data.parts.length; i++) {
          var sp = data.parts[i];
          if (!sp) continue;
          if (sp.prog && progById(sp.prog).id === sp.prog) Looper.parts[i].prog = sp.prog;
          Looper.parts[i].muted = !!sp.muted;
          Looper.parts[i].vol = typeof sp.vol === "number" ? sp.vol : 1;
          Looper.parts[i].events = Array.isArray(sp.events) ? sp.events : [];
        }
      }
      if (typeof data.selected === "number") {
        Looper.selected = Math.max(0, Math.min(4, data.selected));
      }
    } catch (e) { /* ignore corrupt state */ }
  }
};

window.addEventListener("visibilitychange", function () {
  if (document.visibilityState === "hidden") State.saveNow();
});
