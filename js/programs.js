/* KOSMOSSILATOR - sound program definitions (data-driven; interpreted by engine.js)
   global: PROGRAMS, PROG_CATS, DRUM_LANES, DRUM_PATTERNS, progById, progColor */
"use strict";

var PROG_CATS = {
  LEAD:  { color: "#19e6ff" },
  BASS:  { color: "#ff8a2a" },
  ACID:  { color: "#9dff2e" },
  CHORD: { color: "#b06bff" },
  ARP:   { color: "#ffd60a" },
  CHIP:  { color: "#8fa8ff" },
  SE:    { color: "#ff4fd8" },
  DRUM:  { color: "#ff3b3b" }
};

/*
 program fields:
   type     : "melodic" | "chord" | "arp" | "drumpat" | "drumhit"
   osc      : "saw" | "square" | "tri" | "sine" | "supersaw" | "pulse"
   detune   : cents spread for 2nd/3rd osc (supersaw)
   sub      : sub-osc (square, -1 oct) level 0..1
   noise    : white noise level 0..1
   baseOct  : lowest octave of the X range
   cutoff   : { base: Hz at y=0, oct: octaves swept by y }
   q        : filter resonance
   env      : { a, d, s, r } seconds / sustain level
   glide    : portamento time-constant (s)
   vib      : { rate: Hz, depth: cents at y=1 }  (vibrato grows with y)
   wob      : { minHz, maxHz, depth: cents }      (filter LFO, rate by y)
   retrig   : re-fire envelope when quantized note changes (stabs)
   chord    : scale-degree offsets stacked on the played degree
   arp      : { div: beats per step, pattern: [...], octWrap: use scale length }
   zap      : pitch-envelope FX repeat (laser)
   quantize : false -> continuous pitch (theremin etc.)
   send     : delay send 0..1
   gain     : voice level trim
*/
var PROGRAMS = [
  /* ---- DRUM ---- */
  { id: "beatbox", name: "Beat Box", cat: "DRUM", type: "drumpat",
    send: 0.06, gain: 1.0 },
  { id: "hitkit", name: "Hit Kit", cat: "DRUM", type: "drumhit",
    send: 0.08, gain: 1.0 },

  /* ---- BASS ---- */
  { id: "fatbass", name: "Fat Bass", cat: "BASS", type: "melodic",
    osc: "square", sub: 0.7, baseOct: 1,
    cutoff: { base: 90, oct: 4.5 }, q: 4,
    env: { a: 0.004, d: 0.12, s: 0.85, r: 0.1 }, glide: 0.02,
    send: 0.0, gain: 0.9 },
  { id: "wobble", name: "Wobble Bass", cat: "BASS", type: "melodic",
    osc: "saw", sub: 0.55, baseOct: 1,
    cutoff: { base: 220, oct: 1.2 }, q: 7,
    wob: { minHz: 0.8, maxHz: 14, depth: 2800 },
    env: { a: 0.005, d: 0.1, s: 0.9, r: 0.12 }, glide: 0.03,
    send: 0.05, gain: 0.8 },

  /* ---- ACID ---- */
  { id: "acid", name: "Acid Bass", cat: "ACID", type: "melodic",
    osc: "saw", baseOct: 2,
    cutoff: { base: 140, oct: 5 }, q: 13,
    env: { a: 0.003, d: 0.14, s: 0.5, r: 0.07 }, glide: 0.035,
    send: 0.12, gain: 0.62 },
  { id: "acidsq", name: "Acid Square", cat: "ACID", type: "melodic",
    osc: "square", baseOct: 2,
    cutoff: { base: 180, oct: 4.2 }, q: 10,
    env: { a: 0.003, d: 0.2, s: 0.6, r: 0.08 }, glide: 0.05,
    send: 0.18, gain: 0.6 },

  /* ---- LEAD ---- */
  { id: "neonlead", name: "Neon Lead", cat: "LEAD", type: "melodic",
    osc: "supersaw", detune: 12, baseOct: 3,
    cutoff: { base: 500, oct: 3.6 }, q: 2,
    vib: { rate: 5.5, depth: 35 },
    env: { a: 0.006, d: 0.08, s: 0.85, r: 0.16 }, glide: 0.025,
    send: 0.28, gain: 0.55 },
  { id: "puresine", name: "Pure Sine", cat: "LEAD", type: "melodic",
    osc: "sine", baseOct: 4,
    cutoff: { base: 4000, oct: 1 }, q: 0.5,
    vib: { rate: 6, depth: 70 },
    env: { a: 0.01, d: 0.05, s: 0.9, r: 0.2 }, glide: 0.04,
    send: 0.35, gain: 0.8 },
  { id: "scream", name: "Square Scream", cat: "LEAD", type: "melodic",
    osc: "square", detune: 9, baseOct: 3, noise: 0.04,
    cutoff: { base: 320, oct: 4 }, q: 9,
    vib: { rate: 7, depth: 25 },
    env: { a: 0.004, d: 0.1, s: 0.8, r: 0.1 }, glide: 0.02,
    send: 0.22, gain: 0.5 },

  /* ---- CHORD ---- */
  { id: "dreampad", name: "Dream Pad", cat: "CHORD", type: "chord",
    osc: "saw", detune: 8, baseOct: 3, chord: [0, 2, 4],
    cutoff: { base: 240, oct: 3.2 }, q: 1.2,
    env: { a: 0.3, d: 0.4, s: 0.85, r: 0.7 }, glide: 0.06,
    send: 0.4, gain: 0.42 },
  { id: "stab", name: "House Stab", cat: "CHORD", type: "chord",
    osc: "saw", detune: 10, baseOct: 3, chord: [0, 2, 4, 6], retrig: true,
    cutoff: { base: 420, oct: 3.4 }, q: 3,
    env: { a: 0.003, d: 0.22, s: 0.0, r: 0.2 }, glide: 0.0,
    send: 0.3, gain: 0.5 },

  /* ---- ARP ---- */
  { id: "octarp", name: "Octave Arp", cat: "ARP", type: "arp",
    osc: "square", baseOct: 2,
    cutoff: { base: 400, oct: 3.8 }, q: 5,
    arp: { div: 0.25, pattern: [0, "L", 0, "L2"] },
    env: { a: 0.002, d: 0.09, s: 0.0, r: 0.06 },
    send: 0.25, gain: 0.55 },
  { id: "triarp", name: "Triad Arp", cat: "ARP", type: "arp",
    osc: "saw", baseOct: 3,
    cutoff: { base: 500, oct: 3.4 }, q: 3,
    arp: { div: 0.25, pattern: [0, 2, 4, "L", 4, 2] },
    env: { a: 0.002, d: 0.1, s: 0.0, r: 0.08 },
    send: 0.3, gain: 0.5 },

  /* ---- CHIP (Famicom/NES) ---- */
  { id: "fc125", name: "FC Pulse 12.5%", cat: "CHIP", type: "melodic",
    osc: "pulse125", baseOct: 3,
    cutoff: { base: 6000, oct: 0.6 }, q: 0.5,
    vib: { rate: 6, depth: 55 },
    env: { a: 0.003, d: 0.05, s: 0.9, r: 0.06 }, glide: 0.01,
    send: 0.22, gain: 0.38 },
  { id: "fc25", name: "FC Pulse 25%", cat: "CHIP", type: "melodic",
    osc: "pulse25", baseOct: 3,
    cutoff: { base: 6000, oct: 0.6 }, q: 0.5,
    vib: { rate: 6, depth: 55 },
    env: { a: 0.003, d: 0.05, s: 0.9, r: 0.06 }, glide: 0.01,
    send: 0.22, gain: 0.38 },
  { id: "fc50", name: "FC Pulse 50%", cat: "CHIP", type: "melodic",
    osc: "pulse50", baseOct: 3,
    cutoff: { base: 6000, oct: 0.6 }, q: 0.5,
    vib: { rate: 6, depth: 55 },
    env: { a: 0.003, d: 0.05, s: 0.9, r: 0.06 }, glide: 0.01,
    send: 0.22, gain: 0.36 },
  { id: "fctriL", name: "FC Triangle LOW", cat: "CHIP", type: "melodic",
    osc: "fctri", baseOct: 1,
    cutoff: { base: 4000, oct: 0.4 }, q: 0.3,
    vib: { rate: 5.5, depth: 28 },
    env: { a: 0.004, d: 0.05, s: 1.0, r: 0.06 }, glide: 0.012,
    send: 0.08, gain: 0.92 },
  { id: "fctriM", name: "FC Triangle MID", cat: "CHIP", type: "melodic",
    osc: "fctri", baseOct: 2,
    cutoff: { base: 4000, oct: 0.4 }, q: 0.3,
    vib: { rate: 5.5, depth: 35 },
    env: { a: 0.004, d: 0.05, s: 1.0, r: 0.05 }, glide: 0.012,
    send: 0.1, gain: 0.8 },
  { id: "fctriH", name: "FC Triangle HIGH", cat: "CHIP", type: "melodic",
    osc: "fctri", baseOct: 3,
    cutoff: { base: 4000, oct: 0.4 }, q: 0.3,
    vib: { rate: 5.5, depth: 42 },
    env: { a: 0.004, d: 0.05, s: 1.0, r: 0.045 }, glide: 0.012,
    send: 0.12, gain: 0.7 },

  /* ---- SE ---- */
  { id: "drip", name: "Water Drip", cat: "SE", type: "zap", fx: "drip",
    baseOct: 4,
    send: 0.45, gain: 0.55 },
  { id: "stream", name: "Water Stream", cat: "SE", type: "water",
    baseOct: 3,
    send: 0.25, gain: 0.5 },
  { id: "theremin", name: "Theremin", cat: "SE", type: "melodic",
    osc: "sine", baseOct: 3, quantize: false,
    cutoff: { base: 5000, oct: 0.5 }, q: 0.5,
    vib: { rate: 5, depth: 90 },
    env: { a: 0.06, d: 0.1, s: 0.95, r: 0.3 }, glide: 0.06,
    send: 0.4, gain: 0.75 },
  { id: "laser", name: "Laser Zap", cat: "SE", type: "zap",
    baseOct: 3, quantize: false,
    send: 0.35, gain: 0.6 }
];

function progById(id) {
  for (var i = 0; i < PROGRAMS.length; i++) if (PROGRAMS[i].id === id) return PROGRAMS[i];
  return PROGRAMS[0];
}
function progColor(p) { return (PROG_CATS[p.cat] || PROG_CATS.LEAD).color; }

/* ---- drums ---- */
/* lanes for Hit Kit (X axis, left->right) */
var DRUM_LANES = [
  { id: "kick",  label: "KCK" },
  { id: "snare", label: "SNR" },
  { id: "chh",   label: "HAT" },
  { id: "ohh",   label: "OPN" },
  { id: "clap",  label: "CLP" },
  { id: "tomlo", label: "TM-" },
  { id: "tomhi", label: "TM+" },
  { id: "ride",  label: "RID" }
];

/* Beat Box patterns: 16 steps per bar, chars: "." off / "1" always / "2" y>0.4 / "3" y>0.7
   lanes: K kick, S snare, C closed hat, O open hat, P clap */
var DRUM_PATTERNS = [
  { name: "HOUSE",
    K: "1...1...1...1...", S: "................", C: ".2.2.2.2.2.2.2.2",
    O: "..3...3...3...3.", P: "....1.......1..." },
  { name: "TECHNO",
    K: "1...1...1...1...", S: "....2.......2...", C: "2.2.2.2.2.2.2.23",
    O: "..2...2...2...2.", P: "............3..." },
  { name: "ELECTRO",
    K: "1.....1...1.....", S: "....1.......1...", C: "2.22.2.22.2.2.22",
    O: "......3.........", P: "....2.......2..3" },
  { name: "HIPHOP",
    K: "1.....1..1......", S: "....1.......1...", C: "2.2.2.2.2.2.2.2.",
    O: ".......3........", P: "............2..." },
  { name: "BREAKS",
    K: "1.......1.1.....", S: "....1..2.....1..", C: "2.2.2.222.2.2.22",
    O: "..............3.", P: "....3..........." },
  { name: "DNB",
    K: "1.........1.....", S: "....1.......1...", C: "2.222.222.222.22",
    O: "..3.......3.....", P: ".......3........" },
  { name: "LATIN",
    K: "1...1...1...1...", S: "...2..2....2..2.", C: "2.2.2.2.2.2.2.2.",
    O: "..3...3...3...3.", P: ".2..2..2.2..2..2" },
  { name: "RAVE",
    K: "1.1.1.1.1.1.1.1.", S: "....1...2...1..2", C: "2222222222222222",
    O: "..3...3...3...33", P: "....3...3...3.33" }
];
