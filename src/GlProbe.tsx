import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
import {glEngine, maskStyle, maskUrl, useDecoded} from './lib/glmask';
import {GL_IDS, GL_RULES, GL_TRANSITIONS} from './lib/gltrans.mjs';
import {P2_INK} from './lib/p2.mjs';

// The GL transitions' proof (src/lib/gltrans.mjs, src/lib/glmask.ts), rendered by tools/gltrans-stills.mjs on the Mac and in
// the cloud (.github/workflows/p2-check.yml):
//   gl-probe-diff  one frame a transition at p 0.5: the WebGL mask (left) beside the CPU twin (right), the rims below, and a
//                  status strip (green: WebGL 2 drew it, red: the CPU fallback did) with the renderer's name;
//                  tools/ci/glprobe.py compares the halves
//   gl-probe       five frames a transition (p 0.2 .. 0.8): a greyscale photo going into a paper card through the real
//                  masks and rim, the way a film's shots take them
export const PROBE_P = [0.2, 0.35, 0.5, 0.65, 0.8];
export const PROBE_DIFF_H = 2000;

export const GlProbeDiff: React.FC = () => {
  const f = useCurrentFrame();
  const type = GL_IDS[Math.min(GL_IDS.length - 1, f)];
  const opts = {dir: 1, seed: 4242};
  const eng = glEngine();
  const urls = [maskUrl(type, 0.5, 0, opts), maskUrl(type, 0.5, 0, opts, 'cpu'), maskUrl(type, 0.5, 2, opts), maskUrl(type, 0.5, 2, opts, 'cpu')];
  useDecoded(urls);
  const box = (url: string, x: number, y: number) => <img key={`${x},${y}`} src={url} style={{position: 'absolute', left: x, top: y, width: 540, height: 960}} />;
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {box(urls[0], 0, 0)}
      {box(urls[1], 540, 0)}
      {box(urls[2], 0, 960)}
      {box(urls[3], 540, 960)}
      <div style={{position: 'absolute', left: 0, top: 1920, width: 1080, height: 80, backgroundColor: eng.kind === 'webgl2' ? 'rgb(0,200,0)' : 'rgb(220,0,0)', color: '#000', fontFamily: 'monospace', fontSize: 24, lineHeight: '80px', paddingLeft: 100, whiteSpace: 'nowrap', overflow: 'hidden'}}>
        {type} {eng.kind === 'webgl2' ? `WEBGL2 ${eng.renderer}` : `CPU ${eng.why}`}
      </div>
    </AbsoluteFill>
  );
};

/** the incoming picture of the show: a paper card with a number and a hundred dots (a kit-like data frame) */
const PaperCard: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: P2_INK.paper}}>
    <div style={{position: 'absolute', left: 120, top: 420, width: 840, height: 980, backgroundColor: P2_INK.card, borderRadius: 36, boxShadow: '0 2px 0 rgba(0,0,0,0.06)'}}>
      <div style={{position: 'absolute', left: 64, top: 40, fontFamily: 'Helvetica, Arial, sans-serif', fontWeight: 800, fontSize: 260, color: P2_INK.ink, letterSpacing: -8}}>32</div>
      <svg style={{position: 'absolute', left: 64, top: 380}} width={712} height={560} viewBox="0 0 712 560">
        {Array.from({length: 100}, (_, i) => (
          <circle key={i} cx={36 + (i % 10) * 71} cy={30 + Math.floor(i / 10) * 55} r={20} fill={i < 32 ? '#1F47B6' : 'none'} stroke={i < 32 ? 'none' : P2_INK.ink2} strokeWidth={3} />
        ))}
      </svg>
    </div>
  </AbsoluteFill>
);

export const GlProbe: React.FC = () => {
  const f = useCurrentFrame();
  const type = GL_IDS[Math.min(GL_IDS.length - 1, Math.floor(f / PROBE_P.length))];
  const p = PROBE_P[f % PROBE_P.length];
  const opts = {dir: 1, seed: 4242};
  const rimOn = GL_TRANSITIONS[type].rim;
  const urls = [maskUrl(type, p, 1, opts), maskUrl(type, p, 0, opts), rimOn ? maskUrl(type, p, 2, opts) : null];
  useDecoded(urls);
  return (
    <AbsoluteFill style={{backgroundColor: P2_INK.paper}}>
      <AbsoluteFill style={maskStyle(urls[0] as string)}>
        <AbsoluteFill style={{transform: GL_TRANSITIONS[type].zoom ? `scale(${1 + 0.06 * p})` : undefined, transformOrigin: '540px 885px'}}>
          <Img src={staticFile('photos/tbilisi-street-night.jpg')} style={{width: 1080, height: 1920, objectFit: 'cover', filter: 'grayscale(1)'}} />
        </AbsoluteFill>
      </AbsoluteFill>
      <AbsoluteFill style={maskStyle(urls[1] as string)}>
        <AbsoluteFill style={{transform: GL_TRANSITIONS[type].zoom ? `scale(${1.05 - 0.05 * p})` : undefined, transformOrigin: '540px 885px'}}>
          <PaperCard />
        </AbsoluteFill>
      </AbsoluteFill>
      {urls[2] ? <AbsoluteFill style={{...maskStyle(urls[2]), backgroundColor: P2_INK.ink, opacity: GL_RULES.rimInk}} /> : null}
      <div style={{position: 'absolute', left: 40, top: 60, padding: '10px 18px', backgroundColor: '#fff', fontFamily: 'monospace', fontSize: 30, color: '#000'}}>
        {type} p {p.toFixed(2)}
      </div>
    </AbsoluteFill>
  );
};
