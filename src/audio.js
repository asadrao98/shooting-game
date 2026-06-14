export class AudioEngine {
  constructor() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();

    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.ctx.destination);

    this.dryBus = this.ctx.createGain();
    this.dryBus.gain.value = 0.85;
    this.dryBus.connect(this.master);

    this.wetBus = this.ctx.createGain();
    this.wetBus.gain.value = 0.28;
    this.reverb = this.ctx.createConvolver();
    this.reverb.buffer = this.makeImpulse(1.6, 2.8);
    this.reverb.connect(this.wetBus);
    this.wetBus.connect(this.master);

    this.noiseBuffer = this.makeNoise(0.35);
    this.longNoiseBuffer = this.makeNoise(4.0);
    this.ambient = null;
  }

  resume() {
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  makeNoise(duration) {
    const sr = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, Math.floor(sr * duration), sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  makeImpulse(duration, decay) {
    const sr = this.ctx.sampleRate;
    const len = Math.floor(sr * duration);
    const buf = this.ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const data = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  // Spatialized gunshot. position + listener optional (omit for first-person)
  playGunshot({ volume = 1, position = null, listener = null } = {}) {
    const ctx = this.ctx;
    const now = ctx.currentTime;

    let attenuation = 1;
    let pan = 0;
    if (position && listener) {
      const dx = position.x - listener.position.x;
      const dy = position.y - listener.position.y;
      const dz = position.z - listener.position.z;
      const dist = Math.hypot(dx, dy, dz);
      attenuation = Math.max(0.06, 1 / (1 + dist * 0.12));
      const rx = Math.cos(listener.yaw) * dx - Math.sin(listener.yaw) * dz;
      pan = Math.max(-1, Math.min(1, rx / 8));
    }
    const finalVol = volume * attenuation;

    const dryOut = ctx.createGain();
    dryOut.gain.value = finalVol;
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    dryOut.connect(panner);
    panner.connect(this.dryBus);

    const wetSend = ctx.createGain();
    wetSend.gain.value = finalVol * 0.6;
    wetSend.connect(this.reverb);

    const tap = node => { node.connect(dryOut); node.connect(wetSend); };

    // 1) high-frequency crack
    const crack = ctx.createBufferSource();
    crack.buffer = this.noiseBuffer;
    const crackHP = ctx.createBiquadFilter();
    crackHP.type = 'highpass';
    crackHP.frequency.value = 1800;
    const crackEnv = ctx.createGain();
    crackEnv.gain.setValueAtTime(0.0001, now);
    crackEnv.gain.exponentialRampToValueAtTime(1.0, now + 0.0008);
    crackEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    crack.connect(crackHP); crackHP.connect(crackEnv);
    tap(crackEnv);
    crack.start(now); crack.stop(now + 0.08);

    // 2) mid-body
    const body = ctx.createBufferSource();
    body.buffer = this.noiseBuffer;
    const bodyLP = ctx.createBiquadFilter();
    bodyLP.type = 'lowpass';
    bodyLP.frequency.setValueAtTime(900, now);
    bodyLP.frequency.exponentialRampToValueAtTime(160, now + 0.25);
    const bodyEnv = ctx.createGain();
    bodyEnv.gain.setValueAtTime(0.0001, now);
    bodyEnv.gain.exponentialRampToValueAtTime(0.85, now + 0.005);
    bodyEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    body.connect(bodyLP); bodyLP.connect(bodyEnv);
    tap(bodyEnv);
    body.start(now); body.stop(now + 0.3);

    // 3) sub-thump
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(95, now);
    sub.frequency.exponentialRampToValueAtTime(38, now + 0.12);
    const subEnv = ctx.createGain();
    subEnv.gain.setValueAtTime(0.0001, now);
    subEnv.gain.exponentialRampToValueAtTime(0.75, now + 0.004);
    subEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    sub.connect(subEnv);
    tap(subEnv);
    sub.start(now); sub.stop(now + 0.22);
  }

  playHitmarker() {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1500, now);
    osc.frequency.exponentialRampToValueAtTime(1100, now + 0.05);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.22, now + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    osc.connect(g); g.connect(this.master);
    osc.start(now); osc.stop(now + 0.09);
  }

  playReload() {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const clicks = [0, 0.32, 0.85, 1.15];
    const freqs = [2800, 1800, 3400, 2200];
    clicks.forEach((t, i) => {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = freqs[i];
      bp.Q.value = 6;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now + t);
      g.gain.exponentialRampToValueAtTime(0.28, now + t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.07);
      noise.connect(bp); bp.connect(g); g.connect(this.master);
      noise.start(now + t); noise.stop(now + t + 0.09);
    });
  }

  playEmpty() {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2400;
    bp.Q.value = 10;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.16, now + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    noise.connect(bp); bp.connect(g); g.connect(this.master);
    noise.start(now); noise.stop(now + 0.06);
  }

  startAmbient(type) {
    this.stopAmbient();
    const ctx = this.ctx;
    const nodes = [];

    if (type === 'rain' || type === 'storm') {
      const src = ctx.createBufferSource();
      src.buffer = this.longNoiseBuffer;
      src.loop = true;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = type === 'storm' ? 1500 : 2200;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = type === 'storm' ? 8000 : 6500;
      const g = ctx.createGain();
      g.gain.value = type === 'storm' ? 0.34 : 0.22;
      src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(this.master);
      src.start();
      nodes.push(src, hp, lp, g);
    }

    if (type === 'wind' || type === 'storm' || type === 'snow' || type === 'fog') {
      const src = ctx.createBufferSource();
      src.buffer = this.longNoiseBuffer;
      src.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 420;
      const g = ctx.createGain();
      g.gain.value = type === 'storm' ? 0.22 : (type === 'snow' ? 0.18 : 0.13);
      // slow LFO on amplitude for variation
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.2;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = type === 'storm' ? 0.12 : 0.06;
      lfo.connect(lfoGain); lfoGain.connect(g.gain);
      src.connect(lp); lp.connect(g); g.connect(this.master);
      src.start(); lfo.start();
      nodes.push(src, lp, g, lfo, lfoGain);
    }

    this.ambient = nodes;
  }

  stopAmbient() {
    if (!this.ambient) return;
    this.ambient.forEach(n => { try { n.stop && n.stop(); } catch {} try { n.disconnect(); } catch {} });
    this.ambient = null;
  }

  playThunder() {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = 0.55;
    out.connect(this.dryBus);
    const wetSend = ctx.createGain();
    wetSend.gain.value = 0.7;
    wetSend.connect(this.reverb);

    // initial crack
    const crack = ctx.createBufferSource();
    crack.buffer = this.longNoiseBuffer;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 800;
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(0.0001, now);
    cg.gain.exponentialRampToValueAtTime(1.0, now + 0.02);
    cg.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    crack.connect(hp); hp.connect(cg); cg.connect(out); cg.connect(wetSend);
    crack.start(now); crack.stop(now + 0.8);

    // long rumble
    const rumble = ctx.createBufferSource();
    rumble.buffer = this.longNoiseBuffer;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(220, now);
    lp.frequency.exponentialRampToValueAtTime(80, now + 3.5);
    const rg = ctx.createGain();
    rg.gain.setValueAtTime(0.0001, now + 0.15);
    rg.gain.exponentialRampToValueAtTime(0.9, now + 0.5);
    rg.gain.exponentialRampToValueAtTime(0.0001, now + 4.0);
    rumble.connect(lp); lp.connect(rg); rg.connect(out); rg.connect(wetSend);
    rumble.start(now); rumble.stop(now + 4.2);
  }

  playExplosion({ position = null, listener = null } = {}) {
    const ctx = this.ctx;
    const now = ctx.currentTime;

    let volume = 1.1;
    let pan = 0;
    if (position && listener) {
      const dx = position.x - listener.position.x;
      const dy = position.y - listener.position.y;
      const dz = position.z - listener.position.z;
      const dist = Math.hypot(dx, dy, dz);
      volume = 1.1 * Math.max(0.12, 1 / (1 + dist * 0.08));
      const rx = Math.cos(listener.yaw) * dx - Math.sin(listener.yaw) * dz;
      pan = Math.max(-1, Math.min(1, rx / 10));
    }

    const out = ctx.createGain();
    out.gain.value = volume;
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    out.connect(panner);
    panner.connect(this.dryBus);

    const wet = ctx.createGain();
    wet.gain.value = volume * 0.9;
    wet.connect(this.reverb);
    const tap = node => { node.connect(out); node.connect(wet); };

    // sub kick
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(120, now);
    sub.frequency.exponentialRampToValueAtTime(28, now + 0.45);
    const subG = ctx.createGain();
    subG.gain.setValueAtTime(0.0001, now);
    subG.gain.exponentialRampToValueAtTime(1.3, now + 0.006);
    subG.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    sub.connect(subG); tap(subG);
    sub.start(now); sub.stop(now + 0.6);

    // mid body
    const body = ctx.createBufferSource();
    body.buffer = this.longNoiseBuffer;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1900, now);
    lp.frequency.exponentialRampToValueAtTime(260, now + 0.7);
    const bodyG = ctx.createGain();
    bodyG.gain.setValueAtTime(0.0001, now);
    bodyG.gain.exponentialRampToValueAtTime(0.95, now + 0.012);
    bodyG.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
    body.connect(lp); lp.connect(bodyG); tap(bodyG);
    body.start(now); body.stop(now + 0.85);

    // sharp crack
    const crack = ctx.createBufferSource();
    crack.buffer = this.noiseBuffer;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1400;
    const crackG = ctx.createGain();
    crackG.gain.setValueAtTime(0.0001, now);
    crackG.gain.exponentialRampToValueAtTime(0.75, now + 0.001);
    crackG.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    crack.connect(hp); hp.connect(crackG); tap(crackG);
    crack.start(now); crack.stop(now + 0.2);
  }

  playFootstep() {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 220 + Math.random() * 60;
    bp.Q.value = 1.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.09 + Math.random() * 0.04, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    noise.connect(bp); bp.connect(g); g.connect(this.master);
    noise.start(now); noise.stop(now + 0.14);
  }

  playHeadshot() {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    // sharp double-click — distinctive from regular hitmarker
    [1900, 2600].forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = f;
      const g = ctx.createGain();
      const t = now + i * 0.03;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.32, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      osc.connect(g); g.connect(this.master);
      osc.start(t); osc.stop(t + 0.1);
    });
  }

  playWeaponSwitch() {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800;
    bp.Q.value = 8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.18, now + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    noise.connect(bp); bp.connect(g); g.connect(this.master);
    noise.start(now); noise.stop(now + 0.1);
  }

  playGunshotVariant(variant = 'rifle') {
    // variant pitches / envelopes of the gunshot synth
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const variants = {
      pistol: { subF: 140, subEnd: 50, bodyLP: 1100, crackHP: 2200, vol: 0.85, len: 0.22 },
      rifle: { subF: 95, subEnd: 38, bodyLP: 900, crackHP: 1800, vol: 0.95, len: 0.3 },
      shotgun: { subF: 70, subEnd: 26, bodyLP: 620, crackHP: 1400, vol: 1.1, len: 0.42 },
    };
    const cfg = variants[variant] || variants.rifle;

    const dry = ctx.createGain();
    dry.gain.value = cfg.vol;
    dry.connect(this.dryBus);
    const wet = ctx.createGain();
    wet.gain.value = cfg.vol * 0.6;
    wet.connect(this.reverb);
    const tap = node => { node.connect(dry); node.connect(wet); };

    const crack = ctx.createBufferSource();
    crack.buffer = this.noiseBuffer;
    const cHP = ctx.createBiquadFilter();
    cHP.type = 'highpass';
    cHP.frequency.value = cfg.crackHP;
    const cG = ctx.createGain();
    cG.gain.setValueAtTime(0.0001, now);
    cG.gain.exponentialRampToValueAtTime(1.0, now + 0.0008);
    cG.gain.exponentialRampToValueAtTime(0.0001, now + cfg.len * 0.25);
    crack.connect(cHP); cHP.connect(cG); tap(cG);
    crack.start(now); crack.stop(now + cfg.len);

    const body = ctx.createBufferSource();
    body.buffer = this.noiseBuffer;
    const bLP = ctx.createBiquadFilter();
    bLP.type = 'lowpass';
    bLP.frequency.setValueAtTime(cfg.bodyLP, now);
    bLP.frequency.exponentialRampToValueAtTime(160, now + cfg.len * 0.9);
    const bG = ctx.createGain();
    bG.gain.setValueAtTime(0.0001, now);
    bG.gain.exponentialRampToValueAtTime(0.85, now + 0.005);
    bG.gain.exponentialRampToValueAtTime(0.0001, now + cfg.len);
    body.connect(bLP); bLP.connect(bG); tap(bG);
    body.start(now); body.stop(now + cfg.len + 0.05);

    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(cfg.subF, now);
    sub.frequency.exponentialRampToValueAtTime(cfg.subEnd, now + cfg.len * 0.5);
    const sG = ctx.createGain();
    sG.gain.setValueAtTime(0.0001, now);
    sG.gain.exponentialRampToValueAtTime(0.75, now + 0.004);
    sG.gain.exponentialRampToValueAtTime(0.0001, now + cfg.len * 0.6);
    sub.connect(sG); tap(sG);
    sub.start(now); sub.stop(now + cfg.len);
  }

  playPickup() {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now + i * 0.06);
      g.gain.exponentialRampToValueAtTime(0.25, now + i * 0.06 + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.06 + 0.18);
      osc.connect(g); g.connect(this.master);
      osc.start(now + i * 0.06); osc.stop(now + i * 0.06 + 0.2);
    });
  }

  playDeath() {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.25, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 800;
    osc.connect(lp); lp.connect(g); g.connect(this.master);
    osc.start(now); osc.stop(now + 0.55);
  }
}
