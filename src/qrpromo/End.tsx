// 10 the store and the end card (v3, the owner, 2026-10-14: "show that VINARI is on the store, put the App Store screenshot
// in a mockup; App Store and Google Play buttons like the previous video; say something better at the end").
// The store: the REAL App Store page (public/screens/26-appstore-page.jpg, 585 x 1266) in the studio's whole 3D iPhone,
// shown at about 0.7 of its own pixels so it stays crisp; it rises on the white (already moving on the cut: never a bare
// white frame after the dark room), the cobalt band finds its header, the header lifts out a little (Lift, at about its
// own size) and „Get" is tapped; on the voice's „ეპ სთორსა" and „გუგლ ფლეიზეა" the two store pills (the navigator
// promo's ending: ink pills, the glyphs of the project's site) are dealt in under the phone.
// The end card: the phone sinks away, the pills glide up into the card, the mark and the wordmark build, and the new
// last line is said and written word by word, „ნომერიც / შენთან რჩება / და ნერვებიც." (the card is the line: no
// subtitle), a cobalt stroke sweeping in under its turn, then the quiet note „QR ბარათი · VINARI+". It never freezes: a
// slow push with depth (the mark nearest, the note farthest), a light crosses the mark on the last sound. Everything of
// the card sits above y 1110; the store phase's pills end above the subtitle band.
import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {mtav} from '../lib/format';
import {textWidth} from '../lib/measure';
import {C, F, rgba} from '../tokens';
import {clamp, E, ev, evs, fr, lerp, prog, shot, sp} from './lib';
import {atFoot, float, flatRect, Lift, Phone3, TapRing, type Band, type Region} from './kit/phone3d';

const W = 1080;
const H = 1920;
const STORE = '26-appstore-page';
// the App Store page, measured on the 585 x 1266 capture: the header (icon, name, „Get") and the „Get" button's centre
const HEAD: Region = {x0: 18 / 585, y0: 328 / 1266, x1: 567 / 585, y1: 542 / 1266};
const GET = {u: 286 / 585, v: 498 / 1266};
// the store pills: the navigator promo's ending, the same glyphs (24 x 24, the project's site's store pills)
const STORES = ['App Store', 'Google Play'];
const GLYPH = [
  'M16.4 12.6c0-2.4 2-3.5 2-3.6-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.9-.9-3-.8-1.6 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.6s-2.5-1-2.5-3.7zM14.1 5.5c.6-.8 1.1-1.8 1-2.9-.9 0-2.1.6-2.7 1.4-.6.7-1.1 1.8-1 2.8 1 .1 2.1-.5 2.7-1.3z',
  'M5 3.2v17.6c0 .4.4.6.8.4L20 12.9c.4-.2.4-.7 0-.9L5.8 2.8c-.4-.2-.8 0-.8.4z',
];

// the phone in the store phase (display px; the capture is 585 px wide: never shown bigger than it)
const PHONE_W = 420;
const STORE_FOOT = 1236;
const Y_STORE_PILLS = 1268;
// the end card's layout (frame px at rest)
const MARK_W = 140;
const MARK_H = (MARK_W * 671) / 768;
const Y_MARK = 318;
const Y_WORD = 462;
const TAG_TOP = 572;
const ORIGIN = {x: 540, y: 780};

/** the store pills, the navigator promo's look */
const Pill: React.FC<{i: number; k: number}> = ({i, k}) => (
  <div
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
    {STORES[i]}
  </div>
);

export const End: React.FC = () => {
  const t = useCurrentFrame();
  const base = fr(shot('end').from);
  const end = fr(shot('end').to) - base;
  const L = (n: string) => fr(ev(n)) - base;
  const bandAt = L('storeBand');
  const getAt = L('getTap');
  const p1 = L('pill1');
  const p2 = L('pill2');
  const cardAt = L('card');
  const markAt = L('mark');
  const tags = evs('tag').map((x) => fr(x) - base);
  const hit = clamp(L('endHit'), 0, end - 1);

  // ---- the store phase: the phone ------------------------------------------------------------------------------------
  const enter = sp(t + 8, 0, 110, 21);
  const fl = float(t);
  const push = clamp(t / Math.max(1, cardAt));
  const sink = E.in(prog(t, cardAt, 11));
  const phoneA = 1 - E.inOut(prog(t, cardAt, 6));
  const w = PHONE_W * lerp(0.9, 1, enter) * (1 + 0.05 * push) * (1 - 0.1 * sink);
  let pose = atFoot({x: 540, w, yaw: lerp(14, -3, enter) + 2 * sink + fl.roll, pitch: lerp(9, 3, enter) + fl.pitch + 6 * sink, roll: fl.roll}, STORE_FOOT + 40 * (1 - enter) + 300 * sink);
  pose = {...pose, y: pose.y + fl.bob};
  // the band on the header, a light veil on the rest; the header lifts (about its own size), „Get" is tapped, it settles
  const liftK = sp(t, bandAt, 150, 20) * (1 - E.inOut(prog(t, getAt + 12, 12)));
  // the band leads the header out, and is gone while the header floats (it would show as a cobalt line under it)
  const bandA = prog(t, bandAt - 6, 6) * (1 - clamp(liftK * 3)) * (1 - prog(t, getAt + 6, 4));
  const veil = 0.22 * prog(t, bandAt - 6, 8) * (1 - prog(t, getAt + 16, 10));
  const band: Band = {x: HEAD.x0 + 0.006, y: HEAD.y0 + 0.004, w: HEAD.x1 - HEAD.x0 - 0.012, h: HEAD.y1 - HEAD.y0 - 0.008, a: bandA};
  // v3.1 (the art director: the lifted slab was wider than the phone and showed the original's icon edge and a second
  // „Get" under it): it lifts IN PLACE, toward the lens, 7 % bigger about its own centre, so it always covers its source
  const hf = flatRect(pose, HEAD);
  const HS = 1.07;
  const headTo = {x: hf.x - (hf.w * (HS - 1)) / 2, y: hf.y - (hf.h * (HS - 1)) / 2, w: hf.w * HS, h: hf.h * HS};

  // ---- the pills: dealt in under the phone on their names, then up into the card ------------------------------------------
  const pillK = [sp(t, p1, 190, 13), sp(t, p2, 190, 13)];
  const glide = E.inOut(prog(t, cardAt + 2, 18));

  // ---- the end card ---------------------------------------------------------------------------------------------------------
  const camK = clamp((t - cardAt) / Math.max(1, end - cardAt));
  const camE = 0.35 * E.out2(camK) + 0.65 * camK;
  const layer = (depth: number): React.CSSProperties => {
    const s = 1 + 0.07 * camE * depth;
    const dy = -16 * camE * depth;
    return {position: 'absolute', inset: 0, transform: `translate(0px, ${dy.toFixed(2)}px) scale(${s.toFixed(4)})`, transformOrigin: `${ORIGIN.x}px ${ORIGIN.y}px`};
  };
  const markK = sp(t, markAt - 3, 130, 15);
  const wmK = sp(t, markAt + 2, 130, 18);
  const nod = Math.sin(Math.PI * prog(t, hit, 8)) * (t >= hit ? 1 : 0);
  const shine = prog(t, hit - 4, 22);
  // the line: ნომერიც | შენთან რჩება | და ნერვებიც. (three centred lines that build with the voice)
  const words = [mtav('ნომერიც'), mtav('შენთან'), mtav('რჩება'), mtav('და'), mtav('ნერვებიც.')];
  const LINES = [[0], [1, 2], [3, 4]];
  let size = 100;
  const lineText = (idx: number[]) => idx.map((i) => words[i]).join(' ');
  const widest = Math.max(...LINES.map((l) => textWidth(lineText(l), `700 ${size}px ${F.sans}`)));
  if (widest > 840) size = Math.floor((size * 840) / widest);
  const LH = size * 1.1;
  const gap = size * 0.28;
  // the cobalt stroke under the turn („და ნერვებიც."), sweeping in after its last word
  const l3w = textWidth(lineText(LINES[2]), `700 ${size}px ${F.sans}`);
  const sweep = E.inOut(prog(t, tags[4] + 5, 14));
  const strokeY = TAG_TOP + 2 * LH + size * 0.98 + 10;
  const strokeX0 = 540 - l3w / 2 + 6;
  const strokeW = (l3w - 12) * sweep;
  const glint = prog(t, hit - 2, 10);
  const yPills = strokeY + 56;
  const note = E.out(prog(t, tags[4] + 12, 12));
  const pillsY = lerp(Y_STORE_PILLS, yPills, glide);

  return (
    <div style={{position: 'absolute', inset: 0, background: C.surface, overflow: 'hidden'}}>
      {/* the store: the real App Store page in the phone */}
      {phoneA > 0.002 ? (
        <>
          <Phone3 src={STORE} pose={pose} look={1} rim={1} shadow={0.9} veil={veil} band={band} bar="patch" opacity={phoneA * clamp(enter * 2.2)} />
          {liftK > 0.002 ? (
            <Lift src={STORE} r={HEAD} pose={pose} to={headTo} k={liftK} radius={30} show={phoneA} band={{x0: HEAD.x0 + 0.006, y0: HEAD.y0 + 0.004, x1: HEAD.x1 - 0.006, y1: HEAD.y1 - 0.004, a: clamp(liftK * 1.5) * (1 - prog(t, getAt + 8, 6))}}>
              {({fx, fy, s}) => <TapRing x={fx(GET.u)} y={fy(GET.v)} k={prog(t, getAt, 16)} s={s * 0.9} />}
            </Lift>
          ) : null}
        </>
      ) : null}

      {/* the mark and the wordmark (nearest) */}
      {t >= markAt - 4 ? (
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
            style={{position: 'absolute', left: 540 - 115, top: Y_WORD + (1 - wmK) * 24, width: 230, height: (230 * 68) / 267, filter: 'brightness(0) invert(0.045)', opacity: clamp(wmK * 1.4)}}
          />
        </div>
      ) : null}

      {/* the line, word by word on the voice, and its cobalt stroke */}
      {t >= tags[0] - 3 ? (
        <div style={layer(0.8)}>
          {LINES.map((idx, li) => {
            const top = TAG_TOP + li * LH;
            const ws = idx.map((i) => textWidth(words[i], `700 ${size}px ${F.sans}`));
            // v3.1 (the art director: each line re-centred as a word arrived, „შენთან" slid 170 px): the final line is laid
            // out first and every word appears in its own place, rising and fading in on its word
            const lineW = ws.reduce((acc, wd, n) => acc + wd + (n > 0 ? gap : 0), 0);
            let x = 540 - lineW / 2;
            return idx.map((i, n) => {
              const k = E.out(prog(t, tags[i] - 2, 9));
              if (n > 0) x += gap;
              const left = x;
              x += ws[n];
              return (
                <div key={i} style={{position: 'absolute', left, top, whiteSpace: 'nowrap', fontFamily: F.sans, fontWeight: 700, fontSize: size, lineHeight: 1.1, color: C.ink, opacity: k, transform: `translateY(${((1 - k) * 26).toFixed(2)}px)`}}>
                  {words[i]}
                </div>
              );
            });
          })}
          {strokeW > 1 ? (
            <svg width={W} height={H} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
              <defs>
                <filter id="qrEndSoft" x="-20%" y="-300%" width="140%" height="700%">
                  <feGaussianBlur stdDeviation={9} />
                </filter>
                <linearGradient id="qrEndGlint" gradientUnits="userSpaceOnUse" x1={strokeX0} y1={0} x2={strokeX0 + l3w} y2={0}>
                  <stop offset={clamp(glint - 0.12)} stopColor={C.surface} stopOpacity={0} />
                  <stop offset={clamp(glint)} stopColor={C.surface} stopOpacity={0.8} />
                  <stop offset={clamp(glint + 0.12)} stopColor={C.surface} stopOpacity={0} />
                </linearGradient>
              </defs>
              <rect x={strokeX0} y={strokeY - 6} width={strokeW} height={12} rx={6} fill={C.accA} opacity={0.32 + 0.25 * Math.sin(Math.PI * glint)} filter="url(#qrEndSoft)" />
              <rect x={strokeX0} y={strokeY - 4} width={strokeW} height={8} rx={4} fill={C.accA} />
              {sweep < 1 ? <circle cx={strokeX0 + strokeW} cy={strokeY} r={9} fill={C.accA} opacity={0.35 * (1 - sweep)} filter="url(#qrEndSoft)" /> : null}
              {glint > 0 && glint < 1 ? <rect x={strokeX0} y={strokeY - 4} width={strokeW} height={8} rx={4} fill="url(#qrEndGlint)" /> : null}
            </svg>
          ) : null}
        </div>
      ) : null}

      {/* the stores: under the phone, then up into the card */}
      <div style={layer(0.6 * glide)}>
        <div style={{position: 'absolute', left: 0, right: 0, top: pillsY, display: 'flex', justifyContent: 'center', gap: 24}}>
          {STORES.map((st, i) => (
            <Pill key={st} i={i} k={pillK[i]} />
          ))}
        </div>
      </div>

      {/* the quiet note (farthest) */}
      {note > 0 ? (
        <div style={layer(0.45)}>
          <div style={{position: 'absolute', left: 0, right: 0, top: yPills + 76 + 34, textAlign: 'center', fontFamily: F.mono, fontSize: 30, color: C.ink2, letterSpacing: '0.04em', opacity: note, transform: `translateY(${((1 - note) * 10).toFixed(2)}px)`}}>
            {mtav('QR ბარათი')} · VINARI+
          </div>
        </div>
      ) : null}
    </div>
  );
};
