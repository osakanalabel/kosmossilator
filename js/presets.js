/* KOSMOSSILATOR - preset loops (global: PRESETS, loadPreset)
   Part spec: { p: progId, d: 1 -> note values are scale-degree indices (octaves=2),
   else raw x }. Note: [b0, len, deg|x, y, ...moves[db, deg|x, y]]. Loop = 2 bars. */
"use strict";

var PRESETS = [
  { name: "DEEP HOUSE", bpm: 122, key: 9, sc: "minpent", parts: [
    { p: "beatbox", n: [[0, 8, 0.06, 0.55]] },
    { p: "fatbass", d: 1, n: [[0, 0.45, 0, 0.5], [1.75, 0.25, 0, 0.5], [3, 0.45, 3, 0.5], [4, 0.45, 0, 0.5], [5.75, 0.25, 0, 0.5], [7, 0.6, 4, 0.55]] },
    { p: "stab", d: 1, n: [[0.5, 0.25, 2, 0.6], [2.5, 0.25, 2, 0.6], [4.5, 0.25, 3, 0.65], [6.5, 0.25, 2, 0.55]] },
    { p: "dreampad", d: 1, n: [[0, 8, 5, 0.55]] } ] },

  { name: "ACID TECHNO", bpm: 138, key: 9, sc: "minpent", parts: [
    { p: "beatbox", n: [[0, 8, 0.19, 0.7]] },
    { p: "acid", d: 1, n: [[0, 0.4, 0, 0.35], [1, 0.4, 0, 0.55], [2, 0.4, 5, 0.75, [0.3, 5, 0.4]], [3, 0.4, 3, 0.6], [4, 0.4, 0, 0.4], [5, 0.4, 7, 0.85], [6, 0.4, 5, 0.65], [7, 0.4, 3, 0.9]] },
    { p: "octarp", d: 1, n: [[0, 8, 0, 0.65]] },
    { p: "scream", d: 1, n: [[6, 2, 8, 0.75]] } ] },

  { name: "ELECTRO FUNK", bpm: 116, key: 2, sc: "minpent", parts: [
    { p: "beatbox", n: [[0, 8, 0.31, 0.6]] },
    { p: "wobble", d: 1, n: [[0, 1.5, 0, 0.45], [2, 1.5, 3, 0.6], [4, 1.5, 0, 0.5], [6, 1.5, 4, 0.7]] },
    { p: "stab", d: 1, n: [[1, 0.2, 4, 0.6], [3, 0.2, 4, 0.6], [5, 0.2, 5, 0.65], [7, 0.2, 4, 0.6]] } ] },

  { name: "BOOM BAP", bpm: 92, key: 7, sc: "minpent", parts: [
    { p: "beatbox", n: [[0, 8, 0.44, 0.5]] },
    { p: "fatbass", d: 1, n: [[0, 0.7, 0, 0.45], [2.5, 0.4, 0, 0.45], [4, 0.7, 3, 0.5], [6.5, 0.5, 2, 0.5]] },
    { p: "puresine", d: 1, n: [[1, 0.8, 7, 0.5], [5, 0.8, 8, 0.55], [6, 0.8, 7, 0.5]] } ] },

  { name: "JUNGLE RUN", bpm: 172, key: 4, sc: "minpent", parts: [
    { p: "beatbox", n: [[0, 8, 0.69, 0.75]] },
    { p: "fatbass", d: 1, n: [[0, 1.6, 0, 0.6], [4, 1.6, 2, 0.6]] },
    { p: "triarp", d: 1, n: [[0, 8, 3, 0.6]] },
    { p: "laser", n: [[3.5, 0.12, 0.7, 0.6]] } ] },

  { name: "LATIN GROOVE", bpm: 124, key: 0, sc: "majpent", parts: [
    { p: "beatbox", n: [[0, 8, 0.81, 0.65]] },
    { p: "fatbass", d: 1, n: [[0, 0.4, 0, 0.5], [1.5, 0.4, 2, 0.5], [3, 0.4, 4, 0.5], [4, 0.4, 0, 0.5], [5.5, 0.4, 2, 0.5], [7, 0.4, 1, 0.5]] },
    { p: "stab", d: 1, n: [[0.75, 0.2, 3, 0.6], [2.75, 0.2, 3, 0.6], [4.75, 0.2, 4, 0.6], [6.75, 0.2, 3, 0.6]] },
    { p: "puresine", d: 1, n: [[2, 0.6, 8, 0.5], [6, 0.6, 9, 0.55]] } ] },

  { name: "RAVE STORM", bpm: 145, key: 9, sc: "minpent", parts: [
    { p: "beatbox", n: [[0, 8, 0.94, 0.8]] },
    { p: "octarp", d: 1, n: [[0, 8, 5, 0.8]] },
    { p: "scream", d: 1, n: [[0, 4, 5, 0.7, [2, 8, 0.85]], [4, 4, 8, 0.85, [2, 5, 0.6]]] },
    { p: "stab", d: 1, n: [[0.5, 0.2, 5, 0.7], [2.5, 0.2, 5, 0.7], [4.5, 0.2, 7, 0.75], [6.5, 0.2, 5, 0.7]] } ] },

  { name: "DUB WOBBLE", bpm: 140, key: 6, sc: "minpent", parts: [
    { p: "beatbox", n: [[0, 8, 0.44, 0.6]] },
    { p: "wobble", d: 1, n: [[0, 3.5, 0, 0.35, [1, 0, 0.7], [2, 0, 0.5]], [4, 3.5, 3, 0.6, [1.5, 3, 0.85]]] },
    { p: "laser", n: [[7.5, 0.15, 0.8, 0.5]] } ] },

  { name: "OKINAWA SUNSET", bpm: 105, key: 0, sc: "okinawa", parts: [
    { p: "beatbox", n: [[0, 8, 0.81, 0.45]] },
    { p: "fatbass", d: 1, n: [[0, 1.2, 0, 0.45], [4, 1.2, 4, 0.45]] },
    { p: "puresine", d: 1, n: [[0, 0.8, 5, 0.5], [1, 0.8, 7, 0.5], [2, 1.2, 8, 0.55], [4, 0.8, 7, 0.5], [5, 0.8, 5, 0.5], [6, 1.4, 6, 0.5]] },
    { p: "dreampad", d: 1, n: [[0, 8, 2, 0.5]] } ] },

  { name: "HIRAJOSHI NIGHT", bpm: 134, key: 2, sc: "hirajoshi", parts: [
    { p: "beatbox", n: [[0, 8, 0.19, 0.6]] },
    { p: "acid", d: 1, n: [[0, 0.4, 0, 0.5], [2, 0.4, 2, 0.65], [4, 0.4, 5, 0.75], [6, 0.4, 3, 0.6]] },
    { p: "octarp", d: 1, n: [[0, 8, 0, 0.55]] } ] },

  { name: "MIYAKO TRAP", bpm: 138, key: 9, sc: "insen", parts: [
    { p: "beatbox", n: [[0, 8, 0.44, 0.65]] },
    { p: "fatbass", d: 1, n: [[0, 0.9, 0, 0.5], [3, 0.4, 0, 0.5], [4, 0.9, 2, 0.5], [7, 0.4, 0, 0.5]] },
    { p: "puresine", d: 1, n: [[2, 0.7, 7, 0.55], [6, 0.7, 8, 0.6]] },
    { p: "laser", n: [[5.75, 0.15, 0.6, 0.7]] } ] },

  { name: "BLUES JAM", bpm: 100, key: 4, sc: "blues", parts: [
    { p: "beatbox", n: [[0, 8, 0.56, 0.5]] },
    { p: "fatbass", d: 1, n: [[0, 0.6, 0, 0.5], [2, 0.6, 2, 0.5], [4, 0.6, 4, 0.5], [6, 0.6, 3, 0.5]] },
    { p: "scream", d: 1, n: [[1, 1.4, 6, 0.6, [0.7, 7, 0.7]], [5, 1.6, 8, 0.65, [0.8, 7, 0.55]]] } ] },

  { name: "DREAM AMBIENT", bpm: 80, key: 0, sc: "major", parts: [
    { p: "dreampad", d: 1, n: [[0, 8, 0, 0.5, [4, 2, 0.6]]] },
    { p: "puresine", d: 1, n: [[2, 1.5, 9, 0.45], [6, 1.5, 11, 0.5]] },
    { p: "triarp", d: 1, n: [[0, 8, 4, 0.4]] } ] },

  { name: "WHOLE TONE LAB", bpm: 120, key: 0, sc: "whole", parts: [
    { p: "beatbox", n: [[0, 8, 0.31, 0.55]] },
    { p: "octarp", d: 1, n: [[0, 8, 3, 0.6]] },
    { p: "theremin", n: [[0, 8, 0.3, 0.5, [2, 0.5, 0.6], [4, 0.4, 0.55], [6, 0.6, 0.65]]] } ] },

  { name: "FIFTH DRONE", bpm: 90, key: 9, sc: "fifths", parts: [
    { p: "beatbox", n: [[0, 8, 0.06, 0.35]] },
    { p: "wobble", d: 1, n: [[0, 3.8, 0, 0.4], [4, 3.8, 1, 0.5]] },
    { p: "dreampad", d: 1, n: [[0, 8, 0, 0.5]] } ] },

  { name: "STAB GARAGE", bpm: 130, key: 5, sc: "minor", parts: [
    { p: "beatbox", n: [[0, 8, 0.06, 0.65]] },
    { p: "fatbass", d: 1, n: [[0, 0.5, 0, 0.5], [2, 0.5, 0, 0.5], [4, 0.5, 5, 0.55], [6, 0.5, 3, 0.5]] },
    { p: "stab", d: 1, n: [[0, 0.25, 0, 0.6], [1.5, 0.25, 2, 0.6], [2.5, 0.25, 4, 0.65], [4, 0.25, 0, 0.6], [5.5, 0.25, 3, 0.6], [6.5, 0.25, 2, 0.65]] } ] },

  { name: "SINE LULLABY", bpm: 70, key: 5, sc: "majpent", parts: [
    { p: "beatbox", n: [[0, 8, 0.44, 0.3]] },
    { p: "puresine", d: 1, n: [[0, 1.2, 5, 0.4], [2, 1.2, 6, 0.45], [4, 1.2, 7, 0.45], [6, 1.5, 5, 0.4]] },
    { p: "dreampad", d: 1, n: [[0, 8, 0, 0.45]] } ] },

  { name: "BREAKS ARCADE", bpm: 128, key: 0, sc: "minpent", parts: [
    { p: "beatbox", n: [[0, 8, 0.56, 0.7]] },
    { p: "acidsq", d: 1, n: [[0, 0.4, 0, 0.6], [1, 0.4, 3, 0.6], [2, 0.4, 5, 0.7], [3, 0.4, 3, 0.55], [4, 0.4, 0, 0.6], [5, 0.4, 4, 0.7], [6, 0.4, 5, 0.75], [7, 0.4, 7, 0.8]] },
    { p: "laser", n: [[3.75, 0.15, 0.5, 0.5], [7.75, 0.15, 0.75, 0.6]] } ] },

  { name: "THEREMIN SPACE", bpm: 100, key: 9, sc: "minor", parts: [
    { p: "beatbox", n: [[0, 8, 0.06, 0.3]] },
    { p: "dreampad", d: 1, n: [[0, 8, 0, 0.5]] },
    { p: "theremin", n: [[0, 7.5, 0.2, 0.5, [2, 0.45, 0.6], [4, 0.7, 0.55], [6, 0.5, 0.5]]] } ] },

  { name: "LASER TECHNO", bpm: 150, key: 9, sc: "phrygian", parts: [
    { p: "beatbox", n: [[0, 8, 0.19, 0.75]] },
    { p: "acid", d: 1, n: [[0, 0.3, 0, 0.5], [0.75, 0.3, 1, 0.6], [2, 0.3, 0, 0.7], [2.75, 0.3, 7, 0.8], [4, 0.3, 0, 0.5], [4.75, 0.3, 1, 0.65], [6, 0.3, 7, 0.85], [6.75, 0.3, 8, 0.9]] },
    { p: "laser", n: [[1.5, 0.2, 0.6, 0.5], [5.5, 0.2, 0.8, 0.7]] },
    { p: "octarp", d: 1, n: [[0, 8, 7, 0.7]] } ] }
];

function loadPreset(i) {
  var pr = PRESETS[i];
  if (!pr) return;
  Settings.bpm = pr.bpm;
  Settings.keyIdx = pr.key;
  Settings.scaleId = pr.sc;
  Settings.octaves = 2;
  Settings.loopBars = 2;
  var N = scaleById(pr.sc).steps.length * 2 + 1;
  for (var k = 0; k < 5; k++) {
    pKill(k);
    Looper.parts[k].events = [];
    Looper.parts[k].muted = false;
    Looper.parts[k].vol = 1;
  }
  Looper.applyVols();
  pr.parts.forEach(function (ps, idx) {
    if (idx > 4) return;
    var cx = ps.d ? function (v) { return (v + 0.5) / N; } : function (v) { return v; };
    Looper.parts[idx].prog = ps.p;
    Looper.parts[idx].events = ps.n.map(function (a) {
      var g = { b0: a[0], len: a[1], d: { x: cx(a[2]), y: a[3] }, m: [] };
      for (var j = 4; j < a.length; j++) {
        g.m.push({ db: a[j][0], x: cx(a[j][1]), y: a[j][2] });
      }
      return g;
    });
  });
  Clock.setBpm(pr.bpm);
  Clock.resetPhase();
  Looper.selected = 0;
  Looper.playing = true;
  State.save();
  UI.refreshParts(); UI.refreshProgram(); UI.refreshChips();
  UI.refreshSettings(); UI.refreshTransport();
  Pad.gridDirty = true;
}
