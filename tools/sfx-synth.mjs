// Zero-dependency offline SFX synth test: writes 16-bit mono WAVs.
import fs from 'node:fs';
import { createRequire } from 'node:module';
const R = 48000;
const wav = (name, x) => { // float [-1,1] -> PCM16 WAV
  const b = Buffer.alloc(44 + x.length * 2);
  b.write('RIFF',0); b.writeUInt32LE(36 + x.length*2,4); b.write('WAVEfmt ',8); b.writeUInt32LE(16,16);
  b.writeUInt16LE(1,20); b.writeUInt16LE(1,22); b.writeUInt32LE(R,24); b.writeUInt32LE(R*2,28); b.writeUInt16LE(2,32); b.writeUInt16LE(16,34);
  b.write('data',36); b.writeUInt32LE(x.length*2,40);
  x.forEach((v,i)=> b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(v*32767))), 44+i*2));
  fs.writeFileSync(name, b);
};
let seed = 1; const rnd = () => ((seed = (seed*16807) % 2147483647) / 2147483647)*2-1;
const norm = (x, peak=0.89) => { const m = Math.max(...x.map(Math.abs)) || 1; return x.map(v=>v/m*peak); };
// state-variable bandpass with time-varying cutoff
const svfBP = (x, fcAt, q=4) => { let lp=0,bp=0; return x.map((v,i)=>{ const f=2*Math.sin(Math.PI*fcAt(i/R)/R); const hp=v-lp-bp/q; bp+=f*hp; lp+=f*bp; return bp; }); };
const N = s => Math.round(s*R);
// 1) whoosh: noise through bandpass sweeping 300->4000->600 Hz, bell envelope
{ const d=0.7, n=N(d); const x=Array.from({length:n},rnd);
  const y=svfBP(x, t=>{const p=t/d; return 300+3700*Math.sin(Math.PI*Math.min(1,p*1.15))**2;}, 3);
  wav('whoosh.wav', norm(y.map((v,i)=>v*Math.sin(Math.PI*i/n)**2))); }
// 2) tick: 7 ms 2.2 kHz decaying sine + short noise transient
{ const n=N(0.03); wav('tick.wav', norm(Array.from({length:n},(_,i)=>{const t=i/R; return Math.sin(2*Math.PI*2200*t)*Math.exp(-t/0.004)+0.3*rnd()*Math.exp(-t/0.0008);}),0.6)); }
// 3) bass hit / sub drop: sine 110->38 Hz pitch glide, soft clip, 0.9 s
{ const n=N(0.9); let ph=0; wav('bass_hit.wav', norm(Array.from({length:n},(_,i)=>{const t=i/R; const f=38+72*Math.exp(-t/0.06); ph+=2*Math.PI*f/R; return Math.tanh(2.2*Math.sin(ph))*Math.exp(-t/0.35);}))); }
// 4) riser: noise + rising bandpass 200->6000 Hz over 1.6 s, crescendo
{ const d=1.6,n=N(d); const x=Array.from({length:n},rnd); const y=svfBP(x,t=>200*Math.pow(30,t/d),6);
  wav('riser.wav', norm(y.map((v,i)=>v*Math.pow(i/n,2)))); }
// 5) ZzFX in Node (needs an AudioContext stub because the module builds one at import)
globalThis.AudioContext = class { constructor(){ this.sampleRate = 44100; } };
const { ZZFX } = await import('./zzfx.mjs');
ZZFX.sampleRate = 44100;
const zz = ZZFX.buildSamples(...[1.1,.05,1123,.01,.02,.05,1,1.9,,,,,,,,,.04,.6,.01]); // a UI blip
wav('zzfx_blip_44k.wav', zz); // note: written at 48k header here only for the test
// 6) jsfxr (CommonJS) preset generator
const require = createRequire(import.meta.url);
const { sfxr } = require('jsfxr');
const w = sfxr.toWave(sfxr.generate('click'));
fs.writeFileSync('jsfxr_click.wav', Buffer.from(w.wav));
console.log('ok', fs.readdirSync('.').filter(f=>f.endsWith('.wav')));
