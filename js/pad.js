/* KOSMOSSILATOR - XY pad: pointer input + canvas visuals (global: Pad) */
"use strict";

var Pad = {
  wrap: null, gridC: null, fxC: null,
  gctx: null, fctx: null,
  w: 0, h: 0, dpr: 1,
  gridDirty: true,
  pointerId: null,
  px: 0, py: 0,            // current touch (normalized, y up)
  noteEl: null,
  _lastBeatInt: -1,
  _beatTimer: null,

  init: function () {
    this.wrap = document.getElementById("pad-wrap");
    this.gridC = document.getElementById("pad-grid");
    this.fxC = document.getElementById("pad-fx");
    this.gctx = this.gridC.getContext("2d");
    this.fctx = this.fxC.getContext("2d");
    this.noteEl = document.getElementById("note-display");

    var self = this;
    window.addEventListener("resize", function () { self.resize(); });
    if (window.ResizeObserver) {
      new ResizeObserver(function () { self.resize(); }).observe(this.wrap);
    }
    this.resize();

    var el = this.fxC;
    el.addEventListener("pointerdown", function (e) { self.onDown(e); });
    el.addEventListener("pointermove", function (e) { self.onMove(e); });
    el.addEventListener("pointerup", function (e) { self.onUp(e); });
    el.addEventListener("pointercancel", function (e) { self.onUp(e); });

    requestAnimationFrame(function loop() {
      self.frame();
      requestAnimationFrame(loop);
    });
  },

  /* ---- input ---- */
  norm: function (e) {
    var r = this.fxC.getBoundingClientRect();
    var x = (e.clientX - r.left) / Math.max(1, r.width);
    var y = 1 - (e.clientY - r.top) / Math.max(1, r.height);
    return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
  },

  onDown: function (e) {
    e.preventDefault();
    if (this.pointerId !== null) {
      // newest finger wins (mono retrigger)
      Looper.touch("up", this.px, this.py);
    }
    this.pointerId = e.pointerId;
    try { this.fxC.setPointerCapture(e.pointerId); } catch (err) {}
    var p = this.norm(e);
    this.px = p.x; this.py = p.y;
    Engine.resume();
    Looper.touch("down", p.x, p.y);
    this.showNote();
  },

  onMove: function (e) {
    if (e.pointerId !== this.pointerId) return;
    var p = this.norm(e);
    this.px = p.x; this.py = p.y;
    Looper.touch("move", p.x, p.y);
    this.showNote();
  },

  onUp: function (e) {
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = null;
    Looper.touch("up", this.px, this.py);
    this.noteEl.classList.remove("on");
  },

  showNote: function () {
    this.noteEl.textContent = Looper.liveLabel();
    this.noteEl.classList.add("on");
  },

  /* ---- layout ---- */
  resize: function () {
    var r = this.wrap.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = r.width; this.h = r.height;
    [this.gridC, this.fxC].forEach(function (c) {
      c.width = Math.round(r.width * this.dpr);
      c.height = Math.round(r.height * this.dpr);
    }, this);
    this.gctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.fctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.gridDirty = true;
  },

  /* ---- static grid layer ---- */
  drawGrid: function () {
    var g = this.gctx, w = this.w, h = this.h;
    g.clearRect(0, 0, w, h);
    var prog = Looper.selProg();
    var col = progColor(prog);

    var ax = document.getElementById("axis-x");
    var ay = document.getElementById("axis-y");
    if (prog.type === "drumpat") { ax.textContent = "PATTERN ▸"; ay.textContent = "ENERGY ▸"; }
    else if (prog.type === "drumhit") { ax.textContent = "SOUND ▸"; ay.textContent = "TUNE ▸"; }
    else if (prog.type === "zap") { ax.textContent = "PITCH ▸"; ay.textContent = "FX ▸"; }
    else { ax.textContent = "PITCH ▸"; ay.textContent = "TONE ▸"; }

    g.strokeStyle = "rgba(94,106,133,0.18)";
    g.lineWidth = 1;

    // horizontal quarters (Y reference)
    for (var q = 1; q < 4; q++) {
      var yy = (h * q) / 4;
      g.beginPath(); g.moveTo(0, yy); g.lineTo(w, yy); g.stroke();
    }

    if (prog.type === "drumpat" || prog.type === "drumhit") {
      var n = 8;
      for (var i = 1; i < n; i++) {
        var xx = (w * i) / n;
        g.beginPath(); g.moveTo(xx, 0); g.lineTo(xx, h); g.stroke();
      }
      g.font = "700 9px -apple-system, system-ui, sans-serif";
      g.textAlign = "center";
      g.fillStyle = "rgba(214,226,240,0.4)";
      for (var z = 0; z < n; z++) {
        var label = prog.type === "drumhit" ? DRUM_LANES[z].label : DRUM_PATTERNS[z].name;
        g.fillText(label, (w * (z + 0.5)) / n, h - 16);
      }
    } else if (prog.quantize === false) {
      for (var c = 1; c < 12; c++) {
        var cx = (w * c) / 12;
        g.beginPath(); g.moveTo(cx, 0); g.lineTo(cx, h); g.stroke();
      }
    } else {
      var scale = State.scale();
      var count = NoteMath.noteCount(scale, Settings.octaves);
      var stepsLen = scale.steps.length;
      var drawNotes = count <= 26;
      for (var k = 0; k < count; k++) {
        var isRoot = k % stepsLen === 0;
        if (!drawNotes && !isRoot) continue;
        var x0 = (w * k) / count, x1 = (w * (k + 1)) / count;
        if (isRoot) {
          g.fillStyle = "rgba(25,230,255,0.05)";
          g.fillRect(x0, 0, x1 - x0, h);
        }
        if (k > 0) {
          g.strokeStyle = isRoot ? "rgba(25,230,255,0.3)" : "rgba(94,106,133,0.16)";
          g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0, h); g.stroke();
        }
      }
    }

    // accent edge in program color
    g.fillStyle = col;
    g.globalAlpha = 0.5;
    g.fillRect(0, h - 2, w, 2);
    g.globalAlpha = 1;
  },

  /* ---- animated fx layer ---- */
  frame: function () {
    if (!Engine.ready) return;
    if (this.gridDirty) { this.drawGrid(); this.gridDirty = false; }

    var f = this.fctx, w = this.w, h = this.h;

    // fade previous frame (leaves glowing trails)
    f.globalCompositeOperation = "destination-out";
    f.fillStyle = "rgba(0,0,0,0.16)";
    f.fillRect(0, 0, w, h);
    f.globalCompositeOperation = "lighter";

    var beat = Clock.nowBeat();

    // ghost cursors for looping parts
    for (var i = 0; i < 5; i++) {
      var gp = Looper.ghostAt(i, beat);
      if (!gp) continue;
      this.dot(f, gp.x * w, (1 - gp.y) * h, 7, UI.PART_COLORS[i], 0.55);
    }

    // live touch
    if (this.pointerId !== null) {
      var cx = this.px * w, cy = (1 - this.py) * h;
      var col = UI.PART_COLORS[Looper.selected];
      f.globalAlpha = 0.25;
      f.strokeStyle = col;
      f.lineWidth = 1;
      f.beginPath(); f.moveTo(cx, 0); f.lineTo(cx, h); f.stroke();
      f.beginPath(); f.moveTo(0, cy); f.lineTo(w, cy); f.stroke();
      f.globalAlpha = 1;
      var prog = Looper.selProg();
      if (prog.type === "drumpat" || prog.type === "drumhit") {
        var zone = Math.min(7, Math.floor(this.px * 8));
        f.globalAlpha = 0.12;
        f.fillStyle = col;
        f.fillRect((w * zone) / 8, 0, w / 8, h);
        f.globalAlpha = 1;
      }
      this.dot(f, cx, cy, 14, col, 0.9);
    }

    f.globalCompositeOperation = "source-over";

    // beat flash + LEDs
    var bi = Math.floor(beat);
    if (bi !== this._lastBeatInt) {
      this._lastBeatInt = bi;
      var self = this;
      this.wrap.classList.add("beat");
      clearTimeout(this._beatTimer);
      this._beatTimer = setTimeout(function () { self.wrap.classList.remove("beat"); }, 100);
      UI.updateLeds(bi);
    }
  },

  dot: function (f, x, y, r, color, alpha) {
    var grd = f.createRadialGradient(x, y, 0, x, y, r * 2.6);
    grd.addColorStop(0, color);
    grd.addColorStop(1, "rgba(0,0,0,0)");
    f.globalAlpha = alpha;
    f.fillStyle = grd;
    f.beginPath(); f.arc(x, y, r * 2.6, 0, Math.PI * 2); f.fill();
    f.globalAlpha = 1;
  }
};
