// Tiny synthesized SFX bank (WebAudio, no asset downloads).
let ctx = null;
let master = null;
let noiseBuf = null;
let enabled = true;

export function setSoundEnabled(on) { enabled = on; }

export function unlockAudio() {
  if (!enabled) return;
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      master = ctx.createGain(); master.gain.value = .55;
      master.connect(comp).connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * .6, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === "suspended") ctx.resume();
  } catch { ctx = null; }
}

function tone(freq, { at = 0, dur = .12, type = "sine", vol = .12, to = null, attack = .005 } = {}) {
  const t = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t); osc.stop(t + dur + .02);
}

function noise({ at = 0, dur = .3, vol = .2, from = 2400, to = 200, q = .8, type = "lowpass" } = {}) {
  const t = ctx.currentTime + at;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t); src.stop(t + dur + .02);
}

const BANK = {
  tap() { tone(1250, { dur: .05, vol: .05, to: 820 }); },
  select() { tone(660, { dur: .06, vol: .06, type: "triangle" }); tone(990, { at: .045, dur: .08, vol: .05, type: "triangle" }); },
  tab() { tone(520, { dur: .07, vol: .05, type: "triangle", to: 780 }); },
  deny() { tone(150, { dur: .12, vol: .09, type: "square", to: 110 }); },
  upgrade() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, { at: i * .055, dur: .16, vol: .08, type: "triangle" }));
    tone(2093, { at: .22, dur: .25, vol: .03 });
  },
  build() { noise({ dur: .22, vol: .12, from: 600, to: 3200, type: "bandpass", q: 1.2 }); tone(98, { dur: .18, vol: .16, to: 60 }); tone(880, { at: .1, dur: .1, vol: .04, type: "triangle" }); },
  surge() { tone(220, { dur: .35, vol: .08, type: "sawtooth", to: 880 }); noise({ dur: .35, vol: .06, from: 800, to: 6000, type: "highpass" }); tone(1318, { at: .28, dur: .2, vol: .05 }); },
  coin() { tone(1318, { dur: .09, vol: .07 }); tone(1760, { at: .07, dur: .22, vol: .07 }); },
  claim() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, { at: i * .06, dur: .2, vol: .07, type: "triangle" })); },
  launch() { tone(110, { dur: .5, vol: .15, type: "sawtooth", to: 55 }); noise({ dur: .5, vol: .12, from: 300, to: 2400, type: "bandpass" }); },
  laser() { tone(1600 + Math.random() * 500, { dur: .12, vol: .045, type: "square", to: 240 }); },
  boom() { noise({ dur: .5, vol: .26, from: 1600, to: 60 }); tone(70, { dur: .35, vol: .18, to: 40 }); },
  victory() {
    [523, 659, 784].forEach(f => tone(f, { dur: .3, vol: .07, type: "triangle" }));
    [659, 784, 1047].forEach(f => tone(f, { at: .18, dur: .34, vol: .07, type: "triangle" }));
    [784, 1047, 1319, 1568].forEach(f => tone(f, { at: .38, dur: .8, vol: .07, type: "triangle", attack: .02 }));
  },
  defeat() { [392, 349, 311, 262].forEach((f, i) => tone(f, { at: i * .14, dur: .3, vol: .08, type: "triangle" })); },
  prestige() { [262, 392, 523, 784, 1047, 1568].forEach((f, i) => tone(f, { at: i * .09, dur: .9, vol: .06, type: "sine", attack: .03 })); noise({ dur: 1.2, vol: .05, from: 500, to: 8000, type: "highpass" }); },
  unlock() { [880, 1175, 1760].forEach((f, i) => tone(f, { at: i * .08, dur: .25, vol: .06, type: "sine" })); },
};

export function sfx(name) {
  if (!enabled) return;
  unlockAudio();
  if (!ctx || !BANK[name]) return;
  try { BANK[name](); } catch {}
}
