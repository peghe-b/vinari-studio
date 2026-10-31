// 3D OBD film cover C, thin-line vector (studio grid style). Built by the cover workflow.
// „რა სჭირს მანქანას?" on the black field: a modern SUV drawn as a technical line drawing (the studio's
// procedural suv-luxury, its contour and design lines only, no fills), 3/4 front, big, its rear running off
// the right edge. Two leaders from the car to two outlined mono chips: the engine bay -> P0171 (lean mixture),
// the catalyst under the floor (a dashed hidden line) -> P0420. A small outlined phone (no screen, a few
// thin lines) is linked to the OBD-II port under the dash by a dotted line, as if reading it.
// Black and white only; one filled accent (the lamp badge on the phone).
import {createPortal, useFrame} from '@react-three/fiber';
import {ThreeCanvas} from '@remotion/three';
import React, {useEffect, useMemo, useState} from 'react';
import {AbsoluteFill, cancelRender, continueRender, delayRender, Img, staticFile} from 'remotion';
import * as THREE from 'three';
import {mtav} from '../lib/format';
import {F} from '../tokens';
import {applyView, fitView, projectPoint, Rect, View, viewAt, ViewInput} from '../scenes/three/camera';
import {makeContact} from '../scenes/three/floor';
import {DynLines, fillEdges, Layers, rgb} from '../scenes/three/lines';
import {loadModel, Model, penDistances, resolveStance} from '../scenes/three/model';
import {ENGINE_D} from './kit/cluster';
import {HEAD_LH, MAX_W, PAD, ROW_H, TOP, useFit} from './Covers';

const W = 1080;
const H = 1920;
const BG = '#000000';
const INK = '#FFFFFF';
const INK2 = '#BDBDBD';
const RULE = '#2E2E2E';
const RULE_Y = TOP + ROW_H + 30;
const HEAD_TOP = RULE_Y + 50;
const HEAD_MAX = 168;
const LINES = ['რა სჭირს', 'მანქანას?'];
const TAG = 'OBD სკანერი';
const CAR = 'suv';

// the camera: 3/4 front from the driver's side, a long lens, a little above the roof
const VI: ViewInput = {az: 42, el: 8, orbit: 0, rise: 0, dolly: 0, fov: 22, fill: 1};
// the framing rect (frame px): wider than the frame, so the rear runs off the right edge
const RECT: Rect = {x0: 110, y0: 1090, x1: 1250, y1: 1552};

const useCar = () => {
  const [model, setModel] = useState<Model | null>(null);
  const [handle] = useState(() => delayRender('cover C car'));
  useEffect(() => {
    loadModel(CAR, resolveStance(CAR, undefined), 'left')
      .then(setModel)
      .catch((e) => cancelRender(e));
  }, []);
  useEffect(() => {
    if (model) continueRender(handle);
  }, [model, handle]);
  return model;
};

const Lines: React.FC<{m: Model; view: View; w: number; h: number; k?: number}> = ({m, view, w, h, k = 1}) => {
  const L = useMemo<Layers>(() => {
    const o = {w, h};
    const feat = (m.proc ? m.proc.nF : m.ne) + 64;
    return {
      t1: new DynLines(40000, {...o, width: 2.4 * k, order: 12}),
      t2: new DynLines(feat, {...o, width: 1.7 * k, opacity: 0.92, order: 11}),
      t3: new DynLines(feat, {...o, width: 1.3 * k, opacity: 0.62, order: 10}),
      ghost: new DynLines(feat, {...o, width: 1, depthTest: false, order: 5}),
      glowW: new DynLines(16, {...o, width: 7, additive: true, order: 13}),
      glowC: new DynLines(16, {...o, width: 2.6, additive: true, order: 14}),
    };
  }, [m, w, h, k]);
  const occluder = useMemo(() => new THREE.MeshBasicMaterial({colorWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1.5, polygonOffsetUnits: 2}), []);
  const contact = useMemo(() => makeContact(m, INK, w, h), [m, w, h]);
  contact.tMat.opacity = 0.75;
  contact.gMat.opacity = 0.22;
  L.ghost.mat.opacity = 0.1;
  const pd = penDistances(m, 'front');
  fillEdges(m, {cam: view.pos.clone(), R: Infinity, dist: pd.d, fdist: pd.fd, base: rgb(INK), threshold: 28, ghost: true}, L);
  return (
    <group>
      <primitive object={contact.ground} />
      <primitive object={contact.ticks} />
      {m.occluders.map((g, i) => (
        <mesh key={i} geometry={g} material={occluder} />
      ))}
      <primitive object={L.ghost.obj} />
      <primitive object={L.t3.obj} />
      <primitive object={L.t2.obj} />
      <primitive object={L.t1.obj} />
    </group>
  );
};

const Stage: React.FC<{m: Model; view: View; w: number; h: number; k?: number}> = ({m, view, w, h, k}) => {
  const scene = useMemo(() => new THREE.Scene(), []);
  const cam = useMemo(() => new THREE.PerspectiveCamera(15, w / h, 1, 100), [w, h]);
  applyView(cam, view, w, h);
  useFrame(({gl}) => {
    gl.autoClear = false;
    gl.setViewport(0, 0, w, h);
    gl.clear(true, true, true);
    gl.render(scene, cam);
  }, 1);
  return <>{createPortal(<Lines m={m} view={view} w={w} h={h} k={k} />, scene)}</>;
};

/** the car drawn into a w x h canvas, framed by vi into rect */
const CarCanvas: React.FC<{m: Model; vi: ViewInput; rect: Rect; w: number; h: number; k?: number}> = ({m, vi, rect, w, h, k}) => {
  const view = useMemo(() => viewAt(fitView(m.hull, m.box, vi, rect, w, h), m.hull, vi, rect, w, h, 0), [m, vi, rect, w, h]);
  return (
    <ThreeCanvas width={w} height={h} dpr={typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1} gl={{antialias: true, alpha: true}} camera={{fov: 15, near: 1, far: 100}} style={{background: 'transparent'}}>
      <Stage m={m} view={view} w={w} h={h} k={k} />
    </ThreeCanvas>
  );
};

/** the anchors on the car, in model space */
const anchors = (m: Model) => {
  const {min, max} = m.box;
  // the front wheel on the camera's side (+x)
  const fw = [...m.wheels].sort((a, b) => b.c.z - a.c.z || b.c.x - a.c.x)[0];
  const eng = m.parts.engine?.[0];
  const st = m.parts.steering?.[0];
  // the engine bay: the bonnet's surface on the centre line, a little ahead of the bay's middle (found by a ray from above)
  const zE = eng ? eng.min.z + (eng.max.z - eng.min.z) * 0.78 : fw.c.z;
  const solid = new THREE.MeshBasicMaterial({side: THREE.DoubleSide});
  const hit = new THREE.Raycaster(new THREE.Vector3(-0.1 * max.x, max.y + 2, zE), new THREE.Vector3(0, -1, 0)).intersectObjects(m.occluders.map((g) => new THREE.Mesh(g, solid)), false)[0];
  const engine = hit ? hit.point.clone() : new THREE.Vector3(-0.1 * max.x, eng ? eng.max.y : max.y * 0.55, zE);
  // the catalyst: under the floor, behind the front axle, a little off the centre line
  const catY = min.y + 0.1 * (max.y - min.y);
  const catZ = fw.c.z - fw.r * 4.4;
  const cx = 0.25 * max.x;
  const cat = new THREE.Vector3(cx, catY, catZ);
  const catA = new THREE.Vector3(cx, catY, catZ + fw.r * 0.5);
  const catB = new THREE.Vector3(cx, catY, catZ - fw.r * 0.5);
  const pipeA = new THREE.Vector3(cx, catY, catZ + fw.r * 1.3);
  const pipeB = new THREE.Vector3(cx, catY, catZ - fw.r * 1.6);
  // the OBD-II port: under the dash, below the steering column (driver's side, +x)
  const port = st ? new THREE.Vector3((st.min.x + st.max.x) / 2, st.min.y - 0.14, (st.min.z + st.max.z) / 2 + 0.1) : new THREE.Vector3(0.4 * max.x, 0.45 * max.y, fw.c.z - fw.r * 2);
  // where the front wheel meets the ground
  const contact = new THREE.Vector3(fw.c.x, 0, fw.c.z);
  return {engine, cat, catA, catB, pipeA, pipeB, port, contact};
};

const CHIP_H = 58;
const CHIP_W = 340; // about: the two chips measure 338..340 px
/** an outlined mono chip: the code in white, a hairline, its meaning in grey */
const Chip: React.FC<{x: number; y: number; code: string; note: string}> = ({x, y, code, note}) => (
  <div style={{position: 'absolute', left: x, top: y, height: CHIP_H, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 16, padding: '0 20px', border: `2px solid ${INK}`, borderRadius: 14, background: BG, whiteSpace: 'nowrap'}}>
    <div style={{fontFamily: F.mono, fontSize: 28, letterSpacing: '0.08em', color: INK}}>{code}</div>
    <div style={{width: 1.5, height: 24, background: '#5A5A5A'}} />
    <div style={{fontFamily: F.mono, fontSize: 21, letterSpacing: '0.05em', color: INK2}}>{mtav(note)}</div>
  </div>
);

/** the phone: an outline, a few thin lines, the lit lamp as the one solid badge */
const Phone: React.FC<{x: number; y: number; w: number}> = ({x, y, w}) => {
  const h = w * 2.04;
  const r = w * 0.2;
  const cx = x + w / 2;
  const by = y + h * 0.3;
  const br = w * 0.2;
  const s = (br * 1.25) / 17; // ENGINE_D spans about 17 units
  return (
    <g fill="none" stroke={INK} strokeLinecap="round" strokeLinejoin="round">
      <rect x={x} y={y} width={w} height={h} rx={r} strokeWidth={2.4} />
      <rect x={cx - w * 0.15} y={y + w * 0.09} width={w * 0.3} height={w * 0.085} rx={w * 0.042} strokeWidth={1.5} />
      <circle cx={cx} cy={by} r={br} fill={INK} stroke="none" />
      <path d={ENGINE_D} transform={`translate(${cx - 12.7 * s} ${by - 11.3 * s}) scale(${s})`} stroke={BG} strokeWidth={1.7 / s} />
      <line x1={x + w * 0.2} x2={x + w * 0.8} y1={y + h * 0.52} y2={y + h * 0.52} strokeWidth={1.5} opacity={0.9} />
      <line x1={x + w * 0.2} x2={x + w * 0.62} y1={y + h * 0.6} y2={y + h * 0.6} strokeWidth={1.5} opacity={0.55} />
      <line x1={x + w * 0.2} x2={x + w * 0.7} y1={y + h * 0.68} y2={y + h * 0.68} strokeWidth={1.5} opacity={0.55} />
      <line x1={cx - w * 0.17} x2={cx + w * 0.17} y1={y + h - w * 0.09} y2={y + h - w * 0.09} strokeWidth={2} />
    </g>
  );
};

/** a leader's end on the car: a solid dot in a thin ring */
const Pin: React.FC<{x: number; y: number}> = ({x, y}) => (
  <g>
    <circle cx={x} cy={y} r={13} fill="none" stroke={INK} strokeWidth={1.5} />
    <circle cx={x} cy={y} r={4.5} fill={INK} />
  </g>
);

export const CoverLineC: React.FC = () => {
  const size = useFit(LINES, HEAD_MAX);
  const fs = size ?? HEAD_MAX;
  const m = useCar();
  const view = useMemo(() => (m ? viewAt(fitView(m.hull, m.box, VI, RECT, W, H), m.hull, VI, RECT, W, H, 0) : null), [m]);
  const g = useMemo(() => {
    if (!m || !view) return null;
    const a = anchors(m);
    const p = (v: THREE.Vector3) => projectPoint(view, v, W, H);
    // the car's top edge over the phone's column (the hull, projected)
    const PH_X1 = W - PAD;
    let top = Infinity;
    const v = new THREE.Vector3();
    for (let i = 0; i < m.hull.length; i += 3) {
      const q = p(v.set(m.hull[i], m.hull[i + 1], m.hull[i + 2]));
      if (q.x > PH_X1 - 220 && q.x < PH_X1 + 40) top = Math.min(top, q.y);
    }
    return {engine: p(a.engine), cat: p(a.cat), catA: p(a.catA), catB: p(a.catB), pipeA: p(a.pipeA), pipeB: p(a.pipeB), port: p(a.port), contact: p(a.contact), top: Number.isFinite(top) ? top : view.top};
  }, [m, view]);

  const headBottom = HEAD_TOP + LINES.length * fs * HEAD_LH;
  // the callouts
  const c1y = Math.round(headBottom + 96); // P0171, top left
  const c2y = g ? Math.min(1680 - CHIP_H - 34, Math.round(g.contact.y + 30)) : 1588; // P0420, under the car
  const e1 = g ? g.engine.x > PAD + 30 && g.engine.x < PAD + CHIP_W - 16 : true; // the engine sits under the chip: a straight drop
  // the phone, top right, clear of the roof
  const phBottom = g ? g.top - 36 : 1056;
  const phTop = Math.max(headBottom + 60, phBottom - 236);
  const phW = Math.round((phBottom - phTop) / 2.04);
  const phX = W - PAD - phW;
  const link = g
    ? (() => {
        // from the phone's lower left corner, over the roof, down the front door's glass between the mirror and the
        // B pillar, under the mirror and into the port from the upper right
        const x0 = phX - 10;
        const y0 = phBottom - (phBottom - phTop) * 0.14;
        const c1x = g.port.x + 148;
        const c1y = phBottom + 34;
        const c2x = g.port.x + 166;
        const c2y = g.port.y - 16;
        const d = Math.hypot(c2x - g.port.x, c2y - g.port.y);
        const x1 = g.port.x + ((c2x - g.port.x) / d) * 17;
        const y1 = g.port.y + ((c2y - g.port.y) / d) * 17;
        return `M ${x0} ${y0} C ${c1x} ${c1y} ${c2x} ${c2y} ${x1} ${y1}`;
      })()
    : null;
  const catAng = g ? (Math.atan2(g.catB.y - g.catA.y, g.catB.x - g.catA.x) * 180) / Math.PI : 0;
  const catLen = g ? Math.hypot(g.catB.x - g.catA.x, g.catB.y - g.catA.y) : 0;

  return (
    <AbsoluteFill style={{backgroundColor: BG}}>
      {m && view ? (
        <div style={{position: 'absolute', inset: 0}}>
          <ThreeCanvas width={W} height={H} dpr={typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1} gl={{antialias: true, alpha: true}} camera={{fov: 15, near: 1, far: 100}} style={{background: 'transparent'}}>
            <Stage m={m} view={view} w={W} h={H} />
          </ThreeCanvas>
        </div>
      ) : null}

      {g ? (
        <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
          {/* the exhaust under the floor, a hidden line: the pipe and the catalyst's can, dashed */}
          <g fill="none" stroke={INK} strokeWidth={1.6} strokeDasharray="7 7" opacity={0.75}>
            <line x1={g.pipeA.x} y1={g.pipeA.y} x2={g.catA.x} y2={g.catA.y} />
            <line x1={g.catB.x} y1={g.catB.y} x2={g.pipeB.x} y2={g.pipeB.y} />
            <rect x={-catLen / 2} y={-15} width={catLen} height={30} rx={15} transform={`translate(${g.cat.x} ${g.cat.y}) rotate(${catAng})`} />
          </g>
          {/* P0171: from the engine bay up to the chip */}
          {e1 ? (
            <line x1={g.engine.x} y1={g.engine.y} x2={g.engine.x} y2={c1y + CHIP_H} stroke={INK} strokeWidth={2} />
          ) : (
            <polyline points={`${g.engine.x},${g.engine.y} ${g.engine.x},${c1y + CHIP_H / 2} ${PAD + CHIP_W - 20},${c1y + CHIP_H / 2}`} fill="none" stroke={INK} strokeWidth={2} />
          )}
          <Pin x={g.engine.x} y={g.engine.y} />
          {/* P0420: from the catalyst down under the car, then along the ground to the chip */}
          <polyline points={`${g.cat.x},${g.cat.y + 15} ${g.cat.x},${c2y + CHIP_H / 2} ${PAD + 40},${c2y + CHIP_H / 2}`} fill="none" stroke={INK} strokeWidth={2} />
          <Pin x={g.cat.x} y={g.cat.y} />
          {/* the phone reads the port: a dotted line */}
          {link ? (
            <path d={link} fill="none" stroke={INK} strokeWidth={3.2} strokeLinecap="round" strokeDasharray="0 12" />
          ) : null}
          <circle cx={g.port.x} cy={g.port.y} r={11} fill={BG} stroke={INK} strokeWidth={2} />
          <circle cx={g.port.x} cy={g.port.y} r={4} fill={INK} />
          <Phone x={phX} y={phTop} w={phW} />
        </svg>
      ) : null}
      {/* the link's label, where it leaves the phone */}
      <div style={{position: 'absolute', right: W - phX + 26, top: phBottom - (phBottom - phTop) * 0.14 - 46, fontFamily: F.mono, fontSize: 19, letterSpacing: '0.12em', color: INK2, whiteSpace: 'nowrap'}}>OBD-II</div>
      {g ? <Chip x={PAD} y={c1y} code="P0171" note="ღარიბი ნარევი" /> : null}
      {g ? <Chip x={PAD} y={c2y} code="P0420" note="კატალიზატორი" /> : null}

      {/* top row: the lockup left, the tag right, a hairline under them */}
      <div style={{position: 'absolute', top: TOP, left: PAD, height: ROW_H, display: 'flex', alignItems: 'center', gap: 14}}>
        <Img src={staticFile('brand/mark.svg')} style={{height: 40, width: (40 * 768) / 671, filter: 'brightness(0) invert(1)'}} />
        <Img src={staticFile('brand/wordmark.svg')} style={{height: 23, width: (23 * 267) / 68, filter: 'brightness(0) invert(1)'}} />
      </div>
      <div style={{position: 'absolute', top: TOP, right: PAD, height: ROW_H, display: 'flex', alignItems: 'center'}}>
        <div style={{height: ROW_H - 2, display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px 0 18px', borderRadius: ROW_H, border: '1.5px solid #4A4A4A', fontFamily: F.mono, fontSize: 22, letterSpacing: '0.06em', color: INK2, whiteSpace: 'nowrap'}}>
          <div style={{width: 9, height: 9, borderRadius: 9, background: INK}} />
          {mtav(TAG)}
        </div>
      </div>
      <div style={{position: 'absolute', top: RULE_Y, left: PAD, right: PAD, height: 1.5, background: RULE}} />

      {/* the headline */}
      <div style={{position: 'absolute', top: HEAD_TOP, left: PAD - 4, width: MAX_W + 8, fontFamily: F.sans, fontWeight: 600, fontSize: fs, lineHeight: HEAD_LH, letterSpacing: '-0.01em', color: INK, opacity: size ? 1 : 0}}>
        {LINES.map((line, i) => (
          <div key={i} style={{whiteSpace: 'nowrap'}}>
            {mtav(line)}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
