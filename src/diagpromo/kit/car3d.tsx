// COPY of src/qrpromo/kit/car3d.tsx for the diagnostics promo (2026-10-15): `lift` raises the car on the garage's
// two-post lift (its shadow stays on the floor), `paint` and `at` place the used-car lot's other cars.
// v2 (the owner: "the car must NOT be the blue car of the previous promos"): this film's own car is the studio's procedural
// performance crossover ('suv': Cayenne / X5 proportions, roof rails, clad arches) in a graphite metallic; the masks, the
// open bonnet and its now detailed engine bay (an engine cover, the row of ignition coils, the air box and its intake hose,
// the hoses, strut tops, battery, fuse box, reservoirs, the radiator's cross member) follow that design. `design` may still
// ask for the saloon (the used-car lot's other cars).
// The QR promo's car: the studio's procedural premium saloon (src/scenes/three/car.ts: an implicit solid in metres, surface
// nets, true vertex normals, its designer's shut lines), rendered SOLID here instead of as a line drawing: a deep cobalt
// clear-coated metallic paint, tinted glass (the design's own DLO, windscreen and backlight, as masks in the fragment
// shader, so the glass edge is crisp), black trim, slim LED headlamps, rubber tyres, machined five-twin-spoke rims, wipers,
// a soft contact shadow. The same car in both acts: the warm evening street (env night) and the white studio (env day).
//
// What rides on it (the film's props), placed on the real surface by a ray from above:
//   note   the paper under the wiper with her hand-written number (act 1)
//   card   the printed VINARI card standing behind the windscreen (act 2); `cardK` 0..1 brings it in from above the roof
//
// The camera is a plain perspective camera in metres (the car's centre on the ground at the origin, its nose to +z); `cam`
// gives its position, target and vertical fov. The canvas covers the whole frame, transparent; the scene draws behind it.
import {useThree} from '@react-three/fiber';
import {ThreeCanvas} from '@remotion/three';
import React, {useEffect, useMemo, useState} from 'react';
import {cancelRender, continueRender, delayRender, staticFile} from 'remotion';
import * as THREE from 'three';
import {buildCarAsync, DESIGNS} from '../../scenes/three/car';
import type {Model} from '../../scenes/three/model';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {makeEnv} from './env';

export type DesignName = 'suv' | 'sedan';
type Pt = number[];

export type CarCam = {pos: [number, number, number]; target: [number, number, number]; fov: number; roll?: number};

// ---- the model -------------------------------------------------------------------------------------------------------
const useModel = (NAME: DesignName) => {
  const [m, setM] = useState<Model | null>(null);
  const [h] = useState(() => delayRender(`diagpromo car ${NAME}`));
  useEffect(() => {
    buildCarAsync(NAME)
      .then((x) => {
        setM(x);
        continueRender(h);
      })
      .catch((e) => cancelRender(e));
  }, [h, NAME]);
  return m;
};

// ---- the masks (canvas 2D, then textures): what part of the body is glass, trim, lamp ---------------------------------
type Box = [number, number, number, number]; // u0 u1 v0 v1 (metres)
const SIDE_BOX: Box = [-2.7, 2.7, 0, 1.7];
const PLAN_BOX: Box = [-1.2, 1.2, -2.7, 2.7];
const FRONT_BOX: Box = [-1.2, 1.2, 0, 1.7];

const polyPath = (g: CanvasRenderingContext2D, pts: Pt[], map: (u: number, v: number) => [number, number], pxPerM: number) => {
  const n = pts.length;
  const P = pts.map(([u, v]) => map(u, v));
  const mid = (a: number, b: number): [number, number] => [(P[a][0] + P[b][0]) / 2, (P[a][1] + P[b][1]) / 2];
  g.beginPath();
  const m0 = mid(n - 1, 0);
  g.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) {
    const nx = P[(i + 1) % n];
    const r = (pts[i][2] ?? 0) * pxPerM;
    if (r > 0.5) g.arcTo(P[i][0], P[i][1], nx[0], nx[1], r);
    else g.lineTo(P[i][0], P[i][1]);
  }
  g.closePath();
};

const maskCanvas = (box: Box, pxPerM: number, draw: (g: CanvasRenderingContext2D, map: (u: number, v: number) => [number, number], s: number) => void) => {
  const W = Math.round((box[1] - box[0]) * pxPerM);
  const H = Math.round((box[3] - box[2]) * pxPerM);
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d');
  if (!g) throw new Error('no 2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  const map = (u: number, v: number): [number, number] => [((u - box[0]) / (box[1] - box[0])) * W, (1 - (v - box[2]) / (box[3] - box[2])) * H];
  draw(g, map, pxPerM);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.NoColorSpace;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
};

const mirrorX = (pts: Pt[]) => pts.map(([u, v, r]) => [-u, v, r ?? 0]);

const REAR_BOX: Box = [-1.2, 1.2, 0, 2.0];
/** each design's own front (lamps, the LED line, the grille, the intakes) and where its glass lives */
const FIT: Record<DesignName, {lamp: Pt[]; led: [number, number, number, number]; grille: Pt[]; intake: Pt[]; curtain: Pt[]; hinge: number; halfW: (z: number) => number; noseZ: (ax: number) => number; wiperZ: number; shadow: [number, number]}> = {
  sedan: {
    lamp: [[0.4, 0.685, 0.02], [0.83, 0.735, 0.05], [0.885, 0.695, 0.04], [0.83, 0.648, 0.05], [0.44, 0.64, 0.02]],
    led: [0.47, 0.672, 0.82, 0.709],
    grille: [[-0.34, 0.645, 0.02], [0.34, 0.645, 0.02], [0.32, 0.69, 0.02], [-0.32, 0.69, 0.02]],
    intake: [[-0.6, 0.235, 0.06], [0.6, 0.235, 0.06], [0.52, 0.44, 0.06], [-0.52, 0.44, 0.06]],
    curtain: [[0.7, 0.27, 0.03], [0.8, 0.27, 0.03], [0.8, 0.5, 0.03], [0.72, 0.5, 0.03]],
    hinge: 0.96,
    halfW: (z) => (z < 1.8 ? 0.7 + (0.06 * (z - 0.93)) / 0.87 : 0.76 + (0.04 * (z - 1.8)) / 0.42),
    noseZ: (ax) => 2.37 - 0.15 * Math.min(1, ax / 0.8) ** 2,
    wiperZ: 0.8,
    shadow: [0.9, 2.35],
  },
  suv: {
    lamp: [[0.46, 0.84, 0.02], [0.86, 0.88, 0.05], [0.92, 0.84, 0.04], [0.86, 0.8, 0.04], [0.5, 0.79, 0.02]],
    led: [0.52, 0.83, 0.86, 0.857],
    grille: [[-0.42, 0.6, 0.05], [0.42, 0.6, 0.05], [0.4, 0.82, 0.04], [-0.4, 0.82, 0.04]],
    intake: [[-0.5, 0.3, 0.06], [0.5, 0.3, 0.06], [0.46, 0.38, 0.06], [-0.46, 0.38, 0.06]],
    curtain: [[0.55, 0.4, 0.04], [0.85, 0.42, 0.05], [0.83, 0.62, 0.05], [0.58, 0.6, 0.04]],
    hinge: 0.92,
    halfW: (z) => (z < 1.8 ? 0.74 + (0.06 * (z - 0.9)) / 0.9 : 0.8 + (0.04 * (z - 1.8)) / 0.44),
    noseZ: (ax) => 2.33 - 0.1 * Math.min(1, ax / 0.84) ** 2,
    wiperZ: 0.82,
    shadow: [0.99, 2.47],
  },
};

const makeMasks = (NAME: DesignName) => {
  const D = DESIGNS[NAME];
  const F = FIT[NAME];
  const rearView = D.glass.backView === 'rear';
  const G = D.glass;
  // side (z, y): R glass, G black trim (the B pillar in gloss black, a slim surround), B unused
  const side = maskCanvas(SIDE_BOX, 700, (g, map, s) => {
    g.fillStyle = 'rgb(255,0,0)';
    polyPath(g, G.side as Pt[], map, s);
    g.fill();
    g.strokeStyle = 'rgb(0,255,0)';
    g.lineWidth = 0.022 * s;
    g.stroke();
    g.fillStyle = 'rgb(0,255,0)';
    for (const p of G.pillars) {
      polyPath(g, p as Pt[], map, s);
      g.fill();
    }
  });
  // plan (x, z): R windscreen and backlight
  const plan = maskCanvas(PLAN_BOX, 700, (g, map, s) => {
    g.fillStyle = 'rgb(255,0,0)';
    polyPath(g, G.front as Pt[], map, s);
    g.fill();
    if (!rearView) {
      polyPath(g, G.back as Pt[], map, s);
      g.fill();
    }
    // the black frit round the windscreen's edge
    g.strokeStyle = 'rgb(0,255,0)';
    g.lineWidth = 0.03 * s;
    polyPath(g, G.front as Pt[], map, s);
    g.stroke();
  });
  // front (x, y): R the headlamp lens (dark, glossy), B its LED line and the DRL stroke, G the intakes (matte black)
  const front = maskCanvas(FRONT_BOX, 800, (g, map, s) => {
    const lamp = F.lamp;
    for (const p of [lamp, mirrorX(lamp)]) {
      g.fillStyle = 'rgb(255,0,0)';
      polyPath(g, p, map, s);
      g.fill();
    }
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = 'rgb(0,0,255)';
    g.lineCap = 'round';
    g.lineWidth = 0.014 * s;
    for (const sx of [1, -1]) {
      g.beginPath();
      const a = map(sx * F.led[0], F.led[1]);
      const b = map(sx * F.led[2], F.led[3]);
      g.moveTo(a[0], a[1]);
      g.lineTo(b[0], b[1]);
      g.stroke();
    }
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = 'rgb(0,255,0)';
    const grille = F.grille;
    const intake = F.intake;
    const curtain = F.curtain;
    for (const p of [grille, intake, curtain, mirrorX(curtain)]) {
      polyPath(g, p, map, s);
      g.fill();
    }
  });
  // rear (x, y): R the backlight of a design whose rear glass stands upright (the crossover's tailgate)
  const rear = maskCanvas(REAR_BOX, 700, (g, map, s) => {
    if (!rearView) return;
    g.fillStyle = 'rgb(255,0,0)';
    polyPath(g, G.back as Pt[], map, s);
    g.fill();
  });
  return {side, plan, front, rear};
};

// ---- the paint shader (MeshPhysicalMaterial + the masks) -------------------------------------------------------------
const boxU = (b: Box) => new THREE.Vector4(b[0], b[1], b[2], b[3]);
const makeBodyMat = (env: THREE.Texture, masks: ReturnType<typeof makeMasks>, k: number, NAME: DesignName) => {
  const D = DESIGNS[NAME];
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#1F47B6'),
    metalness: 0.68,
    roughness: 0.26,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    envMap: env,
    envMapIntensity: 1,
    transparent: true,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const uniforms = {
    uSide: {value: masks.side},
    uPlan: {value: masks.plan},
    uFront: {value: masks.front},
    uRear: {value: masks.rear},
    uRearBox: {value: boxU(REAR_BOX)},
    uSideBox: {value: boxU(SIDE_BOX)},
    uPlanBox: {value: boxU(PLAN_BOX)},
    uFrontBox: {value: boxU(FRONT_BOX)},
    uK: {value: k},
    uBelt: {value: D.belt - 0.03},
    uGlassA: {value: 0.82},
    uLamp: {value: 0},
    uPaint: {value: new THREE.Color('#2350C8')},
    uWheel: {value: new THREE.Vector4(D.wheels.zf, D.wheels.zr, D.wheels.R, D.wheels.arch)},
  };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCarP;\nvarying vec3 vCarN;\nuniform float uK;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCarP = position / uK;\nvCarN = normal;');
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vCarP;
varying vec3 vCarN;
uniform sampler2D uSide;
uniform sampler2D uPlan;
uniform sampler2D uFront;
uniform sampler2D uRear;
uniform vec4 uRearBox;
uniform vec4 uSideBox;
uniform vec4 uPlanBox;
uniform vec4 uFrontBox;
uniform float uBelt;
uniform float uGlassA;
uniform float uLamp;
uniform vec4 uWheel; // zf, zr, R, arch
vec4 mk(sampler2D t, vec4 b, vec2 p) {
  vec2 uv = vec2((p.x - b.x) / (b.y - b.x), (p.y - b.z) / (b.w - b.z));
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec4(0.0);
  return texture2D(t, uv);
}`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
vec3 cn = normalize(vCarN);
float sideW = smoothstep(0.4, 0.62, abs(cn.x));
vec4 sm = mk(uSide, uSideBox, vec2(vCarP.z, vCarP.y));
float topW = smoothstep(0.08, 0.3, cn.y) * smoothstep(uBelt - 0.02, uBelt + 0.02, vCarP.y);
vec4 pm = mk(uPlan, uPlanBox, vec2(vCarP.x, vCarP.z));
float frontW = smoothstep(0.18, 0.5, cn.z);
vec4 fm = mk(uFront, uFrontBox, vec2(vCarP.x, vCarP.y));
float rearW = smoothstep(0.25, 0.55, -cn.z);
vec4 rm = mk(uRear, uRearBox, vec2(vCarP.x, vCarP.y));
float qGlass = max(max(sideW * sm.r, topW * pm.r), rearW * rm.r);
float qTrim = max(sideW * sm.g, topW * pm.g);
float qLens = frontW * fm.r;
float qLed = frontW * fm.b;
float qIntake = frontW * fm.g;
// the wheel wells: the arch's inner surface, facing the axle, in matte black
float qWell = 0.0;
for (int i = 0; i < 2; i++) {
  float zw = i == 0 ? uWheel.x : uWheel.y;
  vec2 rd = vec2(vCarP.z - zw, vCarP.y - uWheel.z);
  float d = length(rd);
  float inward = -dot(normalize(rd), vec2(cn.z, cn.y));
  qWell = max(qWell, (1.0 - smoothstep(uWheel.w - 0.005, uWheel.w + 0.03, d)) * smoothstep(0.2, 0.55, inward) * (1.0 - smoothstep(0.88, 0.97, abs(cn.x))));
}
qIntake = max(qIntake, qWell);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.012), max(qGlass, qLens));
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.018), max(qTrim, qIntake));
diffuseColor.a = mix(1.0, uGlassA, qGlass * (1.0 - qTrim));`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor, 0.04, max(qGlass, qLens));
roughnessFactor = mix(roughnessFactor, 0.5, qIntake);
roughnessFactor = mix(roughnessFactor, 0.92, qWell);`,
      )
      .replace(
        '#include <metalnessmap_fragment>',
        `#include <metalnessmap_fragment>
metalnessFactor = mix(metalnessFactor, 0.0, max(max(qGlass, qLens), max(qTrim, qIntake)));`,
      )
      .replace(
        '#include <lights_physical_fragment>',
        `#include <lights_physical_fragment>
#ifdef USE_CLEARCOAT
// v4 fix: no clear coat inside the wheel wells (at night the coat mirrored the warm lamp as a gold crescent round the tyre)
material.clearcoat *= 1.0 - qWell;
#endif`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
totalEmissiveRadiance += qLed * mix(vec3(0.75), vec3(2.6), uLamp);`,
      );
  };
  return {mat, uniforms};
};

// ---- the rims --------------------------------------------------------------------------------------------------------
const makeRim = (Rr: number, side: number, mats: {rim: THREE.Material; barrel: THREE.Material; cap: THREE.Material}) => {
  const g = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, f: (m: THREE.Mesh) => void) => {
    geos.push(geo);
    const m = new THREE.Mesh(geo, mat);
    f(m);
    g.add(m);
  };
  // the barrel (dark, recessed), the lip
  add(new THREE.CylinderGeometry(Rr - 0.012, Rr - 0.012, 0.012, 48), mats.barrel, (m) => {
    m.rotation.z = Math.PI / 2;
    m.position.x = -side * 0.05;
  });
  add(new THREE.TorusGeometry(Rr - 0.012, 0.011, 10, 64), mats.rim, (m) => {
    m.rotation.y = Math.PI / 2;
  });
  // five twin spokes, dished toward the hub
  for (let i = 0; i < 5; i++) {
    for (const d of [-0.12, 0.12]) {
      const a = (i / 5) * Math.PI * 2 + 0.3 + d;
      const len = Rr - 0.05;
      add(new THREE.BoxGeometry(0.018, len, 0.026), mats.rim, (m) => {
        m.position.set(-side * 0.02, Math.cos(a) * (0.045 + len / 2), Math.sin(a) * (0.045 + len / 2));
        m.rotation.x = a;
        m.rotation.z = side * 0.06;
      });
    }
  }
  add(new THREE.CylinderGeometry(0.06, 0.066, 0.03, 32), mats.rim, (m) => {
    m.rotation.z = Math.PI / 2;
    m.position.x = side * 0.0;
  });
  add(new THREE.CylinderGeometry(0.034, 0.034, 0.034, 24), mats.cap, (m) => {
    m.rotation.z = Math.PI / 2;
    m.position.x = side * 0.004;
  });
  return {g, geos};
};

// ---- a canvas texture --------------------------------------------------------------------------------------------------
export const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const g = cv.getContext('2d');
  if (!g) throw new Error('no 2d');
  draw(g);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
};

/** her paper: off-white, a fold, the number in blue ballpoint, the digits after the 5 hidden as dots */
const notePaper = () =>
  canvasTex(640, 400, (g) => {
    const grd = g.createLinearGradient(0, 0, 640, 400);
    grd.addColorStop(0, '#FFFEFA');
    grd.addColorStop(1, '#EFECE4');
    g.fillStyle = grd;
    g.fillRect(0, 0, 640, 400);
    g.fillStyle = 'rgba(0,0,0,0.06)';
    g.fillRect(318, 0, 4, 400);
    g.strokeStyle = '#1D3DB0';
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.lineWidth = 16;
    // a hand-written 5
    g.beginPath();
    g.moveTo(132, 112);
    g.lineTo(76, 116);
    g.lineTo(66, 196);
    g.quadraticCurveTo(110, 168, 138, 206);
    g.quadraticCurveTo(156, 254, 112, 276);
    g.quadraticCurveTo(82, 290, 58, 266);
    g.stroke();
    g.fillStyle = '#1D3DB0';
    const groups = [[176, 214], [292, 330], [408, 446], [524, 562]];
    groups.forEach(([a, b], i) => {
      [a, b].forEach((x, j) => {
        g.beginPath();
        g.arc(x, 206 + Math.sin((i * 2 + j) * 1.7) * 5, 14, 0, Math.PI * 2);
        g.fill();
      });
    });
  });

/** the printed card: the real card of the app's screen (08-qr-card), cropped from the capture */
const useCardTex = () => {
  const [t, setT] = useState<THREE.Texture | null>(null);
  const [h] = useState(() => delayRender('diagpromo card texture'));
  useEffect(() => {
    const img = new Image();
    img.src = staticFile('screens/08-qr-card.jpg');
    img
      .decode()
      .then(() => {
        const tex = canvasTex(1024, 576, (g) => {
          g.fillStyle = '#fff';
          g.fillRect(0, 0, 1024, 576);
          // the card on the capture: x 137..944, y 354..807 (1080 x 2346)
          g.drawImage(img, 141, 358, 799, 445, 0, 0, 1024, 576);
        });
        setT(tex);
        continueRender(h);
      })
      .catch((e) => cancelRender(e));
  }, [h]);
  return t;
};

// ---- the shadow on the ground --------------------------------------------------------------------------------------------
const SHADOW_FRAG = /* glsl */ `
precision highp float;
uniform vec2 uHalf;
uniform float uA;
varying vec2 vUv;
float sdBox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main() {
  vec2 p = (vUv - 0.5) * 2.0 * (uHalf + vec2(0.6));
  float d = sdBox(p, uHalf, 0.35);
  float soft = 1.0 - smoothstep(-0.25, 0.55, d);
  float core = 1.0 - smoothstep(-0.35, 0.05, d);
  gl_FragColor = vec4(0.0, 0.0, 0.0, uA * (0.55 * soft * soft + 0.45 * core));
}`;
const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

// ---- the car ------------------------------------------------------------------------------------------------------------
export type Car3Props = {
  cam: CarCam;
  night?: number; // 0 the white studio .. 1 the evening street
  note?: number; // 0..1 her paper under the wiper (opacity)
  cardK?: number; // the printed card: 0 away (above, out of view) .. 1 standing behind the windscreen
  card?: boolean;
  cardA?: number; // the card's opacity (its cross-fade with a flat card landing on the glass)
  lamp?: number; // the DRLs: 0 off-white .. 1 lit
  street?: number; // the evening street lamp's warm light on the paint (roof, hood), 0..1
  shadow?: number;
  glassA?: number; // the glass's opacity (lower: the card shows through)
  sheen?: number; // -1..1: a sweep of light across the glass (the reflection's position); null: none
  yaw?: number; // the car turned about its vertical axis (degrees)
  w?: number; // the canvas (default the frame, 1080 x 1920)
  h?: number;
  paint?: string; // the body's paint (default her cobalt); a neighbour's car in neutral grey
  at?: [number, number]; // the car moved on the ground (x, z metres), after its yaw
  lift?: number; // the car raised on the lift (metres); its contact shadow stays on the floor, softer
  hood?: number; // v2 (the art director: open on the mechanic in the engine bay): 0 the bonnet shut .. 1 open (about 58 degrees)
  bayLamp?: number; // the work lamp hung from the open bonnet's edge over the engine (0 off .. 1 lit)
  design?: DesignName; // v2: the film's own crossover by default; 'sedan' for the lot's other cars
  bayDim?: number; // v2: the engine bay's parts a step darker or lighter (1 as built)
  cool?: number; // v2: a cool white light (a fluorescent tube, the open door's sky) that keeps the graphite grey at night
  coolFrom?: [number, number, number];
};

/** v2: the film's own car's paint (a graphite metallic, never the cobalt of the earlier promos) */
export const GRAPHITE = '#77736E';

// ---- the open bonnet and the engine bay (v2) --------------------------------------------------------------------------------
// The bonnet's outline in plan (the design's own shut lines: x +-0.7 at the scuttle, +-0.8 at the nose, the leading edge's
// curve to z 2.37) and its hinge at the scuttle. The bay is the bonnet's own surface (raycast from above) painted as the dark
// engine bay, with the engine cover, the strut tops, the battery, the reservoirs and their caps standing on it.
// v2: the engine bay in detail (the art director: "the engine bay gets real detail, still refined"), in plan (x, z metres) on
// the bonnet's own surface: a transverse four with its cover, the row of four ignition coils behind it, the air box and its
// intake hose, the radiator hose, the strut tops, the battery, the fuse box, the reservoirs and their caps, the cross member
type BayPart = {kind: 'rbox' | 'box' | 'cyl'; at: [number, number]; size: [number, number, number]; color: number; up?: number; metal?: number; rough?: number; rotY?: number};
const BAY_PARTS: BayPart[] = [
  // the engine block's top (the cam cover) and its plastic cover, a step lighter, with a raised centre panel
  {kind: 'rbox', at: [0, 1.46], size: [0.74, 0.09, 0.36], color: 0x1d1e21, metal: 0.5, rough: 0.38},
  {kind: 'rbox', at: [0.04, 1.52], size: [0.5, 0.05, 0.22], color: 0x303237, up: 0.085, metal: 0.35, rough: 0.3},
  {kind: 'rbox', at: [0.04, 1.52], size: [0.3, 0.02, 0.12], color: 0x3c3f45, up: 0.13, metal: 0.4, rough: 0.26},
  // the four coils in a row behind the cover, each with its connector
  ...[-0.27, -0.09, 0.09, 0.27].flatMap((x): BayPart[] => [
    {kind: 'rbox', at: [x, 1.33], size: [0.085, 0.07, 0.1], color: 0x121214, up: 0.085, rough: 0.5},
    {kind: 'rbox', at: [x, 1.305], size: [0.05, 0.035, 0.045], color: 0x5a5d63, up: 0.15, rough: 0.45, metal: 0.2},
  ]),
  // the oil filler cap (amber) on the cam cover
  {kind: 'cyl', at: [-0.28, 1.56], size: [0.034, 0.03, 0], color: 0xd9a21f, up: 0.09, rough: 0.4},
  // the strut tops
  {kind: 'cyl', at: [0.6, 1.14], size: [0.085, 0.04, 0], color: 0x1c1c1e, rough: 0.6},
  {kind: 'cyl', at: [-0.6, 1.14], size: [0.085, 0.04, 0], color: 0x1c1c1e, rough: 0.6},
  {kind: 'cyl', at: [0.6, 1.14], size: [0.03, 0.03, 0], color: 0x6b6e74, up: 0.04, metal: 0.8, rough: 0.3},
  {kind: 'cyl', at: [-0.6, 1.14], size: [0.03, 0.03, 0], color: 0x6b6e74, up: 0.04, metal: 0.8, rough: 0.3},
  // the battery (its red plus cap), the fuse box beside it
  {kind: 'rbox', at: [0.52, 1.86], size: [0.25, 0.12, 0.17], color: 0x111112, rough: 0.5},
  {kind: 'box', at: [0.42, 1.8], size: [0.045, 0.025, 0.035], color: 0xb3261e, up: 0.12, rough: 0.5},
  {kind: 'box', at: [0.62, 1.8], size: [0.04, 0.02, 0.03], color: 0x26272a, up: 0.12, rough: 0.5},
  {kind: 'rbox', at: [0.52, 1.5], size: [0.16, 0.08, 0.2], color: 0x1a1b1e, rough: 0.45},
  // the air box (left front) with its lid's ribs, the coolant reservoir and the brake fluid's (pale), their black caps
  {kind: 'rbox', at: [-0.5, 1.88], size: [0.3, 0.14, 0.3], color: 0x141416, rough: 0.55},
  {kind: 'rbox', at: [-0.5, 1.88], size: [0.24, 0.02, 0.24], color: 0x202125, up: 0.14, rough: 0.5},
  {kind: 'rbox', at: [-0.58, 1.48], size: [0.15, 0.09, 0.13], color: 0xcfc8b8, rough: 0.45},
  {kind: 'cyl', at: [-0.58, 1.48], size: [0.03, 0.025, 0], color: 0x151515, up: 0.09, rough: 0.5},
  {kind: 'rbox', at: [0.35, 1.08], size: [0.09, 0.07, 0.08], color: 0xc9b98f, rough: 0.45},
  {kind: 'cyl', at: [0.35, 1.08], size: [0.022, 0.02, 0], color: 0x151515, up: 0.07, rough: 0.5},
  // the radiator's cross member and the bonnet latch
  {kind: 'box', at: [0, 2.14], size: [1.4, 0.04, 0.07], color: 0x101011, rough: 0.6},
  {kind: 'box', at: [0, 2.14], size: [0.1, 0.03, 0.05], color: 0x56585e, up: 0.04, metal: 0.7, rough: 0.35},
];
/** the hoses (centre lines in x, y-above-the-surface, z; radius): the intake from the air box to the throttle, the radiator's
 *  upper hose, a vacuum line along the cover */
const BAY_HOSES: {pts: [number, number, number][]; r: number; color: number}[] = [
  {pts: [[-0.42, 0.16, 1.76], [-0.36, 0.2, 1.66], [-0.3, 0.16, 1.58], [-0.28, 0.12, 1.5]], r: 0.042, color: 0x161618},
  {pts: [[0.2, 0.06, 2.06], [0.26, 0.1, 1.86], [0.24, 0.1, 1.7], [0.18, 0.1, 1.64]], r: 0.026, color: 0x141415},
  {pts: [[0.32, 0.12, 1.42], [0.36, 0.14, 1.3], [0.42, 0.12, 1.2], [0.46, 0.06, 1.12]], r: 0.01, color: 0x0e0e0f},
];

/** where a point of the car (metres) lands on a canvas of w x h seen by `cam` (the same camera CarGL sets up) */
export const projectCar = (c: CarCam, p: [number, number, number], w = 1080, h = 1920) => {
  const cam = new THREE.PerspectiveCamera(c.fov, w / h, 0.05, 200);
  cam.position.set(...c.pos);
  cam.up.set(0, 1, 0);
  cam.lookAt(new THREE.Vector3(...c.target));
  if (c.roll) cam.rotateZ((c.roll * Math.PI) / 180);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
  const v = new THREE.Vector3(...p).project(cam);
  return {x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h};
};

type Hit = {p: THREE.Vector3; n: THREE.Vector3};

const CarGL: React.FC<Car3Props & {model: Model; cardTex: THREE.Texture}> = (p) => {
  const {gl, camera} = useThree();
  const NAME: DesignName = p.design ?? 'suv';
  const D = DESIGNS[NAME];
  const F = FIT[NAME];
  const HINGE_Z = F.hinge;
  const halfW = F.halfW;
  const noseZ = F.noseZ;
  const k = 4 / D.len;
  const nightQ = Math.round((p.night ?? 0) * 8) / 8;
  const env = useMemo(() => makeEnv(gl, {night: nightQ}), [gl, nightQ]);
  useEffect(() => () => env.dispose(), [env]);
  const masks = useMemo(() => makeMasks(NAME), [NAME]);
  const geo = useMemo(() => {
    const m = p.model;
    const nb = m.bodyTri ?? m.tri.length / 3;
    const mk = (idx: Uint32Array) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(m.pos, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(m.proc!.vn, 3));
      g.setIndex(new THREE.BufferAttribute(idx, 1));
      return g;
    };
    const body = mk(m.tri.slice(0, nb * 3));
    // v4 fix: the tyres' triangles come wound inside out (the near wall culled: at night the far wall's inside lit up as a
    // gold crescent and the tyre looked see-through); turned round here, their normals were right
    const tt = m.tri.slice(nb * 3);
    for (let i = 0; i + 2 < tt.length; i += 3) {
      const a = tt[i + 1];
      tt[i + 1] = tt[i + 2];
      tt[i + 2] = a;
    }
    const tyres = mk(tt);
    // the designer's lines: the shut lines, lamps and intakes (not the rims: real rims are built below, nor the cabin)
    const f = m.proc!.feat;
    const W = D.wheels;
    const keep: number[] = [];
    for (let s = 0; s < m.proc!.nF; s++) {
      const a = [f[s * 6] / k, f[s * 6 + 1] / k, f[s * 6 + 2] / k];
      const b = [f[s * 6 + 3] / k, f[s * 6 + 4] / k, f[s * 6 + 5] / k];
      const nearWheel = [W.zf, W.zr].some((zw) => Math.hypot(a[2] - zw, a[1] - W.R) < W.Rr + 0.01 && Math.abs(a[0]) > W.x - 0.2);
      const inside = Math.abs(a[0]) < 0.72 && a[1] > 0.45 && a[1] < D.belt + 0.2 && a[2] > -1.3 && a[2] < 0.75 && Math.abs(b[0]) < 0.72;
      if (nearWheel || inside) continue;
      keep.push(...f.slice(s * 6, s * 6 + 6));
    }
    const lines = new THREE.BufferGeometry();
    lines.setAttribute('position', new THREE.BufferAttribute(new Float32Array(keep), 3));
    return {body, tyres, lines};
  }, [p.model, D, k]);
  const body = useMemo(() => makeBodyMat(env.texture, masks, k, NAME), [env, masks, k, NAME]);
  const mats = useMemo(
    () => ({
      interior: new THREE.MeshStandardMaterial({color: 0x0c0c0d, roughness: 0.9, metalness: 0, side: THREE.BackSide}),
      // v4 fix (the art director: "a gold ring floats outside a see-through tyre" in warm and night light): the tyre a touch
      // lighter and catching the light at night so its sidewall reads; the rim's mirror calmer at night; the arch's lip matte
      tyre: new THREE.MeshStandardMaterial({color: 0x171717, roughness: 0.78, metalness: 0, envMap: env.texture, envMapIntensity: 0.6 + 0.2 * nightQ}),
      rim: new THREE.MeshPhysicalMaterial({color: 0x9da0a6, roughness: 0.22 + 0.08 * nightQ, metalness: 1, envMap: env.texture, envMapIntensity: 1.1 - 0.45 * nightQ, clearcoat: 0.6 * (1 - nightQ)}),
      lip: new THREE.MeshStandardMaterial({color: 0x0c0c0d, roughness: 0.88, metalness: 0, envMap: env.texture, envMapIntensity: 0.3}),
      barrel: new THREE.MeshStandardMaterial({color: 0x1a1a1c, roughness: 0.6, metalness: 0.4, envMap: env.texture, envMapIntensity: 0.5}),
      cap: new THREE.MeshStandardMaterial({color: 0x0d0d0e, roughness: 0.3, metalness: 0.2, envMap: env.texture}),
      wiper: new THREE.MeshStandardMaterial({color: 0x0b0b0b, roughness: 0.55, metalness: 0.2, envMap: env.texture, envMapIntensity: 0.6}),
      line: new THREE.LineBasicMaterial({color: 0x000000, transparent: true, opacity: 0.38}),
    }),
    [env, nightQ],
  );
  const lips = useMemo(() => {
    const W = D.wheels;
    const geo2 = new THREE.TorusGeometry(W.arch + 0.004, 0.016, 8, 72, Math.PI * 1.08);
    const out: {pos: [number, number, number]; rot: [number, number, number]}[] = [];
    for (const z of [W.zf, W.zr]) for (const sx of [-1, 1]) out.push({pos: [sx * (W.x + W.w / 2 + 0.035), W.R, z], rot: [Math.PI * (0.5 - 0.04) - Math.PI / 2 - 0.04, Math.PI / 2, 0]});
    return {geo: geo2, out};
  }, [D]);
  const rims = useMemo(() => {
    const W = D.wheels;
    const out: {g: THREE.Group; geos: THREE.BufferGeometry[]}[] = [];
    for (const z of [W.zf, W.zr])
      for (const sx of [-1, 1]) {
        const r = makeRim(W.Rr, sx, mats);
        r.g.position.set(sx * (W.x + W.w / 2 - 0.012), W.R, z);
        out.push(r);
      }
    return out;
  }, [D, mats]);
  // the surface under a point (x, z) of the plan, from above: the glass for the note, the wipers and the card
  const bodyMesh = useMemo(() => new THREE.Mesh(geo.body, new THREE.MeshBasicMaterial()), [geo]);
  const hit = useMemo(() => {
    bodyMesh.scale.setScalar(1 / k);
    bodyMesh.updateMatrixWorld(true);
    const rc = new THREE.Raycaster();
    return (x: number, z: number): Hit | null => {
      rc.set(new THREE.Vector3(x, 3, z), new THREE.Vector3(0, -1, 0));
      const h = rc.intersectObject(bodyMesh, false)[0];
      if (!h || !h.face) return null;
      const n = h.face.normal.clone().normalize();
      return {p: h.point.clone(), n};
    };
  }, [bodyMesh, k]);
  // a frame on the glass at (x, z): its origin on the surface, its y axis up the glass, its normal out
  const onGlass = useMemo(
    () => (x: number, z: number, lift: number, rot = 0) => {
      const a = hit(x, z);
      const b = hit(x, z - 0.12);
      if (!a || !b) return null;
      const up = b.p.clone().sub(a.p).normalize();
      const n = a.n;
      const right = new THREE.Vector3().crossVectors(up, n).normalize();
      const up2 = new THREE.Vector3().crossVectors(n, right).normalize();
      const m = new THREE.Matrix4().makeBasis(right, up2, n);
      const q = new THREE.Quaternion().setFromRotationMatrix(m);
      if (rot) q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), (rot * Math.PI) / 180));
      return {pos: a.p.clone().add(n.clone().multiplyScalar(lift)), q};
    },
    [hit],
  );
  const noteTex = useMemo(() => notePaper(), []);
  const noteAt = useMemo(() => onGlass(0.3, 0.7, 0.006, -4), [onGlass]);
  const cardAt = useMemo(() => onGlass(-0.26, 0.62, -0.035, 0), [onGlass]);
  const wipers = useMemo(
    () =>
      [
        [-0.56, 0.0],
        [0.0, 0.58],
      ].map(([x0, x1]) => {
        const a = hit(x0, F.wiperZ);
        const b = hit(x1, F.wiperZ - 0.02);
        if (!a || !b) return null;
        const c = a.p.clone().add(b.p).multiplyScalar(0.5);
        const len = a.p.distanceTo(b.p);
        const dir = b.p.clone().sub(a.p).normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
        return {c: c.add(a.n.clone().multiplyScalar(0.012)), len, q};
      }),
    [hit],
  );
  // v2: the open bonnet and the engine bay, built on the real bonnet surface
  const bay = useMemo(() => {
    const NX = 18;
    const NZ = 16;
    const surf = (u: number, v: number) => {
      const zl = HINGE_Z + v * (2.3 - HINGE_Z);
      const x = u * halfW(zl);
      const z = HINGE_Z + v * (noseZ(Math.abs(x)) - HINGE_Z);
      const h = hit(x, z);
      return new THREE.Vector3(x, h ? h.p.y : 0.9 - 0.11 * v, z);
    };
    const grid = (lift: number, inset: number) => {
      const pos: number[] = [];
      const idx: number[] = [];
      for (let j = 0; j <= NZ; j++)
        for (let i = 0; i <= NX; i++) {
          const q = surf((-1 + (2 * i) / NX) * (1 - inset), inset * 0.5 + (j / NZ) * (1 - inset));
          pos.push(q.x, q.y + lift, q.z);
        }
      for (let j = 0; j < NZ; j++)
        for (let i = 0; i < NX; i++) {
          const a = j * (NX + 1) + i;
          const b = a + 1;
          const c = a + NX + 1;
          const d = c + 1;
          // wound so the normal points up (+y): (a, c, b) with z growing along j and x along i
          idx.push(a, c, b, b, c, d);
        }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    };
    const floor = grid(0.006, 0.02);
    // the bonnet panel in the hinge's frame (its scuttle edge on the hinge line)
    const panel = grid(0.0, 0);
    const hy = surf(0, 0).y;
    panel.translate(0, -hy, -HINGE_Z);
    const dim = p.bayDim ?? 1;
    const parts = BAY_PARTS.map((b) => {
      const h = hit(b.at[0], b.at[1]);
      const y = (h ? h.p.y : 0.86) + 0.006;
      const g = b.kind === 'cyl' ? new THREE.CylinderGeometry(b.size[0], b.size[0], b.size[1], 28) : b.kind === 'rbox' ? new RoundedBoxGeometry(b.size[0], b.size[1], b.size[2], 3, Math.min(b.size[0], b.size[1], b.size[2]) * 0.3) : new THREE.BoxGeometry(...b.size);
      const m = new THREE.MeshStandardMaterial({color: new THREE.Color(b.color).multiplyScalar(dim), roughness: b.rough ?? 0.5, metalness: b.metal ?? 0.1, envMap: env.texture, envMapIntensity: 0.55});
      return {g, m, pos: [b.at[0], y + (b.up ?? 0) + b.size[1] / 2, b.at[1]] as [number, number, number]};
    });
    // the hoses: tubes along their centre lines, each point lifted off the bay's surface under it
    const hoses = BAY_HOSES.map((q) => {
      const pts = q.pts.map(([x, up, z]) => {
        const h = hit(x, z);
        return new THREE.Vector3(x, (h ? h.p.y : 0.86) + up, z);
      });
      const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, q.r, 14, false);
      const m = new THREE.MeshStandardMaterial({color: new THREE.Color(q.color).multiplyScalar(dim), roughness: 0.62, metalness: 0.05, envMap: env.texture, envMapIntensity: 0.5});
      return {g, m};
    });
    const tube = new THREE.CylinderGeometry(0.022, 0.022, 0.34, 20);
    const cable = new THREE.CylinderGeometry(0.004, 0.004, 1, 6);
    return {floor, panel, hy, parts, hoses, tube, cable};
  }, [hit, env, p.bayDim, HINGE_Z, halfW, noseZ]);
  const bayMats = useMemo(
    () => ({
      floor: new THREE.MeshStandardMaterial({color: 0x121213, roughness: 0.82, metalness: 0.1, envMap: env.texture, envMapIntensity: 0.35}),
      paint: new THREE.MeshPhysicalMaterial({color: 0x1f47b6, roughness: 0.32, metalness: 0.55, clearcoat: 1, clearcoatRoughness: 0.08, envMap: env.texture, envMapIntensity: 1, side: THREE.FrontSide}),
      under: new THREE.MeshStandardMaterial({color: 0x26272a, roughness: 0.92, metalness: 0, envMap: env.texture, envMapIntensity: 0.3, side: THREE.BackSide}),
      lamp: new THREE.MeshBasicMaterial({color: 0xffe2b4, toneMapped: false}),
      cable: new THREE.MeshStandardMaterial({color: 0x0c0c0c, roughness: 0.8}),
    }),
    [env],
  );
  useEffect(
    () => () => {
      bay.floor.dispose();
      bay.panel.dispose();
      [...bay.parts, ...bay.hoses].forEach((q) => {
        q.g.dispose();
        q.m.dispose();
      });
      bay.tube.dispose();
      bay.cable.dispose();
      Object.values(bayMats).forEach((m) => m.dispose());
    },
    [bay, bayMats],
  );
  const shade = useMemo(() => {
    const geo2 = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.ShaderMaterial({vertexShader: VERT, fragmentShader: SHADOW_FRAG, transparent: true, depthWrite: false, uniforms: {uHalf: {value: new THREE.Vector2(F.shadow[0], F.shadow[1])}, uA: {value: 0.5}}});
    return {geo: geo2, mat};
  }, [F]);
  useEffect(
    () => () => {
      geo.body.dispose();
      geo.tyres.dispose();
      geo.lines.dispose();
      body.mat.dispose();
      Object.values(mats).forEach((m) => m.dispose());
      rims.forEach((r) => r.geos.forEach((g) => g.dispose()));
      noteTex.dispose();
      shade.geo.dispose();
      shade.mat.dispose();
    },
    [geo, body, mats, rims, noteTex, shade],
  );

  gl.toneMapping = THREE.NeutralToneMapping;
  gl.toneMappingExposure = 1;
  const cam = camera as THREE.PerspectiveCamera;
  cam.fov = p.cam.fov;
  cam.aspect = (p.w ?? 1080) / (p.h ?? 1920);
  cam.near = 0.05;
  cam.far = 200;
  cam.position.set(...p.cam.pos);
  cam.up.set(0, 1, 0);
  cam.lookAt(new THREE.Vector3(...p.cam.target));
  if (p.cam.roll) cam.rotateZ((p.cam.roll * Math.PI) / 180);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();

  body.uniforms.uGlassA.value = p.glassA ?? 0.86;
  const hoodK = Math.max(0, Math.min(1, p.hood ?? 0));
  const hoodA = -hoodK * 58 * (Math.PI / 180);
  bayMats.paint.color.set(p.paint ?? GRAPHITE);
  const lampK = Math.max(0, Math.min(1, p.bayLamp ?? 0));
  // the lamp hangs from the open bonnet's leading edge on its cable, over the engine cover
  const edge = new THREE.Vector3(0, 0, noseZ(0) - HINGE_Z - 0.06).applyAxisAngle(new THREE.Vector3(1, 0, 0), hoodA).add(new THREE.Vector3(0, bay.hy, HINGE_Z));
  const lampPos = new THREE.Vector3(0.05, bay.hy + 0.5, edge.z - 0.06);
  const cableLen = Math.max(0.05, edge.y - (lampPos.y + 0.17));
  body.mat.color.set(p.paint ?? GRAPHITE);
  body.uniforms.uLamp.value = p.lamp ?? 0;
  shade.mat.uniforms.uA.value = 0.55 * (p.shadow ?? 1) / (1 + 1.6 * (p.lift ?? 0));
  const cardK = p.cardK ?? 0;
  const yaw = ((p.yaw ?? 0) * Math.PI) / 180;

  return (
    <group rotation={[0, yaw, 0]} position={p.at ? [p.at[0], p.lift ?? 0, p.at[1]] : [0, p.lift ?? 0, 0]}>
      {(p.night ?? 0) > 0.01 ? <pointLight position={[-3.2, 5.2, 3.2]} color="#FFC27E" intensity={3.2 * (p.night ?? 0) * (1 + 0.6 * (p.street ?? 0))} decay={0} /> : null}
      {(p.street ?? 0) > 0.01 ? <pointLight position={[-3.4, 4.8, 0.2]} color="#FFC788" intensity={3.6 * (p.street ?? 0)} decay={0} /> : null}
      {(p.street ?? 0) > 0.01 ? <pointLight position={[1.5, 3.2, 6.5]} color="#F2B27A" intensity={1.1 * (p.street ?? 0)} decay={0} /> : null}
      {(p.night ?? 0) < 0.99 ? <directionalLight position={[-3, 6, 4]} color="#FFFFFF" intensity={0.5 * (1 - (p.night ?? 0))} /> : null}
      {(p.cool ?? 0) > 0.01 ? <directionalLight position={p.coolFrom ?? [4, 5, -3]} color="#DCE6F5" intensity={1.6 * (p.cool ?? 0)} /> : null}
      {(p.cool ?? 0) > 0.01 ? <pointLight position={[0, 3.6, 0]} color="#E8EEF8" intensity={1.2 * (p.cool ?? 0)} decay={0} /> : null}
      <mesh geometry={shade.geo} material={shade.mat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002 - (p.lift ?? 0), 0.05]} scale={[1.9 * 1.0 + 1.2 + 1.2 * (p.lift ?? 0), 4.7 + 1.2 + 1.2 * (p.lift ?? 0), 1]} renderOrder={-1} />
      {hoodK > 0.001 ? (
        <>
          <mesh geometry={bay.floor} material={bayMats.floor} renderOrder={6} />
          {bay.parts.map((q, i) => (
            <mesh key={`bp${i}`} geometry={q.g} material={q.m} position={q.pos} renderOrder={6} />
          ))}
          {bay.hoses.map((q, i) => (
            <mesh key={`bh${i}`} geometry={q.g} material={q.m} renderOrder={6} />
          ))}
          <group position={[0, bay.hy, HINGE_Z]} rotation={[hoodA, 0, 0]}>
            <mesh geometry={bay.panel} material={bayMats.paint} position={[0, 0.012, 0]} renderOrder={6} />
            <mesh geometry={bay.panel} material={bayMats.under} position={[0, 0.0, 0]} renderOrder={6} />
          </group>
          {lampK > 0.001 ? (
            <>
              <mesh geometry={bay.cable} material={bayMats.cable} position={[0.05, lampPos.y + 0.17 + cableLen / 2, lampPos.z]} scale={[1, cableLen, 1]} />
              <mesh geometry={bay.tube} material={bayMats.lamp} position={[lampPos.x, lampPos.y, lampPos.z]} />
              <pointLight position={[lampPos.x, lampPos.y - 0.05, lampPos.z]} color="#FFC98E" intensity={1.6 * lampK} distance={3.2} decay={1.2} />
            </>
          ) : null}
        </>
      ) : null}
      <group scale={1 / k}>
        <mesh geometry={geo.body} material={mats.interior} renderOrder={0} />
        <mesh geometry={geo.tyres} material={mats.tyre} />
        <mesh geometry={geo.body} material={body.mat} renderOrder={5} />
        <lineSegments geometry={geo.lines} material={mats.line} renderOrder={6} />
      </group>
      {rims.map((r, i) => (
        <primitive key={i} object={r.g} />
      ))}
      {lips.out.map((l, i) => (
        <mesh key={`l${i}`} geometry={lips.geo} material={mats.lip} position={l.pos} rotation={[-0.04 * Math.PI, Math.PI / 2, 0]} />
      ))}
      {wipers.map((w, i) =>
        w ? (
          <mesh key={i} position={w.c} quaternion={w.q} material={mats.wiper} renderOrder={7}>
            <boxGeometry args={[w.len, 0.014, 0.012]} />
          </mesh>
        ) : null,
      )}
      {p.note && p.note > 0.001 && noteAt ? (
        <mesh position={noteAt.pos} quaternion={noteAt.q} renderOrder={8}>
          <planeGeometry args={[0.24, 0.15]} />
          <meshStandardMaterial map={noteTex} roughness={0.85} metalness={0} transparent opacity={p.note} envMap={env.texture} envMapIntensity={0.9} emissive={new THREE.Color(1, 1, 1)} emissiveMap={noteTex} emissiveIntensity={0.35} />
        </mesh>
      ) : null}
      {p.card && cardAt && cardK > 0.001 ? (
        <mesh
          position={cardAt.pos.clone().add(new THREE.Vector3(0, (1 - cardK) * 2.4, (1 - cardK) * -0.3))}
          quaternion={cardAt.q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), (1 - cardK) * 0.9))}
          renderOrder={3}
        >
          <planeGeometry args={[0.36, 0.2]} />
          <meshBasicMaterial map={p.cardTex} toneMapped={false} side={THREE.DoubleSide} transparent={(p.cardA ?? 1) < 1} opacity={p.cardA ?? 1} />
        </mesh>
      ) : null}
    </group>
  );
};

export const Car3: React.FC<Car3Props & {opacity?: number; style?: React.CSSProperties}> = ({opacity = 1, style, ...p}) => {
  const model = useModel(p.design ?? 'suv');
  const cardTex = useCardTex();
  const w = p.w ?? 1080;
  const h = p.h ?? 1920;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: w, height: h, opacity, ...style}}>
      {model && cardTex ? (
        <ThreeCanvas width={w} height={h} dpr={1} gl={{antialias: true, alpha: true}} style={{background: 'transparent'}}>
          <CarGL {...p} model={model} cardTex={cardTex} />
        </ThreeCanvas>
      ) : null}
    </div>
  );
};
