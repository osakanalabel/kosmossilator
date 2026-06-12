/* KOSMOSSILATOR - audio engine (global: Engine, Clock, Synth)
   All sound is scheduled on the AudioContext timeline (lookahead scheduler).
   Graph: voice -> part.gate (gate arp) -> part.vol -> master -> limiter -> out
                \-> sendGain -> delayIn -> tempo-synced delay -> master        */
"use strict";

var Engine = {
  ctx: null,
  master: null,
  limiter: null,
  delayIn: null,
  delayNode: null,
  parts: [],          // 5 x { gate: GainNode, vol: GainNode }
  noiseBuf: null,
  ready: false,

  init: function () {
    if (this.ctx) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    var ctx = this.ctx = new AC({ latencyHint: "interactive" });

    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -8;
    this.limiter.knee.value = 4;
    this.limiter.ratio.value = 12;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.22;
    this.limiter.connect(ctx.destination);

    this.master = ctx.createGain();
    this.master.gain.value = Settings.volume;
    this.master.connect(this.limiter);

    // tempo-synced send delay (dotted 8th)
    this.delayIn = ctx.createGain();
    this.delayNode = ctx.createDelay(2.0);
    var hp = ctx.createBiquadFilter();
    hp.type = "highpass"; hp.frequency.value = 280;
    var fb = ctx.createGain(); fb.gain.value = 0.34;
    var wet = ctx.createGain(); wet.gain.value = 0.55;
    this.delayIn.connect(this.delayNode);
    this.delayNode.connect(hp);
    hp.connect(fb);
    fb.connect(this.delayNode);
    this.delayNode.connect(wet);
    wet.connect(this.master);

    for (var i = 0; i < 5; i++) {
      var gate = ctx.createGain(); gate.gain.value = 1;
      var vol = ctx.createGain(); vol.gain.value = 1;
      gate.connect(vol);
      vol.connect(this.master);
      this.parts.push({ gate: gate, vol: vol });
    }

    // 2s white noise buffer (shared)
    var len = Math.floor(ctx.sampleRate * 2);
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = this.noiseBuf.getChannelData(0);
    for (var n = 0; n < len; n++) d[n] = Math.random() * 2 - 1;

    this.updateDelayTime();
    this.ready = true;
  },

  now: function () { return this.ctx ? this.ctx.currentTime : 0; },

  resume: function () {
    if (this.ctx && this.ctx.state !== "running") {
      this.ctx.resume();
    }
  },

  /* iOS unlock: resume + play a silent buffer inside the user gesture */
  unlock: function () {
    this.init();
    this.resume();
    try {
      var b = this.ctx.createBuffer(1, 1, 22050);
      var s = this.ctx.createBufferSource();
      s.buffer = b; s.connect(this.ctx.destination); s.start(0);
    } catch (e) {}
  },

  setVolume: function (v) {
    Settings.volume = v;
    if (this.master) this.master.gain.setTargetAtTime(v, this.now(), 0.05);
  },

  updateDelayTime: function () {
    if (!this.delayNode) return;
    var t = Math.min(1.8, (60 / Clock.bpm) * 0.75);
    this.delayNode.delayTime.setTargetAtTime(t, this.now(), 0.08);
  },

  resetGates: function () {
    var t = this.now();
    for (var i = 0; i < this.parts.length; i++) {
      var g = this.parts[i].gate.gain;
      g.cancelScheduledValues(t);
      g.setTargetAtTime(1, t, 0.01);
    }
  }
};

/* ---------------- Clock: lookahead scheduler ----------------
   time(beat) = anchorTime + (beat - anchorBeat) * 60/bpm
   BPM changes re-anchor at the already-scheduled boundary so phase stays continuous. */
var Clock = {
  bpm: 120,
  running: false,
  anchorTime: 0,
  anchorBeat: 0,
  scheduledUntil: 0,   // beats
  lookahead: 0.12,     // seconds
  _timer: null,
  subscribers: [],     // fn(b0, b1) — schedule events with beat in [b0, b1)

  timeAt: function (beat) { return this.anchorTime + (beat - this.anchorBeat) * (60 / this.bpm); },
  beatAt: function (time) { return this.anchorBeat + (time - this.anchorTime) * (this.bpm / 60); },
  nowBeat: function () { return this.running ? this.beatAt(Engine.now()) : 0; },

  start: function () {
    if (this.running) return;
    this.bpm = Settings.bpm;
    this.anchorTime = Engine.now() + 0.05;
    this.anchorBeat = 0;
    this.scheduledUntil = 0;
    this.running = true;
    var self = this;
    this._timer = setInterval(function () { self.tick(); }, 25);
  },

  stop: function () {
    clearInterval(this._timer);
    this.running = false;
  },

  /* restart loop phase at beat 0 (transport STOP->PLAY) */
  resetPhase: function () {
    this.anchorTime = Engine.now() + 0.05;
    this.anchorBeat = 0;
    this.scheduledUntil = 0;
  },

  setBpm: function (b) {
    b = Math.max(40, Math.min(240, Math.round(b)));
    if (this.running) {
      var t = this.timeAt(this.scheduledUntil);
      this.anchorTime = t;
      this.anchorBeat = this.scheduledUntil;
    }
    this.bpm = b;
    Settings.bpm = b;
    Engine.updateDelayTime();
  },

  tick: function () {
    var now = Engine.now();
    var until = this.beatAt(now + this.lookahead);
    if (until <= this.scheduledUntil) return;
    // app was backgrounded: skip the gap instead of scheduling a backlog
    if (until - this.scheduledUntil > 16) this.scheduledUntil = this.beatAt(now);
    var b0 = this.scheduledUntil, b1 = until;
    for (var i = 0; i < this.subscribers.length; i++) this.subscribers[i](b0, b1);
    this.scheduledUntil = b1;
  },

  /* iterate grid steps of size `div` beats inside [b0, b1) */
  steps: function (b0, b1, div, cb) {
    for (var k = Math.ceil(b0 / div - 1e-6); k * div < b1 - 1e-9; k++) {
      var b = k * div;
      if (b >= b0 - 1e-9) cb(b, this.timeAt(b), k);
    }
  }
};

/* ---------------- Synth: voices & one-shots ---------------- */
var Synth = {

  _oscType: function (name) {
    if (name === "saw" || name === "supersaw") return "sawtooth";
    if (name === "square") return "square";
    if (name === "tri") return "triangle";
    return "sine";
  },

  _cutoff: function (prog, y) {
    var c = prog.cutoff || { base: 1000, oct: 2 };
    return Math.min(16000, c.base * Math.pow(2, y * c.oct));
  },

  /* sustained mono voice for melodic / chord programs */
  createVoice: function (prog, partIdx, t, x, y) {
    var ctx = Engine.ctx;
    var part = Engine.parts[partIdx];
    var g = prog.gain || 0.5;
    var env = prog.env || { a: 0.005, d: 0.1, s: 0.8, r: 0.1 };

    var amp = ctx.createGain(); amp.gain.value = 0;
    var filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = prog.q || 1;
    filter.connect(amp);
    amp.connect(part.gate);
    if (prog.send) {
      var send = ctx.createGain(); send.gain.value = prog.send;
      amp.connect(send); send.connect(Engine.delayIn);
    }

    var chord = prog.chord || [0];
    var detunes;
    if (prog.osc === "supersaw") {
      var d0 = prog.detune || 10;
      detunes = [-d0, 0, d0];
    } else if (prog.detune) {
      detunes = [-prog.detune / 2, prog.detune / 2];
    } else {
      detunes = [0];
    }

    var stoppables = [], allOscs = [], tones = [];
    var toneGainVal = (1 / detunes.length) * (1 / Math.sqrt(chord.length));
    for (var ci = 0; ci < chord.length; ci++) {
      var tg = ctx.createGain(); tg.gain.value = toneGainVal;
      tg.connect(filter);
      var oscs = [];
      for (var oi = 0; oi < detunes.length; oi++) {
        var o = ctx.createOscillator();
        o.type = this._oscType(prog.osc);
        o.detune.value = detunes[oi];
        o.connect(tg);
        o.start(t);
        oscs.push(o); allOscs.push(o); stoppables.push(o);
      }
      tones.push({ off: chord[ci], oscs: oscs });
    }

    var sub = null;
    if (prog.sub) {
      sub = ctx.createOscillator(); sub.type = "sine";
      var sg = ctx.createGain(); sg.gain.value = prog.sub;
      sub.connect(sg); sg.connect(filter);
      sub.start(t); stoppables.push(sub);
    }

    if (prog.noise) {
      var ns = ctx.createBufferSource();
      ns.buffer = Engine.noiseBuf; ns.loop = true;
      var ng = ctx.createGain(); ng.gain.value = prog.noise;
      ns.connect(ng); ng.connect(filter);
      ns.start(t); stoppables.push(ns);
    }

    var vibGain = null;
    if (prog.vib) {
      var vlfo = ctx.createOscillator(); vlfo.type = "sine";
      vlfo.frequency.value = prog.vib.rate;
      vibGain = ctx.createGain(); vibGain.gain.value = 0;
      vlfo.connect(vibGain);
      for (var ai = 0; ai < allOscs.length; ai++) vibGain.connect(allOscs[ai].detune);
      vlfo.start(t); stoppables.push(vlfo);
    }

    var wobLfo = null;
    if (prog.wob) {
      wobLfo = ctx.createOscillator(); wobLfo.type = "sine";
      wobLfo.frequency.value = prog.wob.minHz;
      var wg = ctx.createGain(); wg.gain.value = prog.wob.depth;
      wobLfo.connect(wg); wg.connect(filter.detune);
      wobLfo.start(t); stoppables.push(wobLfo);
    }

    // attack envelope
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(g, t + env.a);
    amp.gain.setTargetAtTime(g * env.s, t + env.a, Math.max(env.d, 0.01) / 3);

    var voice = {
      prog: prog,
      released: false,
      lastDeg: null,
      label: "",

      _envAttack: function (time) {
        var p = amp.gain;
        try { p.cancelAndHoldAtTime(time); } catch (e) { p.cancelScheduledValues(time); }
        p.linearRampToValueAtTime(g, time + Math.max(env.a, 0.003));
        p.setTargetAtTime(g * env.s, time + Math.max(env.a, 0.003), Math.max(env.d, 0.01) / 3);
      },

      setXY: function (time, x2, y2) {
        if (this.released) return;
        var glide = prog.glide || 0.01;
        var scale = State.scale();

        if (prog.quantize === false) {
          var fm = NoteMath.midiFromXFree(x2, Settings.keyIdx, prog.baseOct, Settings.octaves);
          var fr = NoteMath.midiToFreq(fm);
          for (var i = 0; i < tones.length; i++) {
            for (var j = 0; j < tones[i].oscs.length; j++) {
              tones[i].oscs[j].frequency.setTargetAtTime(fr, time, glide);
            }
          }
          if (sub) sub.frequency.setTargetAtTime(fr / 2, time, glide);
          this.label = NoteMath.noteName(fm);
        } else {
          var deg = NoteMath.degreeFromX(x2, scale, Settings.octaves);
          if (prog.retrig && this.lastDeg !== null && deg !== this.lastDeg) {
            this._envAttack(time);
          }
          this.lastDeg = deg;
          var rootMidi = null;
          for (var ti = 0; ti < tones.length; ti++) {
            var m = NoteMath.degreeToMidi(deg + tones[ti].off, Settings.keyIdx, scale, prog.baseOct);
            if (ti === 0) rootMidi = m;
            var f = NoteMath.midiToFreq(m);
            for (var oj = 0; oj < tones[ti].oscs.length; oj++) {
              tones[ti].oscs[oj].frequency.setTargetAtTime(f, time, glide);
            }
          }
          if (sub) sub.frequency.setTargetAtTime(NoteMath.midiToFreq(rootMidi) / 2, time, glide);
          this.label = NoteMath.noteName(rootMidi) + (chord.length > 1 ? " *" : "");
        }

        filter.frequency.setTargetAtTime(Synth._cutoff(prog, y2), time, 0.03);
        if (vibGain) vibGain.gain.setTargetAtTime(prog.vib.depth * y2, time, 0.05);
        if (wobLfo) {
          var rate = prog.wob.minHz + y2 * y2 * (prog.wob.maxHz - prog.wob.minHz);
          wobLfo.frequency.setTargetAtTime(rate, time, 0.05);
        }
      },

      release: function (time) {
        if (this.released) return;
        this.released = true;
        var p = amp.gain;
        try { p.cancelAndHoldAtTime(time); } catch (e) { p.cancelScheduledValues(time); }
        p.setTargetAtTime(0, time, Math.max(env.r, 0.02) / 3);
        this._stopAll(time + Math.max(env.r, 0.02) * 4 + 0.1);
      },

      kill: function () {
        var time = Engine.now();
        this.released = true;
        amp.gain.cancelScheduledValues(time);
        amp.gain.setTargetAtTime(0, time, 0.012);
        this._stopAll(time + 0.15);
      },

      _stopAll: function (tt) {
        for (var i = 0; i < stoppables.length; i++) {
          try { stoppables[i].stop(tt); } catch (e) {}
        }
        stoppables[0].onended = function () {
          try { amp.disconnect(); } catch (e) {}
        };
      }
    };

    voice.setXY(t, x, y);
    return voice;
  },

  /* one-shot note for ARP programs */
  arpNote: function (prog, partIdx, t, degIdx, y) {
    var ctx = Engine.ctx, part = Engine.parts[partIdx];
    var g = prog.gain || 0.5;
    var scale = State.scale();
    var m = NoteMath.degreeToMidi(degIdx, Settings.keyIdx, scale, prog.baseOct);
    var dur = Math.max(0.05, prog.arp.div * 0.55 * (60 / Clock.bpm));

    var o = ctx.createOscillator();
    o.type = this._oscType(prog.osc);
    o.frequency.value = NoteMath.midiToFreq(m);
    var f = ctx.createBiquadFilter();
    f.type = "lowpass"; f.Q.value = prog.q || 1;
    f.frequency.value = this._cutoff(prog, y);
    var a = ctx.createGain(); a.gain.value = 0;
    o.connect(f); f.connect(a); a.connect(part.gate);
    if (prog.send) {
      var s = ctx.createGain(); s.gain.value = prog.send;
      a.connect(s); s.connect(Engine.delayIn);
    }
    a.gain.setValueAtTime(0, t);
    a.gain.linearRampToValueAtTime(g, t + 0.004);
    a.gain.setValueAtTime(g, t + dur * 0.5);
    a.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur + 0.1);
    return NoteMath.noteName(m);
  },

  /* laser zap one-shot (SE) */
  zapHit: function (prog, partIdx, t, x, y) {
    var ctx = Engine.ctx, part = Engine.parts[partIdx];
    var fm = NoteMath.midiFromXFree(x, Settings.keyIdx, prog.baseOct, Settings.octaves);
    var f0 = NoteMath.midiToFreq(fm);
    var dur = 0.1 + y * 0.18;

    var o = ctx.createOscillator(); o.type = "square";
    o.frequency.setValueAtTime(f0 * (3 + y * 9), t);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, f0), t + dur);
    var a = ctx.createGain(); a.gain.value = 0;
    o.connect(a); a.connect(part.gate);
    var s = ctx.createGain(); s.gain.value = prog.send || 0.3;
    a.connect(s); s.connect(Engine.delayIn);
    a.gain.setValueAtTime(0, t);
    a.gain.linearRampToValueAtTime((prog.gain || 0.5), t + 0.003);
    a.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.05);
    o.start(t); o.stop(t + dur + 0.15);
  },

  /* ------- drums ------- */
  _hitBus: function (partIdx, send) {
    var ctx = Engine.ctx;
    var bus = ctx.createGain();
    bus.connect(Engine.parts[partIdx].gate);
    if (send) {
      var s = ctx.createGain(); s.gain.value = send;
      bus.connect(s); s.connect(Engine.delayIn);
    }
    return bus;
  },

  drumHit: function (laneId, partIdx, t, y, send) {
    var out = this._hitBus(partIdx, send || 0);
    switch (laneId) {
      case "kick":  this._kick(t, out, y); break;
      case "snare": this._snare(t, out, y); break;
      case "chh":   this._metal(t, out, 40, 10000, 7500, 0.04 + y * 0.04, 0.32); break;
      case "ohh":   this._metal(t, out, 40, 9000, 6500, 0.3 + y * 0.25, 0.34); break;
      case "clap":  this._clap(t, out, y); break;
      case "tomlo": this._tom(t, out, 120 + y * 40, 0.3, 0.7); break;
      case "tomhi": this._tom(t, out, 200 + y * 70, 0.25, 0.6); break;
      case "ride":  this._metal(t, out, 60, 5500, 3500, 0.5 + y * 0.3, 0.22); break;
    }
  },

  _kick: function (t, out, y) {
    var ctx = Engine.ctx;
    var o = ctx.createOscillator(); o.type = "sine";
    var f0 = 150 * (0.85 + y * 0.5);
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.1);
    var a = ctx.createGain();
    a.gain.setValueAtTime(1.0, t);
    a.gain.exponentialRampToValueAtTime(0.001, t + 0.26 + y * 0.18);
    o.connect(a); a.connect(out);
    o.start(t); o.stop(t + 0.55);
    // click transient
    var n = ctx.createBufferSource(); n.buffer = Engine.noiseBuf;
    var nf = ctx.createBiquadFilter(); nf.type = "highpass"; nf.frequency.value = 1200;
    var na = ctx.createGain();
    na.gain.setValueAtTime(0.3, t);
    na.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
    n.connect(nf); nf.connect(na); na.connect(out);
    n.start(t); n.stop(t + 0.05);
  },

  _snare: function (t, out, y) {
    var ctx = Engine.ctx;
    var o = ctx.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(190, t);
    o.frequency.exponentialRampToValueAtTime(120, t + 0.08);
    var oa = ctx.createGain();
    oa.gain.setValueAtTime(0.5, t);
    oa.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(oa); oa.connect(out);
    o.start(t); o.stop(t + 0.2);
    var n = ctx.createBufferSource(); n.buffer = Engine.noiseBuf;
    var nf = ctx.createBiquadFilter(); nf.type = "bandpass";
    nf.frequency.value = 1800 + y * 800; nf.Q.value = 0.8;
    var na = ctx.createGain();
    na.gain.setValueAtTime(0.8, t);
    na.gain.exponentialRampToValueAtTime(0.001, t + 0.16 + y * 0.1);
    n.connect(nf); nf.connect(na); na.connect(out);
    n.start(t); n.stop(t + 0.35);
  },

  _clap: function (t, out, y) {
    var ctx = Engine.ctx;
    var n = ctx.createBufferSource(); n.buffer = Engine.noiseBuf;
    var nf = ctx.createBiquadFilter(); nf.type = "bandpass";
    nf.frequency.value = 1100 + y * 500; nf.Q.value = 1.6;
    var na = ctx.createGain(); na.gain.value = 0;
    n.connect(nf); nf.connect(na); na.connect(out);
    na.gain.setValueAtTime(0.85, t);
    na.gain.exponentialRampToValueAtTime(0.25, t + 0.011);
    na.gain.setValueAtTime(0.8, t + 0.013);
    na.gain.exponentialRampToValueAtTime(0.25, t + 0.024);
    na.gain.setValueAtTime(0.75, t + 0.026);
    na.gain.exponentialRampToValueAtTime(0.001, t + 0.026 + 0.2);
    n.start(t); n.stop(t + 0.3);
  },

  _tom: function (t, out, f0, dec, vol) {
    var ctx = Engine.ctx;
    var o = ctx.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(40, f0 * 0.5), t + dec);
    var a = ctx.createGain();
    a.gain.setValueAtTime(vol, t);
    a.gain.exponentialRampToValueAtTime(0.001, t + dec);
    o.connect(a); a.connect(out);
    o.start(t); o.stop(t + dec + 0.1);
  },

  /* 808-style metallic noise (hats / ride): 6 detuned squares -> bp -> hp */
  _metal: function (t, out, base, bpHz, hpHz, dec, vol) {
    var ctx = Engine.ctx;
    var ratios = [2, 3, 4.16, 5.43, 6.79, 8.21];
    var bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = bpHz; bp.Q.value = 1;
    var hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = hpHz;
    var a = ctx.createGain();
    a.gain.setValueAtTime(vol, t);
    a.gain.exponentialRampToValueAtTime(0.001, t + dec);
    bp.connect(hp); hp.connect(a); a.connect(out);
    for (var i = 0; i < ratios.length; i++) {
      var o = ctx.createOscillator(); o.type = "square";
      o.frequency.value = base * ratios[i];
      o.connect(bp);
      o.start(t); o.stop(t + dec + 0.05);
    }
  },

  /* metronome click (bypasses parts) */
  click: function (t, accent) {
    var ctx = Engine.ctx;
    var o = ctx.createOscillator(); o.type = "square";
    o.frequency.value = accent ? 1760 : 1175;
    var a = ctx.createGain();
    a.gain.setValueAtTime(accent ? 0.22 : 0.13, t);
    a.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    o.connect(a); a.connect(Engine.master);
    o.start(t); o.stop(t + 0.06);
  }
};
