// The cover's real-screen pictures (plan step 1.4; the owner's ticked „ქართული ნავიგატორი ახლა CarPlay-ზეც", Marketing/19):
//   PhoneTilt    a REAL current capture (public/screens/<src>.jpg, with the studio's one status bar) in a whole iPhone
//   CarPlayTilt  a REAL CarPlay capture (public/screens/carplay/<src>.png, 800 x 480) in the car's dark display
// both turned in 3D: the display with the approved transform (promo-nav-carplay src/navpromo/Cover.tsx: perspective 2200,
// rotateX 10 / rotateY -14 / rotateZ -2), the phone lying back on the diagonal like the Marketing/21 B phone ("right" is
// the mirror, "flat" none), in grey (grayscale 1, contrast 1.05), WHOLE: the device's
// projected outline is computed and the device scaled so all of it, its shadow's core too, sits inside the stage (never a
// cropped mockup, the owner 2026-10-12). A marker on the row that matters is drawn in the screen's own plane, so it tilts
// with it. An optional caption line goes under the device.
import React from 'react';
import {Img, staticFile} from 'remotion';
import {mtav} from '../lib/format';
import {useScreenUrl} from '../lib/statusbar';
import {F} from '../tokens';
import type {CoverMark} from '../types';
import {GREY, type Stage} from './CoverFrame';
import {type MarkSpec, Marks, marksOf} from './Marker';

export type Tilt = 'left' | 'right' | 'flat';
type Mark = {x: number; y: number; w: number; h: number; kind?: CoverMark | CoverMark[]};
const PERSPECTIVE = 2200; // the CarPlay cover's (at its display's own size)
const PHONE_PERSPECTIVE = 1500; // the phone lies back at about half its base size: a nearer eye keeps its depth
// the CarPlay cover's approved turn; the phone, a tall narrow thing a third of the display's width, turns a little more so its
// depth still reads at that size
type Angles = readonly [number, number, number];
const DISPLAY: Record<Tilt, Angles> = {left: [10, -14, -2], right: [10, 14, 2], flat: [0, 0, 0]};
// the phone lies back and turns on the diagonal (the Marketing/21 B phone): its height shrinks, so it is drawn bigger in the
// same room and the marked row reads at thumbnail size
const PHONE: Record<Tilt, Angles> = {left: [30, -10, -16], right: [30, 10, 16], flat: [0, 0, 0]};
const rotate = ([x, y, z]: Angles) => `rotateX(${x}deg) rotateY(${y}deg) rotateZ(${z}deg)`;

/** The box a w x h plane fills on the page after the tilt and the perspective (centred on its own centre): CSS applies
 *  rotateX(a) rotateY(b) rotateZ(c) to a point as Rx(Ry(Rz p)), then projects by d / (d - z). */
const projectedBox = (w: number, h: number, t: Angles, d: number) => {
  const [ax, ay, az] = t.map((d) => (d * Math.PI) / 180);
  const pts = [
    [-w / 2, -h / 2],
    [w / 2, -h / 2],
    [w / 2, h / 2],
    [-w / 2, h / 2],
  ].map(([x0, y0]) => {
    // rotateZ
    let x = x0 * Math.cos(az) - y0 * Math.sin(az);
    let y = x0 * Math.sin(az) + y0 * Math.cos(az);
    let z = 0;
    // rotateY
    [x, z] = [x * Math.cos(ay) + z * Math.sin(ay), -x * Math.sin(ay) + z * Math.cos(ay)];
    // rotateX
    [y, z] = [y * Math.cos(ax) - z * Math.sin(ax), y * Math.sin(ax) + z * Math.cos(ax)];
    const k = d / (d - z);
    return [x * k, y * k];
  });
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return {x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys)};
};

/** Scale a w x h device to fit the room (a box on the page) once tilted. The scale is a CSS scale3d() before the turn (a 2D
 *  scale() leaves the depth unscaled: the perspective came out far stronger than measured), so the box is measured on the
 *  scaled plane, a few rounds until it settles. Returns the scale, the plane's centre on the page (the perspective's
 *  origin) and the bottom of what it fills. */
const fitDevice = (w: number, h: number, t: Angles, d: number, room: {x0: number; x1: number; y0: number; y1: number}) => {
  let k = 1;
  for (let i = 0; i < 8; i++) {
    const b = projectedBox(w * k, h * k, t, d);
    k *= Math.min((room.x1 - room.x0) / (b.x1 - b.x0), (room.y1 - room.y0) / (b.y1 - b.y0));
  }
  const b = projectedBox(w * k, h * k, t, d);
  const bh = b.y1 - b.y0;
  // centred across the room, a little above the middle of what is left under it
  const cx = (room.x0 + room.x1) / 2 - (b.x0 + b.x1) / 2;
  const cy = room.y0 - b.y0 + Math.max(0, (room.y1 - room.y0 - bh) * 0.35);
  return {k, cx, cy, bottom: cy + b.y1};
};

const Caption: React.FC<{text: string; top: number}> = ({text, top}) => (
  <div style={{position: 'absolute', left: 72, right: 72, top, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: 46, lineHeight: 1, color: GREY, whiteSpace: 'nowrap'}}>{mtav(text)}</div>
);

const markList = (m: Mark | undefined, sw: number, sh: number, ox: number, oy: number, seed: number): MarkSpec[] =>
  m ? marksOf(m.kind ?? 'circle').map((kind, i) => ({kind, box: {x: ox + m.x * sw, y: oy + m.y * sh, w: m.w * sw, h: m.h * sh}, seed: seed + i * 7})) : [];

/** A real capture in a whole iPhone, tilted, in grey. */
export const PhoneTilt: React.FC<{src: string; tilt: Tilt; mark?: Mark; note?: string; stage: Stage; seed: number}> = ({src, tilt, mark, note, stage, seed}) => {
  const url = useScreenUrl(src);
  // the body at a base size (the screen 1000 wide): a thin black bezel and the screen's own corners
  const SW = 1000;
  const SH = (SW * 2346) / 1080;
  const BZ = 38;
  const W = SW + 2 * BZ;
  const H = SH + 2 * BZ;
  const room = {x0: stage.left + 30, x1: stage.right - 30, y0: stage.top + 10, y1: stage.bottom - (note ? 130 : 40)};
  const ang = PHONE[tilt];
  const f = fitDevice(W, H, ang, PHONE_PERSPECTIVE, room);
  return (
    <>
      <div style={{position: 'absolute', inset: 0, filter: 'grayscale(1) contrast(1.05)'}}>
        <div style={{position: 'absolute', inset: 0, perspective: PHONE_PERSPECTIVE, perspectiveOrigin: `${f.cx}px ${f.cy}px`}}>
          <div
            style={{
              position: 'absolute',
              left: f.cx - W / 2,
              top: f.cy - H / 2,
              width: W,
              height: H,
              borderRadius: 150,
              background: '#0E0E0E',
              boxShadow: '0 70px 140px rgba(0,0,0,0.30), 0 14px 36px rgba(0,0,0,0.20), inset 0 0 0 4px #3A3A3A',
              transform: `scale3d(${f.k}, ${f.k}, ${f.k}) ${rotate(ang)}`,
              transformOrigin: '50% 50%',
            }}
          >
            <div style={{position: 'absolute', left: BZ, top: BZ, width: SW, height: SH, borderRadius: 116, overflow: 'hidden', background: '#000'}}>
              {url ? <Img src={url} style={{position: 'absolute', left: 0, top: 0, width: SW, height: SH}} /> : null}
            </div>
            <Marks marks={markList(mark, SW, SH, BZ, BZ, seed)} w={W} h={H} width={24} />
          </div>
        </div>
      </div>
      {note && f.bottom + 60 + 46 <= stage.bottom ? <Caption text={note} top={Math.round(f.bottom + 60)} /> : null}
    </>
  );
};

/** A real CarPlay capture in the car's display, tilted, in grey. */
export const CarPlayTilt: React.FC<{src: string; tilt: Tilt; mark?: Mark; note?: string; stage: Stage; seed: number}> = ({src, tilt, mark, note, stage, seed}) => {
  const IW = 800;
  const IH = 480;
  const BZ = 22;
  const W = IW + 2 * BZ;
  const H = IH + 2 * BZ;
  const room = {x0: stage.left, x1: stage.right, y0: stage.top + 40, y1: Math.min(stage.bottom - (note ? 130 : 40), stage.top + 820)};
  const ang = DISPLAY[tilt];
  const f = fitDevice(W, H, ang, PERSPECTIVE, room);
  return (
    <>
      <div style={{position: 'absolute', inset: 0, filter: 'grayscale(1) contrast(1.05)'}}>
        <div style={{position: 'absolute', inset: 0, perspective: PERSPECTIVE, perspectiveOrigin: `${f.cx}px ${f.cy}px`}}>
          <div
            style={{
              position: 'absolute',
              left: f.cx - W / 2,
              top: f.cy - H / 2,
              width: W,
              height: H,
              borderRadius: 44,
              background: '#0E0E0F',
              boxShadow: '0 40px 90px rgba(0,0,0,0.28), 0 8px 22px rgba(0,0,0,0.18)',
              transform: `scale3d(${f.k}, ${f.k}, ${f.k}) ${rotate(ang)}`,
              transformOrigin: '50% 50%',
            }}
          >
            <Img src={staticFile(`screens/carplay/${src}.png`)} style={{position: 'absolute', left: BZ, top: BZ, width: IW, height: IH, borderRadius: 24}} />
            <Marks marks={markList(mark, IW, IH, BZ, BZ, seed)} w={W} h={H} width={9} />
          </div>
        </div>
      </div>
      {note && f.bottom + 60 + 46 <= stage.bottom ? <Caption text={note} top={Math.round(f.bottom + 60)} /> : null}
    </>
  );
};
