/* KOSMOSSILATOR - gesture looper & step runner (global: Looper, Players, Live, StepRunner)
   Loops store touch GESTURES (not audio): { b0, len, d:{x,y}, m:[{db,x,y}...] }
   b0 = start beat (mod loop length), len = beats, m = moves relative to start. */
"use strict";

var Live = { touching: false, x: 0, y: 0 };

/* ---------------- per-part voice players ---------------- */
var Players = [];
for (var _pi = 0; _pi < 5; _pi++) {
  Players.push({ voice: null, owner: null, lastLane: -1, skipUntilAbs: -1e9 });
}

function partProg(i) { return progById(Looper.parts[i].prog); }

function pDown(i, t, x, y, owner) {
  var prog = partProg(i);
  var pl = Players[i];
  if (prog.type === "melodic" || prog.type === "chord" || prog.type === "water") {
    if (pl.voice) pl.voice.release(t);
    pl.voice = prog.type === "water"
      ? Synth.createWaterVoice(prog, i, t, x, y)
      : Synth.createVoice(prog, i, t, x, y);
    pl.owner = owner;
  } else if (prog.type === "drumhit") {
    var lane = laneFromX(x);
    pl.lastLane = lane;
    Synth.drumHit(DRUM_LANES[lane].id, i, t, y, prog.send);
  } else if (prog.type === "zap") {
    Synth.zapHit(prog, i, t, x, y);
  }
  /* arp / drumpat: driven purely by StepRunner via held-state sampling */
}

function pMove(i, t, x, y) {
  var prog = partProg(i);
  var pl = Players[i];
  if (prog.type === "melodic" || prog.type === "chord" || prog.type === "water") {
    if (pl.voice) pl.voice.setXY(t, x, y);
  } else if (prog.type === "drumhit") {
    var lane = laneFromX(x);
    if (lane !== pl.lastLane) {
      pl.lastLane = lane;
      Synth.drumHit(DRUM_LANES[lane].id, i, t, y, prog.send);
    }
  }
}

function pUp(i, t, owner) {
  var pl = Players[i];
  if (pl.voice && pl.owner === owner) {
    pl.voice.release(t);
    pl.voice = null;
    pl.owner = null;
  }
  pl.lastLane = -1;
}

function pKill(i) {
  var pl = Players[i];
  if (pl.voice) { pl.voice.kill(); pl.voice = null; pl.owner = null; }
  pl.lastLane = -1;
}

function laneFromX(x) {
  var n = Math.floor(x * DRUM_LANES.length);
  return Math.max(0, Math.min(DRUM_LANES.length - 1, n));
}

/* ---------------- Looper ---------------- */
var Looper = {
  parts: [
    { prog: "beatbox",  muted: false, vol: 1, events: [] },
    { prog: "acid",     muted: false, vol: 1, events: [] },
    { prog: "neonlead", muted: false, vol: 1, events: [] },
    { prog: "stab",     muted: false, vol: 1, events: [] },
    { prog: "octarp",   muted: false, vol: 1, events: [] }
  ],
  selected: 0,
  playing: true,
  recording: false,
  _rec: null,           // open recording gesture
  _recMoveAt: 0,

  loopBeats: function () { return Settings.loopBars * 4; },

  selProg: function () { return partProg(this.selected); },

  /* ----- live touch from the pad ----- */
  touch: function (type, x, y) {
    if (!Engine.ready) return;
    var i = this.selected;
    var t = Engine.now() + 0.005;
    if (type === "down") {
      Live.touching = true; Live.x = x; Live.y = y;
      pDown(i, t, x, y, "live");
      if (this.recording) this._recOpen(x, y);
    } else if (type === "move") {
      if (!Live.touching) return;
      Live.x = x; Live.y = y;
      pMove(i, t, x, y);
      if (this.recording) this._recMove(x, y);
    } else { // up
      if (!Live.touching) return;
      Live.touching = false;
      pUp(i, t, "live");
      if (this.recording) this._recClose();
    }
  },

  /* label shown on the pad while touching */
  liveLabel: function () {
    var prog = this.selProg();
    if (prog.type === "drumpat") {
      var z = Math.min(7, Math.floor(Live.x * 8));
      return DRUM_PATTERNS[z].name;
    }
    if (prog.type === "drumhit") return DRUM_LANES[laneFromX(Live.x)].label;
    if (prog.type === "water") return "FLOW";
    if (prog.type === "zap" && prog.fx !== "drip") return "ZAP!";
    var pl = Players[this.selected];
    if (pl.voice && pl.voice.label) return pl.voice.label;
    var deg = NoteMath.degreeFromX(Live.x, State.scale(), Settings.octaves);
    var m = NoteMath.degreeToMidi(deg, Settings.keyIdx, State.scale(), prog.baseOct || 3);
    return NoteMath.noteName(m);
  },

  /* ----- recording ----- */
  _recOpen: function (x, y) {
    this._rec = { absStart: Clock.nowBeat(), d: { x: x, y: y }, m: [] };
    this._recMoveAt = 0;
  },

  _recMove: function (x, y) {
    if (!this._rec) return;
    var now = performance.now();
    if (now - this._recMoveAt < 20) return;
    this._recMoveAt = now;
    var db = Clock.nowBeat() - this._rec.absStart;
    if (db <= 0) return;
    if (this._rec.m.length < 4000) this._rec.m.push({ db: db, x: x, y: y });
  },

  _recClose: function () {
    var r = this._rec;
    this._rec = null;
    if (!r) return;
    var L = this.loopBeats();
    var len = Clock.nowBeat() - r.absStart;
    if (len < 0.02) len = 0.05;                  // quick tap (drum hit etc.)
    var full = len >= L;
    if (len > L) len = L;
    var b0 = ((r.absStart % L) + L) % L;
    var prog = this.selProg();
    if (prog.type === "drumhit" || prog.type === "drumpat") {
      b0 = (Math.round(b0 / 0.25) * 0.25) % L;   // quantize drum starts to 16th
    }
    var g = { b0: b0, len: len, d: r.d, m: [] };
    for (var i = 0; i < r.m.length; i++) if (r.m[i].db <= len) g.m.push(r.m[i]);

    var part = this.parts[this.selected];
    if (full) {
      part.events = [g];
    } else {
      part.events = part.events.filter(function (og) {
        return !circOverlap(og.b0, og.len, b0, len, L);
      });
      part.events.push(g);
    }
    State.save();
    UI.refreshParts();
  },

  toggleRec: function () {
    if (this.recording) {
      this.recording = false;
      if (this._rec) this._recClose();
    } else {
      this.recording = true;
      if (!this.playing) this.setPlaying(true);
      if (Live.touching) this._recOpen(Live.x, Live.y);
    }
    UI.refreshTransport();
  },

  setPlaying: function (on) {
    if (on === this.playing) return;
    this.playing = on;
    if (on) {
      Clock.resetPhase();
    } else {
      if (this.recording) { if (this._rec) this._recClose(); this.recording = false; }
      for (var i = 0; i < 5; i++) pKill(i);
    }
    UI.refreshTransport();
  },

  selectPart: function (i) {
    if (Live.touching) this.touch("up", Live.x, Live.y);
    this.selected = i;
    State.save();
    UI.refreshParts();
    UI.refreshProgram();
    Pad.gridDirty = true;
  },

  toggleMute: function (i) {
    this.parts[i].muted = !this.parts[i].muted;
    if (this.parts[i].muted) pKill(i);
    State.save();
    UI.refreshParts();
  },

  clearPart: function (i) {
    this.parts[i].events = [];
    pKill(i);
    State.save();
    UI.refreshParts();
  },

  clearAll: function () {
    for (var i = 0; i < 5; i++) this.clearPart(i);
  },

  setPartVol: function (i, v) {
    this.parts[i].vol = v;
    if (Engine.ready) Engine.parts[i].vol.gain.setTargetAtTime(v, Engine.now(), 0.03);
    State.save();
  },

  applyVols: function () {
    if (!Engine.ready) return;
    for (var i = 0; i < 5; i++) {
      var v = this.parts[i].vol;
      Engine.parts[i].vol.gain.value = typeof v === "number" ? v : 1;
    }
  },

  setProgram: function (progId) {
    pKill(this.selected);
    this.parts[this.selected].prog = progId;
    State.save();
    UI.refreshProgram();
    UI.refreshParts();
    Pad.gridDirty = true;
  },

  /* ----- playback scheduling (Clock subscriber) ----- */
  schedule: function (b0, b1) {
    if (!Looper.playing) return;
    var L = Looper.loopBeats();
    for (var i = 0; i < 5; i++) {
      var part = Looper.parts[i];
      if (part.muted || part.events.length === 0) continue;
      var prog = partProg(i);
      // step-driven programs are sampled by StepRunner, no event replay needed
      if (prog.type === "arp" || prog.type === "drumpat") continue;
      var pl = Players[i];
      for (var gi = 0; gi < part.events.length; gi++) {
        var g = part.events[gi];
        var kMin = Math.floor((b0 - g.b0 - g.len) / L) - 1;
        var kMax = Math.floor((b1 - g.b0) / L) + 1;
        for (var k = kMin; k <= kMax; k++) {
          var dAbs = k * L + g.b0;
          // down
          if (inWin(dAbs, b0, b1)) {
            if (Live.touching && i === Looper.selected) {
              pl.skipUntilAbs = dAbs + g.len + 1e-6;
            } else {
              pDown(i, Clock.timeAt(dAbs), g.d.x, g.d.y, "replay");
            }
          }
          // moves
          for (var mi = 0; mi < g.m.length; mi++) {
            var mAbs = dAbs + g.m[mi].db;
            if (inWin(mAbs, b0, b1) && mAbs > pl.skipUntilAbs) {
              pMove(i, Clock.timeAt(mAbs), g.m[mi].x, g.m[mi].y);
            }
          }
          // up
          var uAbs = dAbs + g.len;
          if (inWin(uAbs, b0, b1) && uAbs > pl.skipUntilAbs) {
            pUp(i, Clock.timeAt(uAbs), "replay");
          }
        }
      }
    }
  },

  /* held x/y of part i at absolute beat b (for StepRunner), or null */
  heldAt: function (i, b) {
    if (Live.touching && i === this.selected) return { x: Live.x, y: Live.y };
    if (!this.playing) return null;
    var part = this.parts[i];
    if (part.muted) return null;
    var L = this.loopBeats();
    for (var gi = 0; gi < part.events.length; gi++) {
      var g = part.events[gi];
      var k = Math.floor((b - g.b0) / L);
      var off = b - (k * L + g.b0);
      if (off >= -1e-9 && off < g.len) {
        var x = g.d.x, y = g.d.y;
        for (var mi = 0; mi < g.m.length; mi++) {
          if (g.m[mi].db <= off) { x = g.m[mi].x; y = g.m[mi].y; } else break;
        }
        return { x: x, y: y };
      }
    }
    return null;
  },

  /* part has audible replay activity near beat b (for ghost dots) */
  ghostAt: function (i, b) {
    if (!this.playing) return null;
    var part = this.parts[i];
    if (part.muted || (Live.touching && i === this.selected)) return null;
    return this.heldAt2(i, b);
  },

  heldAt2: function (i, b) {
    var part = this.parts[i];
    var L = this.loopBeats();
    for (var gi = 0; gi < part.events.length; gi++) {
      var g = part.events[gi];
      var k = Math.floor((b - g.b0) / L);
      var off = b - (k * L + g.b0);
      if (off >= -1e-9 && off < g.len) {
        var x = g.d.x, y = g.d.y;
        for (var mi = 0; mi < g.m.length; mi++) {
          if (g.m[mi].db <= off) { x = g.m[mi].x; y = g.m[mi].y; } else break;
        }
        return { x: x, y: y };
      }
    }
    return null;
  }
};

function inWin(b, b0, b1) { return b >= b0 - 1e-9 && b < b1 - 1e-9; }

/* circular interval overlap on a loop of length L */
function circOverlap(a0, alen, b0, blen, L) {
  if (alen >= L || blen >= L) return true;
  for (var s = -1; s <= 1; s++) {
    var x0 = a0 + s * L;
    if (x0 < b0 + blen && b0 < x0 + alen) return true;
  }
  return false;
}

/* ---------------- StepRunner: gate arp / ARP notes / drum patterns / click ---------------- */
var StepRunner = {
  GATE_DIVS: { "16": 0.25, "8": 0.5, "16t": 1 / 6 },

  schedule: function (b0, b1) {
    // metronome
    if (Settings.click) {
      Clock.steps(b0, b1, 1, function (b, t, k) {
        Synth.click(t, ((k % 4) + 4) % 4 === 0);
      });
    }

    // gate arp (chops all parts)
    if (Settings.gate !== "off") {
      var div = StepRunner.GATE_DIVS[Settings.gate] || 0.25;
      var durS = div * (60 / Clock.bpm);
      Clock.steps(b0, b1, div, function (b, t) {
        for (var i = 0; i < 5; i++) {
          var g = Engine.parts[i].gate.gain;
          g.setValueAtTime(0, t);
          g.linearRampToValueAtTime(1, t + 0.004);
          g.setValueAtTime(1, t + durS * 0.55);
          g.linearRampToValueAtTime(0, t + durS * 0.55 + 0.015);
        }
      });
    }

    // step-driven programs
    for (var i = 0; i < 5; i++) {
      (function (idx) {
        var prog = partProg(idx);
        if (prog.type === "arp") {
          var scale = State.scale();
          var Lsteps = scale.steps.length;
          var pat = prog.arp.pattern;
          Clock.steps(b0, b1, prog.arp.div, function (b, t, k) {
            var h = Looper.heldAt(idx, b);
            if (!h) return;
            var pi = ((k % pat.length) + pat.length) % pat.length;
            var po = pat[pi];
            var off = po === "L" ? Lsteps : (po === "L2" ? Lsteps * 2 : po);
            var deg = NoteMath.degreeFromX(h.x, scale, Settings.octaves) + off;
            Synth.arpNote(prog, idx, t, deg, h.y);
          });
        } else if (prog.type === "drumpat") {
          Clock.steps(b0, b1, 0.25, function (b, t, k) {
            var h = Looper.heldAt(idx, b);
            if (!h) return;
            var step = ((k % 16) + 16) % 16;
            var zone = Math.min(7, Math.floor(h.x * 8));
            var pat = DRUM_PATTERNS[zone];
            StepRunner.firePattern(pat, step, h.y, idx, t, prog.send);
          });
        } else if (prog.type === "zap") {
          Clock.steps(b0, b1, 0.5, function (b, t) {
            var h = Looper.heldAt(idx, b);
            if (!h) return;
            Synth.zapHit(prog, idx, t, h.x, h.y);
          });
        }
      })(i);
    }
  },

  firePattern: function (pat, step, y, partIdx, t, send) {
    var map = { K: "kick", S: "snare", C: "chh", O: "ohh", P: "clap" };
    for (var lane in map) {
      var ch = pat[lane].charAt(step);
      if (ch === ".") continue;
      if (ch === "2" && y < 0.4) continue;
      if (ch === "3" && y < 0.7) continue;
      Synth.drumHit(map[lane], partIdx, t, 0.4 + y * 0.2, send);
    }
  }
};
