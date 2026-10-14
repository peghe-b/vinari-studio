// THE END CARD, for this promo only (outside the studio EndCard, whose 26-character tagline and no-CTA rules would refuse it):
// the reveal's edge light runs once around the frame's border as a comet (born a short streak, never a bracket; its tail
// is one smooth gradient per straight run, never beaded pieces),
// then the card builds on pure white in a quick cascade: the mark and the wordmark in ink, the silent slogan „გზა ქართულად."
// with a soft cobalt stroke sweeping in under it, the two stores dealt in one after the other as ink pills (each with its
// glyph, white on ink, the same pills as the project's site), and three
// lines of honest small print (27 px, readable on a phone). The spoken call to action is the subtitle. It never freezes:
// the camera pushes in with depth (the mark nearest, the small print farthest), a light crosses the mark, and on the last
// sound the cobalt stroke glints and the mark nods. Everything sits above y 1160, and what lies below y 1110 ends left of
// x 881 (the Reels column), far above the subtitle band.
import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {mtav} from '../lib/format';
import {textWidth} from '../lib/measure';
import {C, F, rgba} from '../tokens';
import {clamp, E, ev, fr, lerp, prog, shot, sp} from './lib';

const W = 1080;
const H = 1920;
// the owner (2026-10-12): the app is on iPhone AND Android; the navigator is iPhone's for now, Android's soon.
// Three lines at most (the reviewers): where it runs, what is free, the honest caveat about the cameras.
const PRINT = ['ნავიგატორი iPhone-ზე, iOS 18+. Android-ზე მალე.', 'ის VINARI+-შია. უფასოდ: ორივე ხმა და ერთი მგზავრობა.', 'კამერების სია შეიძლება სრული არ იყოს.'];
const STORES = ['App Store', 'Google Play'];
// the store glyphs, monochrome on ink, the same 24 x 24 paths as the project's own site (web/creator.html, its store pills)
const GLYPH = [
  'M16.4 12.6c0-2.4 2-3.5 2-3.6-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.9-.9-3-.8-1.6 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.6s-2.5-1-2.5-3.7zM14.1 5.5c.6-.8 1.1-1.8 1-2.9-.9 0-2.1.6-2.7 1.4-.6.7-1.1 1.8-1 2.8 1 .1 2.1-.5 2.7-1.3z',
  'M5 3.2v17.6c0 .4.4.6.8.4L20 12.9c.4-.2.4-.7 0-.9L5.8 2.8c-.4-.2-.8 0-.8.4z',
];

// the rim's path: the frame's border inset 1 px, run clockwise from the top-left corner; corners at these arc lengths
const PERIM = 2 * (W + H);
const CORNERS = [0, W, W + H, 2 * W + H];
const RIM_W = 5;
const onBorder = (s: number): [number, number] => {
  const d = ((s % PERIM) + PERIM) % PERIM;
  if (d < W) return [clamp(d, 1, W - 1), 1];
  if (d < W + H) return [W - 1, clamp(d - W, 1, H - 1)];
  if (d < 2 * W + H) return [clamp(W - (d - W - H), 1, W - 1), H - 1];
  return [1, clamp(H - (d - 2 * W - H), 1, H - 1)];
};
/** the tail from arc a to arc b (a < b, unwrapped) cut into straight runs at the corners */
const runsOf = (a: number, b: number): Array<{s0: number; s1: number; c0: boolean; c1: boolean}> => {
  const cuts: number[] = [];
  for (let k = Math.floor(a / PERIM) - 1; k <= Math.ceil(b / PERIM) + 1; k++) {
    for (const c of CORNERS) {
      const v = k * PERIM + c;
      if (v > a + 0.01 && v < b - 0.01) cuts.push(v);
    }
  }
  cuts.sort((x, y) => x - y);
  const pts = [a, ...cuts, b];
  return pts.slice(0, -1).map((s0, i) => ({s0, s1: pts[i + 1], c0: i > 0, c1: i < pts.length - 2}));
};

// the layout (frame px at rest)
const MARK_W = 150;
const MARK_H = (MARK_W * 671) / 768;
const Y_MARK = 420;
const Y_WORD = 586;
const Y_SLOGAN = 712;
const Y_PILLS = 900;
const Y_PRINT = 1028;
const PRINT_LH = 40;
const ORIGIN = {x: 540, y: 800}; // the push's centre

export const End: React.FC = () => {
  const t = useCurrentFrame();
  const base = fr(shot('end').from);
  const end = fr(shot('end').to) - base;
  const hit = clamp(fr(ev('endHit')) - base, 0, end - 1); // the last sound

  // the rim: one comet once around the frame in 18 frames on a soft ease. Its tail is as long as its speed (never longer
  // than the way it has run), so it is born as a short streak, stretches at full speed and draws back into the head as it
  // eases home. Each straight run of the tail is ONE line with a gradient along it (no overlapping pieces, so no beads);
  // at a corner the incoming run reaches past the frame's edge and the outgoing run starts beyond its width (no overlap).
  const rimK = prog(t, 0, 18);
  const ran = E.sine(rimK) * PERIM;
  const speed = (PERIM * 0.5 * Math.PI * Math.sin(Math.PI * rimK)) / 18; // px per frame
  const head = ran + W / 2;
  const tail = Math.min(ran, 34 + 1.7 * speed, 900);
  const rimFade = 1 - clamp((t - 16) / 4);
  const rim: React.ReactNode[] = [];
  const rimDefs: React.ReactNode[] = [];
  if (t <= 20 && rimFade > 0 && tail > 1) {
    const a0 = head - tail;
    runsOf(a0, head).forEach((r, i) => {
      if (r.s1 - r.s0 < 0.5) return;
      const p0 = onBorder(r.s0 + 0.001);
      const p1 = onBorder(r.s1 - 0.001);
      const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1;
      const ux = (p1[0] - p0[0]) / len;
      const uy = (p1[1] - p0[1]) / len;
      const h = RIM_W / 2;
      const q0: [number, number] = r.c0 ? [p0[0] + ux * h, p0[1] + uy * h] : p0;
      const q1: [number, number] = r.c1 ? [p1[0] + ux * h, p1[1] + uy * h] : p1;
      const al0 = ((r.s0 - a0) / tail) * rimFade;
      const al1 = ((r.s1 - a0) / tail) * rimFade;
      const id = `endRim${i}`;
      rimDefs.push(
        <linearGradient key={id} id={id} gradientUnits="userSpaceOnUse" x1={p0[0]} y1={p0[1]} x2={p1[0]} y2={p1[1]}>
          <stop offset={0} stopColor={C.ink} stopOpacity={al0} />
          <stop offset={1} stopColor={C.ink} stopOpacity={al1} />
        </linearGradient>,
      );
      rim.push(<line key={id} x1={q0[0]} y1={q0[1]} x2={q1[0]} y2={q1[1]} stroke={`url(#${id})`} strokeWidth={RIM_W} strokeLinecap="butt" />);
    });
  }

  // the camera: a slow push with depth; each layer moves by its depth, so the card is never a still picture
  // (a steady part so the second half still moves, an eased part so it starts with the cascade)
  const camK = 0.35 * E.out2(clamp(t / end)) + 0.65 * clamp(t / end);
  const layer = (depth: number): React.CSSProperties => {
    const s = 1 + 0.08 * camK * depth;
    const dy = -18 * camK * depth;
    return {position: 'absolute', inset: 0, transform: `translate(0px, ${dy.toFixed(2)}px) scale(${s.toFixed(4)})`, transformOrigin: `${ORIGIN.x}px ${ORIGIN.y}px`};
  };

  // the cascade
  const markK = sp(t, -1, 130, 15);
  const wmK = sp(t, 4, 130, 18);
  const sloK = sp(t, 8, 130, 18);
  const pillK = STORES.map((_, i) => sp(t, 15 + i * 6, 190, 13));
  const prK = PRINT.map((_, i) => E.out(prog(t, 25 + i * 4, 12)));
  const nod = Math.sin(Math.PI * prog(t, hit, 8)) * (t >= hit ? 1 : 0); // done before the last frame
  const shine = prog(t, 30, 40);

  // the slogan and its cobalt stroke (sweeps in left to right at t 40; glints on the last sound)
  const slogan = mtav('გზა ქართულად.');
  let size = 110;
  const sw0 = textWidth(slogan, `700 ${size}px ${F.sans}`);
  if (sw0 > 860) size = Math.floor((size * 860) / sw0);
  const sw = Math.min(860, textWidth(slogan, `700 ${size}px ${F.sans}`));
  const sweep = E.inOut(prog(t, 38, 16));
  const lineY = Y_SLOGAN + size * 0.98 + 10;
  const lineX0 = 540 - sw / 2 + 6;
  const lineW = (sw - 12) * sweep;
  const glint = prog(t, hit - 2, 10);

  // the small print: one size for all three lines, the longest fits 900 px
  let ps = 27;
  const widest = Math.max(...PRINT.map((l) => textWidth(mtav(l), `500 ${ps}px ${F.sans}`)));
  if (widest > 900) ps = Math.floor((ps * 900) / widest);

  return (
    <div style={{position: 'absolute', inset: 0, background: C.surface, overflow: 'hidden'}}>
      {/* the mark and the wordmark (nearest) */}
      <div style={layer(1)}>
        <div
          style={{
            position: 'absolute',
            left: 540 - MARK_W / 2,
            top: Y_MARK + (1 - markK) * 34,
            width: MARK_W,
            height: MARK_H,
            opacity: clamp(markK * 1.6),
            transform: `scale(${(lerp(0.84, 1, markK) * (1 + 0.035 * nod)).toFixed(4)})`,
            transformOrigin: '50% 60%',
          }}
        >
          <Img src={staticFile('brand/mark.svg')} style={{width: MARK_W, height: MARK_H, filter: 'brightness(0) invert(0.045)'}} />
          {shine > 0 && shine < 1 ? (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                WebkitMaskImage: `url(${staticFile('brand/mark.svg')})`,
                WebkitMaskSize: '100% 100%',
                maskImage: `url(${staticFile('brand/mark.svg')})`,
                maskSize: '100% 100%',
                background: `linear-gradient(110deg, ${rgba(C.surface, 0)} ${lerp(-40, 120, shine) - 20}%, ${rgba(C.surface, 0.55)} ${lerp(-40, 120, shine)}%, ${rgba(C.surface, 0)} ${lerp(-40, 120, shine) + 20}%)`,
              }}
            />
          ) : null}
        </div>
        <Img
          src={staticFile('brand/wordmark.svg')}
          style={{position: 'absolute', left: 540 - 125, top: Y_WORD + (1 - wmK) * 24, width: 250, height: (250 * 68) / 267, filter: 'brightness(0) invert(0.045)', opacity: clamp(wmK * 1.4)}}
        />
      </div>

      {/* the slogan and its cobalt stroke */}
      <div style={layer(0.8)}>
        <div style={{position: 'absolute', left: 0, right: 0, top: Y_SLOGAN + (1 - sloK) * 26, textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: size, lineHeight: 1, color: C.ink, opacity: clamp(sloK * 1.4), whiteSpace: 'nowrap'}}>
          {slogan}
        </div>
        {lineW > 1 ? (
          <svg width={W} height={H} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
            <defs>
              <filter id="endSoft" x="-20%" y="-300%" width="140%" height="700%">
                <feGaussianBlur stdDeviation={9} />
              </filter>
              <linearGradient id="endGlint" gradientUnits="userSpaceOnUse" x1={lineX0} y1={0} x2={lineX0 + sw} y2={0}>
                <stop offset={clamp(glint - 0.12)} stopColor={C.surface} stopOpacity={0} />
                <stop offset={clamp(glint)} stopColor={C.surface} stopOpacity={0.8} />
                <stop offset={clamp(glint + 0.12)} stopColor={C.surface} stopOpacity={0} />
              </linearGradient>
            </defs>
            {/* the soft glow under the stroke, then the stroke itself (a rounded marker line), its head brightest */}
            <rect x={lineX0} y={lineY - 6} width={lineW} height={12} rx={6} fill={C.accA} opacity={0.32 + 0.25 * Math.sin(Math.PI * glint)} filter="url(#endSoft)" />
            <rect x={lineX0} y={lineY - 4} width={lineW} height={8} rx={4} fill={C.accA} />
            {sweep < 1 ? <circle cx={lineX0 + lineW} cy={lineY} r={9} fill={C.accA} opacity={0.35 * (1 - sweep)} filter="url(#endSoft)" /> : null}
            {glint > 0 && glint < 1 ? <rect x={lineX0} y={lineY - 4} width={lineW} height={8} rx={4} fill="url(#endGlint)" /> : null}
          </svg>
        ) : null}
      </div>

      {/* where to get it: both stores, dealt in one after the other */}
      <div style={layer(0.6)}>
        <div style={{position: 'absolute', left: 0, right: 0, top: Y_PILLS, display: 'flex', justifyContent: 'center', gap: 24}}>
          {STORES.map((st, i) => {
            const k = pillK[i];
            return (
              <div
                key={st}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '15px 34px 17px 28px',
                  borderRadius: 999,
                  background: C.ink,
                  boxShadow: `0 ${(10 * k).toFixed(1)}px ${(24 * k).toFixed(1)}px ${rgba(C.shade, 0.16 * clamp(k))}`,
                  fontFamily: F.sans,
                  fontWeight: 600,
                  fontSize: 36,
                  lineHeight: 1.1,
                  color: C.onInk,
                  whiteSpace: 'nowrap',
                  opacity: clamp(k * 2),
                  transform: `translateY(${((1 - k) * 46).toFixed(2)}px) scale(${lerp(0.78, 1, k).toFixed(4)})`,
                }}
              >
                <svg width={34} height={34} viewBox="0 0 24 24" style={{display: 'block', flex: 'none', marginTop: i === 0 ? -4 : 0}}>
                  <path d={GLYPH[i]} fill={C.onInk} />
                </svg>
                {st}
              </div>
            );
          })}
        </div>
      </div>

      {/* the small print (farthest) */}
      <div style={layer(0.45)}>
        <div style={{position: 'absolute', left: 90, width: 900, top: Y_PRINT, textAlign: 'center', fontFamily: F.sans, fontWeight: 500, fontSize: ps, lineHeight: `${PRINT_LH}px`, color: C.ink2}}>
          {PRINT.map((l, i) => (
            <div key={i} style={{whiteSpace: 'nowrap', opacity: prK[i], transform: `translateY(${((1 - prK[i]) * 14).toFixed(2)}px)`}}>
              {mtav(l)}
            </div>
          ))}
        </div>
      </div>

      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        <defs>{rimDefs}</defs>
        {rim}
      </svg>
    </div>
  );
};
