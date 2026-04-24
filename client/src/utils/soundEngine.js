// soundEngine.js — Pro-Level Realistic Audio for Kurukshetra
// Physical modeling + formant synthesis + waveshaping

let audioCtx = null;
let masterGain = null;
let musicPlaying = false;
let musicNodes = [];
let musicTimers = [];

function ctx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.8;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
function master() { ctx(); return masterGain; }

// Distortion curve for gritty warmth
function makeDistCurve(amount = 50) {
  const n = 44100, curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((3 + amount) * x * 20 * (Math.PI / 180)) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}

// Noise buffer (cached)
let _noiseBuf = null;
function noiseBuf() {
  if (_noiseBuf) return _noiseBuf;
  const c = ctx(), len = c.sampleRate * 2;
  _noiseBuf = c.createBuffer(1, len, c.sampleRate);
  const d = _noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return _noiseBuf;
}

function noise(dur, vol, lo, hi, t0) {
  const c = ctx(), src = c.createBufferSource();
  src.buffer = noiseBuf();
  const bp = c.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=(lo+hi)/2; bp.Q.value=0.7;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(bp); bp.connect(g); g.connect(master());
  src.start(t0); src.stop(t0 + dur + 0.05);
}

function tone(freq, dur, type, vol, t0, freqEnd) {
  const c = ctx(), o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g); g.connect(master());
  o.start(t0); o.stop(t0 + dur + 0.05);
}

// ============ REALISTIC EFFECTS ============

export function playSwordHit() {
  const t = ctx().currentTime;
  // IMPACT: broadband transient burst
  noise(0.035, 0.4, 800, 6000, t);
  // BLADE RING: inharmonic metallic partials
  [1870, 2950, 4730, 6100].forEach((f,i) => {
    tone(f*(1+Math.random()*0.03), 0.15-i*0.025, 'sine', 0.08-i*0.015, t+0.005);
  });
  // LOW BODY: pommel/hilt thud
  tone(140, 0.08, 'sine', 0.25, t);
  tone(85, 0.12, 'sine', 0.18, t);
  // SCRAPE overtone
  noise(0.05, 0.1, 3000, 9000, t+0.01);
}

export function playArrowShoot() {
  const t = ctx().currentTime;
  // STRING RELEASE: sharp filtered snap
  noise(0.025, 0.25, 1500, 5000, t);
  // Twang: pitch drops fast like a plucked string
  tone(1100, 0.06, 'triangle', 0.12, t, 200);
  tone(550, 0.08, 'triangle', 0.06, t+0.01, 120);
  // SHAFT WHOOSH: wind noise sweeping
  noise(0.12, 0.08, 1000, 4000, t+0.03);
  // HIT thunk (delayed ~100ms)
  tone(95, 0.07, 'sine', 0.15, t+0.1);
  noise(0.03, 0.1, 400, 1800, t+0.1);
}

export function playHorseSound() {
  const c = ctx(), t = c.currentTime;
  // HOOVES: 4 impacts with click+thud
  [0, 0.1, 0.2, 0.32].forEach((d,i) => {
    tone(70+i*10, 0.07, 'sine', 0.22, t+d);
    noise(0.02, 0.18, 2000, 6000, t+d); // hoof click
    noise(0.05, 0.08, 100, 500, t+d+0.01); // dirt spray
  });
  // WHINNY: formant-modeled vocal (two resonant bands)
  const o1 = c.createOscillator(), o2 = c.createOscillator();
  const f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter();
  const g = c.createGain();
  o1.type = 'sawtooth'; o2.type = 'sawtooth';
  o1.frequency.setValueAtTime(250, t+0.15);
  o1.frequency.linearRampToValueAtTime(700, t+0.35);
  o1.frequency.linearRampToValueAtTime(950, t+0.5);
  o1.frequency.exponentialRampToValueAtTime(180, t+0.75);
  o2.frequency.setValueAtTime(253, t+0.15);
  o2.frequency.linearRampToValueAtTime(710, t+0.35);
  o2.frequency.exponentialRampToValueAtTime(185, t+0.75);
  f1.type='bandpass'; f1.frequency.value=700; f1.Q.value=5;
  f2.type='bandpass'; f2.frequency.value=1400; f2.Q.value=3;
  // Waveshaper for vocal grit
  const ws = c.createWaveShaper(); ws.curve = makeDistCurve(30);
  g.gain.setValueAtTime(0, t+0.15);
  g.gain.linearRampToValueAtTime(0.08, t+0.25);
  g.gain.setValueAtTime(0.08, t+0.5);
  g.gain.exponentialRampToValueAtTime(0.001, t+0.75);
  o1.connect(ws); o2.connect(ws); ws.connect(f1); ws.connect(f2);
  f1.connect(g); f2.connect(g); g.connect(master());
  o1.start(t+0.15); o2.start(t+0.15);
  o1.stop(t+0.8); o2.stop(t+0.8);
  // Breath noise layer
  noise(0.4, 0.03, 600, 2000, t+0.2);
}

export function playElephantStomp() {
  const c = ctx(), t = c.currentTime;
  // GROUND IMPACT: sub-bass shockwave
  tone(45, 0.6, 'sine', 0.5, t, 15);
  tone(30, 0.8, 'sine', 0.35, t+0.02, 10);
  // Impact transient crack
  noise(0.06, 0.35, 200, 1200, t);
  // RUMBLE: earth shaking
  const rumSrc = c.createBufferSource(); rumSrc.buffer = noiseBuf();
  const rumF = c.createBiquadFilter(); rumF.type='lowpass'; rumF.frequency.value=120;
  const rumG = c.createGain();
  rumG.gain.setValueAtTime(0.25, t+0.05);
  rumG.gain.exponentialRampToValueAtTime(0.001, t+0.8);
  rumSrc.connect(rumF); rumF.connect(rumG); rumG.connect(master());
  rumSrc.start(t+0.05); rumSrc.stop(t+0.9);
  // TRUMPET: elephant call with formants + distortion
  const tr1 = c.createOscillator(), tr2 = c.createOscillator();
  const tF1 = c.createBiquadFilter(), tF2 = c.createBiquadFilter();
  const tWs = c.createWaveShaper(); tWs.curve = makeDistCurve(40);
  const tG = c.createGain();
  tr1.type='sawtooth'; tr2.type='square';
  tr1.frequency.setValueAtTime(180, t+0.2);
  tr1.frequency.linearRampToValueAtTime(500, t+0.4);
  tr1.frequency.linearRampToValueAtTime(700, t+0.55);
  tr1.frequency.exponentialRampToValueAtTime(120, t+0.95);
  tr2.frequency.setValueAtTime(184, t+0.2);
  tr2.frequency.linearRampToValueAtTime(507, t+0.4);
  tr2.frequency.exponentialRampToValueAtTime(125, t+0.95);
  tF1.type='bandpass'; tF1.frequency.value=450; tF1.Q.value=4;
  tF2.type='peaking'; tF2.frequency.value=900; tF2.Q.value=2; tF2.gain.value=6;
  tG.gain.setValueAtTime(0, t+0.2);
  tG.gain.linearRampToValueAtTime(0.12, t+0.35);
  tG.gain.setValueAtTime(0.12, t+0.55);
  tG.gain.exponentialRampToValueAtTime(0.001, t+0.95);
  tr1.connect(tWs); tr2.connect(tWs);
  tWs.connect(tF1); tWs.connect(tF2);
  tF1.connect(tG); tF2.connect(tG); tG.connect(master());
  tr1.start(t+0.2); tr2.start(t+0.2);
  tr1.stop(t+1.0); tr2.stop(t+1.0);
  // Debris scatter
  noise(0.25, 0.06, 1500, 5000, t+0.15);
}

export function playFreezeSound() {
  const c = ctx(), t = c.currentTime;
  // SHOCKWAVE: massive low sweep
  tone(250, 1.5, 'sine', 0.3, t, 20);
  // ICE CRACK: sharp transient
  noise(0.04, 0.3, 3000, 10000, t+0.05);
  noise(0.03, 0.2, 5000, 12000, t+0.1);
  // CRYSTAL CHIMES: high bell-like tones in cascade
  [5200, 4100, 3300, 2600, 2000, 1500].forEach((f,i) => {
    const d = i*0.09;
    tone(f, 0.5+i*0.06, 'sine', 0.05, t+d+0.08);
    tone(f*1.5, 0.3, 'sine', 0.015, t+d+0.1); // octave shimmer
  });
  // FROZEN AIR: high filtered noise
  noise(1.0, 0.06, 5000, 14000, t+0.15);
  // LOW DRONE SWELL
  tone(80, 1.8, 'triangle', 0.06, t+0.3, 60);
  tone(120, 1.5, 'triangle', 0.04, t+0.4, 80);
}

export function playDeploy() {
  const t = ctx().currentTime;
  // Armor clank
  noise(0.03, 0.15, 2500, 7000, t);
  tone(1800, 0.03, 'square', 0.06, t);
  // Ground stomp
  tone(100, 0.1, 'sine', 0.2, t+0.03);
  tone(65, 0.12, 'sine', 0.15, t+0.04);
  noise(0.06, 0.08, 200, 800, t+0.03);
  // Voice bark
  noise(0.08, 0.04, 500, 1800, t+0.06);
}

export function playUnitDeath() {
  const t = ctx().currentTime;
  // Body impact
  tone(55, 0.2, 'sine', 0.3, t);
  tone(38, 0.3, 'sine', 0.2, t+0.02);
  noise(0.08, 0.15, 300, 1500, t);
  // Armor clatter
  [1600, 2800, 4200].forEach((f,i) => {
    tone(f, 0.04, 'square', 0.03, t+0.06+i*0.04);
  });
  noise(0.12, 0.08, 1500, 5000, t+0.05);
  // Low rumble decay
  tone(40, 0.5, 'sine', 0.1, t+0.08, 20);
}

export function playCardSelect() {
  const t = ctx().currentTime;
  tone(900, 0.04, 'sine', 0.08, t);
  tone(1350, 0.04, 'sine', 0.06, t+0.025);
  noise(0.015, 0.04, 4000, 10000, t);
}

export function playVictory() {
  const c = ctx(), t = c.currentTime;
  [[262,0],[330,0.18],[392,0.36],[523,0.54]].forEach(([f,d]) => {
    const o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain();
    o.type='triangle'; o2.type='sawtooth';
    o.frequency.value=f; o2.frequency.value=f*1.003;
    g.gain.setValueAtTime(0,t+d); g.gain.linearRampToValueAtTime(0.12,t+d+0.05);
    g.gain.setValueAtTime(0.12,t+d+0.25); g.gain.exponentialRampToValueAtTime(0.001,t+d+(d===0.54?0.9:0.35));
    o.connect(g); o2.connect(g); g.connect(master());
    o.start(t+d); o.stop(t+d+1); o2.start(t+d); o2.stop(t+d+1);
  });
  [0,0.18,0.36,0.54].forEach(d => { tone(80,0.08,'sine',0.18,t+d); noise(0.03,0.08,500,1500,t+d); });
}

export function playDefeat() {
  const t = ctx().currentTime;
  [440,392,330,262,220].forEach((f,i) => {
    tone(f, 0.6, 'triangle', 0.08, t+i*0.28);
    tone(f*0.5, 0.7, 'sine', 0.04, t+i*0.28);
  });
  tone(110, 2.0, 'sine', 0.03, t+0.5);
}

// ============ BATTLE MUSIC ============

export function startBattleMusic() {
  if (musicPlaying) return;
  musicPlaying = true;
  const c = ctx();

  // Tanpura drone
  [[130.81,0.035],[196,0.025],[261.63,0.012]].forEach(([f,v]) => {
    const o1=c.createOscillator(), o2=c.createOscillator(), g=c.createGain();
    o1.type='sine'; o2.type='sine';
    o1.frequency.value=f; o2.frequency.value=f*1.002;
    g.gain.value=v;
    o1.connect(g); o2.connect(g); g.connect(master());
    o1.start(); o2.start();
    musicNodes.push(o1,o2,g);
  });

  const bpm=95, beat=(60/bpm)*1000;
  const pat = [[0,50,0.25,0.16],[2,100,0.1,0.07],[3,150,0.06,0.04],[4,50,0.22,0.16],[5,55,0.18,0.13],[6,100,0.1,0.07],[7,160,0.05,0.03]];

  function drum(freq,vol,dur) {
    if(!musicPlaying)return;
    const t=ctx().currentTime;
    tone(freq,dur,'sine',vol,t,freq*0.4);
    noise(0.02,vol*0.15,freq>100?2000:500,freq>100?4000:1200,t);
  }

  function loopD() {
    if(!musicPlaying)return;
    pat.forEach(p => { const id=setTimeout(()=>{if(musicPlaying)drum(p[1],p[2],p[3]);},p[0]*(beat/2)); musicTimers.push(id); });
    musicTimers.push(setTimeout(loopD,beat*4));
  }
  loopD();

  const mel=[[261.63,0.8],[293.66,0.4],[329.63,0.6],[349.23,0.8],[392,1],[349.23,0.4],[329.63,0.4],[261.63,1.2]];
  function note(freq,dur) {
    if(!musicPlaying)return;
    const c2=ctx(),t=c2.currentTime;
    const o=c2.createOscillator(),o2=c2.createOscillator(),g=c2.createGain();
    o.type='triangle'; o2.type='sine';
    o.frequency.value=freq; o2.frequency.value=freq*2.01;
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.05,t+0.08);
    g.gain.setValueAtTime(0.05,t+dur*0.6); g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    o.connect(g); o2.connect(g); g.connect(master());
    o.start(t); o2.start(t); o.stop(t+dur+0.1); o2.stop(t+dur+0.1);
  }
  function loopM() {
    if(!musicPlaying)return;
    let d=0;
    mel.forEach(n => { musicTimers.push(setTimeout(()=>{if(musicPlaying)note(n[0],n[1]);},d)); d+=n[1]*1000; });
    musicTimers.push(setTimeout(loopM,d+2000));
  }
  musicTimers.push(setTimeout(()=>{if(musicPlaying)loopM();},beat*4));
}

export function stopBattleMusic() {
  musicPlaying=false;
  musicTimers.forEach(t=>clearTimeout(t)); musicTimers=[];
  musicNodes.forEach(n=>{try{if(n.stop)n.stop();if(n.disconnect)n.disconnect();}catch(e){}}); musicNodes=[];
}

export function setMasterVolume(v) { if(masterGain) masterGain.gain.value=Math.max(0,Math.min(1,v)); }
export function initAudio() { ctx(); }
