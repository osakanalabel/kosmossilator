/* KOSMOSSILATOR - UI wiring: parts, transport, program selector, sheets (global: UI) */
"use strict";

var UI = {
  PART_COLORS: ["#ffd60a", "#ff7a2e", "#ff2ea6", "#2e9bff", "#3dff8c"],
  GATE_CYCLE: ["off", "16", "8", "16t"],
  GATE_LABEL: { "off": "OFF", "16": "1/16", "8": "1/8", "16t": "TRI" },
  _partEls: [],
  _lpTimer: null,
  _lpFired: false,
  _taps: [],
  _clearArmed: false,

  $: function (id) { return document.getElementById(id); },

  init: function () {
    var self = this;

    /* ---- part buttons ---- */
    var partsEl = this.$("parts");
    for (var i = 0; i < 5; i++) {
      (function (idx) {
        var b = document.createElement("button");
        b.className = "part";
        b.style.setProperty("--pc", self.PART_COLORS[idx]);
        b.innerHTML = '<span class="dot"></span><span class="pn">' + (idx + 1) + '</span><span class="pp"></span>';
        b.addEventListener("pointerdown", function (e) {
          e.preventDefault();
          self._lpFired = false;
          clearTimeout(self._lpTimer);
          self._lpTimer = setTimeout(function () {
            self._lpFired = true;
            Looper.clearPart(idx);
            self.toast("PART " + (idx + 1) + " CLEARED");
            if (navigator.vibrate) navigator.vibrate(30);
          }, 600);
        });
        b.addEventListener("pointerup", function () {
          clearTimeout(self._lpTimer);
          if (self._lpFired) return;
          if (Looper.selected === idx) Looper.toggleMute(idx);
          else Looper.selectPart(idx);
        });
        b.addEventListener("pointerleave", function () { clearTimeout(self._lpTimer); });
        b.addEventListener("pointercancel", function () { clearTimeout(self._lpTimer); });
        partsEl.appendChild(b);
        self._partEls.push(b);
      })(i);
    }

    /* ---- transport ---- */
    this.$("btn-rec").addEventListener("click", function () { Looper.toggleRec(); });
    this.$("btn-play").addEventListener("click", function () { Looper.setPlaying(!Looper.playing); });

    /* ---- program selector ---- */
    this.$("prog-prev").addEventListener("click", function () { self.stepProgram(-1); });
    this.$("prog-next").addEventListener("click", function () { self.stepProgram(1); });
    this.$("prog-name").addEventListener("click", function () { self.openSheet("sheet-programs"); });

    /* ---- gate ---- */
    this.$("btn-gate").addEventListener("click", function () {
      var i = self.GATE_CYCLE.indexOf(Settings.gate);
      Settings.gate = self.GATE_CYCLE[(i + 1) % self.GATE_CYCLE.length];
      if (Settings.gate === "off") Engine.resetGates();
      State.save();
      self.refreshProgram();
    });

    /* ---- top chips ---- */
    this.$("chip-scale").addEventListener("click", function () { self.openSheet("sheet-settings"); });
    this.$("chip-settings").addEventListener("click", function () { self.openSheet("sheet-settings"); });
    this.$("chip-bpm").addEventListener("click", function () { self.openSheet("sheet-bpm"); });

    /* ---- sheets ---- */
    this.$("backdrop").addEventListener("click", function () { self.closeSheets(); });
    var closes = document.querySelectorAll(".sheet-close");
    for (var c = 0; c < closes.length; c++) {
      closes[c].addEventListener("click", function () { self.closeSheets(); });
    }

    this.buildSettings();
    this.buildProgramSheet();
    this.buildBpmSheet();

    this.refreshParts();
    this.refreshProgram();
    this.refreshTransport();
    this.refreshChips();
  },

  /* ================= settings sheet ================= */
  buildSettings: function () {
    var self = this;

    var prEl = this.$("set-preset");
    PRESETS.forEach(function (pr, i) {
      var b = document.createElement("button");
      b.textContent = pr.name;
      b.addEventListener("click", function () {
        loadPreset(i);
        self.toast(pr.name);
        self.closeSheets();
      });
      prEl.appendChild(b);
    });

    var keyEl = this.$("set-key");
    KEYS.forEach(function (k, i) {
      var b = document.createElement("button");
      b.textContent = k;
      b.addEventListener("click", function () {
        Settings.keyIdx = i;
        self.afterMusicChange();
      });
      keyEl.appendChild(b);
    });

    var scEl = this.$("set-scale");
    SCALES.forEach(function (s) {
      var b = document.createElement("button");
      b.textContent = s.name;
      b.dataset.id = s.id;
      b.addEventListener("click", function () {
        Settings.scaleId = s.id;
        self.afterMusicChange();
      });
      scEl.appendChild(b);
    });

    this.buildSeg("set-oct", [1, 2, 3, 4], function () { return Settings.octaves; }, function (v) {
      Settings.octaves = v; self.afterMusicChange();
    });
    this.buildSeg("set-loop", [1, 2, 4], function () { return Settings.loopBars; }, function (v) {
      Settings.loopBars = v; State.save(); self.refreshSettings();
    });
    this.buildSeg("set-click", ["OFF", "ON"], function () { return Settings.click ? "ON" : "OFF"; }, function (v) {
      Settings.click = v === "ON"; State.save(); self.refreshSettings();
    });

    var pvEl = this.$("set-pvol");
    for (var pv = 0; pv < 5; pv++) {
      (function (idx) {
        var s = document.createElement("input");
        s.type = "range"; s.min = 0; s.max = 1; s.step = 0.01; s.value = 1;
        s.style.accentColor = self.PART_COLORS[idx];
        s.addEventListener("input", function () {
          Looper.setPartVol(idx, parseFloat(s.value));
        });
        pvEl.appendChild(s);
      })(pv);
    }

    var vol = this.$("set-vol");
    vol.value = Settings.volume;
    vol.addEventListener("input", function () {
      Engine.setVolume(parseFloat(vol.value));
      State.save();
    });

    this.$("set-clear").addEventListener("click", function () {
      if (!self._clearArmed) {
        self._clearArmed = true;
        self.$("set-clear").textContent = "TAP AGAIN TO CLEAR ALL";
        setTimeout(function () {
          self._clearArmed = false;
          self.$("set-clear").textContent = "ALL CLEAR (全パート消去)";
        }, 2000);
        return;
      }
      self._clearArmed = false;
      self.$("set-clear").textContent = "ALL CLEAR (全パート消去)";
      Looper.clearAll();
      self.toast("ALL PARTS CLEARED");
      self.closeSheets();
    });

    this.refreshSettings();
  },

  buildSeg: function (id, values, getter, setter) {
    var el = this.$(id);
    values.forEach(function (v) {
      var b = document.createElement("button");
      b.textContent = String(v);
      b.dataset.v = String(v);
      b.addEventListener("click", function () { setter(v); });
      el.appendChild(b);
    });
  },

  afterMusicChange: function () {
    State.save();
    Pad.gridDirty = true;
    this.refreshChips();
    this.refreshSettings();
  },

  refreshSettings: function () {
    var keyBtns = this.$("set-key").children;
    for (var i = 0; i < keyBtns.length; i++) {
      keyBtns[i].classList.toggle("sel", i === Settings.keyIdx);
    }
    var scBtns = this.$("set-scale").children;
    for (var s = 0; s < scBtns.length; s++) {
      scBtns[s].classList.toggle("sel", scBtns[s].dataset.id === Settings.scaleId);
    }
    var pvs = this.$("set-pvol").children;
    for (var pi = 0; pi < pvs.length; pi++) {
      var v = Looper.parts[pi].vol;
      pvs[pi].value = typeof v === "number" ? v : 1;
    }
    this.refreshSeg("set-oct", String(Settings.octaves));
    this.refreshSeg("set-loop", String(Settings.loopBars));
    this.refreshSeg("set-click", Settings.click ? "ON" : "OFF");
  },

  refreshSeg: function (id, val) {
    var btns = this.$(id).children;
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle("sel", btns[i].dataset.v === val);
    }
  },

  /* ================= program sheet ================= */
  buildProgramSheet: function () {
    var self = this;
    var listEl = this.$("prog-list");
    var cats = [];
    PROGRAMS.forEach(function (p) { if (cats.indexOf(p.cat) < 0) cats.push(p.cat); });
    cats.forEach(function (cat) {
      var head = document.createElement("div");
      head.className = "prog-group";
      head.textContent = cat;
      head.style.color = PROG_CATS[cat].color;
      listEl.appendChild(head);
      var grid = document.createElement("div");
      grid.className = "prog-items";
      PROGRAMS.forEach(function (p) {
        if (p.cat !== cat) return;
        var b = document.createElement("button");
        b.textContent = p.name;
        b.dataset.id = p.id;
        b.style.setProperty("--gc", PROG_CATS[cat].color);
        b.addEventListener("click", function () {
          Looper.setProgram(p.id);
          self.closeSheets();
        });
        grid.appendChild(b);
      });
      listEl.appendChild(grid);
    });
  },

  stepProgram: function (dir) {
    var cur = Looper.parts[Looper.selected].prog;
    var idx = 0;
    for (var i = 0; i < PROGRAMS.length; i++) if (PROGRAMS[i].id === cur) { idx = i; break; }
    idx = (idx + dir + PROGRAMS.length) % PROGRAMS.length;
    Looper.setProgram(PROGRAMS[idx].id);
  },

  refreshProgram: function () {
    var prog = Looper.selProg();
    var col = progColor(prog);
    this.$("prog-title").textContent = prog.name;
    var catEl = this.$("prog-cat");
    catEl.textContent = prog.cat;
    catEl.style.color = col;
    this.$("prog-name").style.borderColor = col;

    var gateBtn = this.$("btn-gate");
    gateBtn.classList.toggle("on", Settings.gate !== "off");
    this.$("gate-mode").textContent = this.GATE_LABEL[Settings.gate];

    var items = this.$("prog-list").querySelectorAll("button[data-id]");
    for (var i = 0; i < items.length; i++) {
      items[i].classList.toggle("sel", items[i].dataset.id === prog.id);
    }
  },

  /* ================= bpm sheet ================= */
  buildBpmSheet: function () {
    var self = this;
    var slider = this.$("bpm-slider");
    slider.value = Settings.bpm;
    slider.addEventListener("input", function () {
      Clock.setBpm(parseInt(slider.value, 10));
      self.refreshChips();
      State.save();
    });
    this.$("bpm-minus").addEventListener("click", function () { self.nudgeBpm(-1); });
    this.$("bpm-plus").addEventListener("click", function () { self.nudgeBpm(1); });
    this.$("bpm-tap").addEventListener("click", function () { self.tapTempo(); });
  },

  nudgeBpm: function (d) {
    Clock.setBpm(Clock.bpm + d);
    this.refreshChips();
    State.save();
  },

  tapTempo: function () {
    var now = performance.now();
    this._taps = this._taps.filter(function (t) { return now - t < 2500; });
    this._taps.push(now);
    if (this._taps.length >= 2) {
      var diffs = [];
      for (var i = 1; i < this._taps.length; i++) diffs.push(this._taps[i] - this._taps[i - 1]);
      var avg = diffs.reduce(function (a, b) { return a + b; }, 0) / diffs.length;
      Clock.setBpm(60000 / avg);
      this.refreshChips();
      State.save();
    }
  },

  refreshChips: function () {
    this.$("chip-scale").textContent = KEYS[Settings.keyIdx] + " " + State.scale().short;
    this.$("chip-bpm").textContent = String(Clock.bpm || Settings.bpm);
    this.$("bpm-big").textContent = String(Clock.bpm || Settings.bpm);
    this.$("bpm-slider").value = Clock.bpm || Settings.bpm;
  },

  /* ================= parts & transport ================= */
  refreshParts: function () {
    for (var i = 0; i < 5; i++) {
      var el = this._partEls[i];
      var part = Looper.parts[i];
      el.classList.toggle("sel", i === Looper.selected);
      el.classList.toggle("muted", part.muted);
      el.classList.toggle("has", part.events.length > 0);
      el.querySelector(".pp").textContent = progById(part.prog).name.toUpperCase();
    }
  },

  refreshTransport: function () {
    this.$("btn-rec").classList.toggle("on", Looper.recording);
    var play = this.$("btn-play");
    play.classList.toggle("on", Looper.playing);
    play.innerHTML = Looper.playing ? "&#9632;" : "&#9654;";
    Pad.wrap && Pad.wrap.classList.toggle("recording", Looper.recording);
  },

  updateLeds: function (beatInt) {
    var leds = this.$("leds").children;
    var pos = ((beatInt % 4) + 4) % 4;
    var loopLen = Settings.loopBars * 4;
    var isLoopHead = ((beatInt % loopLen) + loopLen) % loopLen === 0;
    for (var i = 0; i < 4; i++) {
      leds[i].className = i === pos ? (isLoopHead && i === 0 ? "on bar" : "on") : "";
    }
  },

  /* ================= sheets & toast ================= */
  openSheet: function (id) {
    this.closeSheets();
    this.$("backdrop").classList.add("show");
    this.$(id).classList.add("show");
    if (id === "sheet-bpm") this.refreshChips();
    if (id === "sheet-settings") this.refreshSettings();
  },

  closeSheets: function () {
    this.$("backdrop").classList.remove("show");
    var sheets = document.querySelectorAll(".sheet");
    for (var i = 0; i < sheets.length; i++) sheets[i].classList.remove("show");
  },

  _toastTimer: null,
  toast: function (msg) {
    var el = this.$("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(function () { el.classList.remove("show"); }, 1500);
  }
};
