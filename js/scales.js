/* KOSMOSSILATOR - scales & note math (global: KEYS, SCALES, NoteMath) */
"use strict";

var KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

var SCALES = [
  { id: "minpent",   name: "Minor Pentatonic", short: "min.P",  steps: [0, 3, 5, 7, 10] },
  { id: "majpent",   name: "Major Pentatonic", short: "maj.P",  steps: [0, 2, 4, 7, 9] },
  { id: "blues",     name: "Blues",            short: "Blues",  steps: [0, 3, 5, 6, 7, 10] },
  { id: "major",     name: "Major (Ionian)",   short: "Maj",    steps: [0, 2, 4, 5, 7, 9, 11] },
  { id: "minor",     name: "Minor (Aeolian)",  short: "min",    steps: [0, 2, 3, 5, 7, 8, 10] },
  { id: "dorian",    name: "Dorian",           short: "Dor",    steps: [0, 2, 3, 5, 7, 9, 10] },
  { id: "mixo",      name: "Mixolydian",       short: "Mix",    steps: [0, 2, 4, 5, 7, 9, 10] },
  { id: "lydian",    name: "Lydian",           short: "Lyd",    steps: [0, 2, 4, 6, 7, 9, 11] },
  { id: "phrygian",  name: "Phrygian",         short: "Phr",    steps: [0, 1, 3, 5, 7, 8, 10] },
  { id: "harmmin",   name: "Harmonic Minor",   short: "Hm.m",   steps: [0, 2, 3, 5, 7, 8, 11] },
  { id: "okinawa",   name: "Okinawa (Ryukyu)", short: "Oki",    steps: [0, 4, 5, 7, 11] },
  { id: "hirajoshi", name: "Hirajoshi",        short: "Hira",   steps: [0, 2, 3, 7, 8] },
  { id: "insen",     name: "In-Sen (Miyako)",  short: "InSn",   steps: [0, 1, 5, 7, 10] },
  { id: "whole",     name: "Whole Tone",       short: "Whl",    steps: [0, 2, 4, 6, 8, 10] },
  { id: "fifths",    name: "Fifths",           short: "5th",    steps: [0, 7] },
  { id: "chromatic", name: "Chromatic",        short: "Chr",    steps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }
];

function scaleById(id) {
  for (var i = 0; i < SCALES.length; i++) if (SCALES[i].id === id) return SCALES[i];
  return SCALES[0];
}

var NoteMath = {
  midiToFreq: function (m) { return 440 * Math.pow(2, (m - 69) / 12); },

  noteName: function (m) {
    var n = Math.round(m);
    return KEYS[((n % 12) + 12) % 12] + (Math.floor(n / 12) - 1);
  },

  /* scale degree index -> midi note. degIdx may exceed one octave (wraps up). */
  degreeToMidi: function (degIdx, keyIdx, scale, baseOct) {
    var L = scale.steps.length;
    var oct = Math.floor(degIdx / L);
    var st = scale.steps[((degIdx % L) + L) % L];
    return 12 * (baseOct + 1) + keyIdx + 12 * oct + st;
  },

  /* x in [0,1] -> degree index, given octave range setting */
  degreeFromX: function (x, scale, octaves) {
    var count = scale.steps.length * octaves + 1; // +1: top root
    var idx = Math.floor(x * count);
    if (idx >= count) idx = count - 1;
    if (idx < 0) idx = 0;
    return idx;
  },

  noteCount: function (scale, octaves) {
    return scale.steps.length * octaves + 1;
  },

  /* continuous (unquantized) midi from x */
  midiFromXFree: function (x, keyIdx, baseOct, octaves) {
    return 12 * (baseOct + 1) + keyIdx + x * 12 * octaves;
  }
};
