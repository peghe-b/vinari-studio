// Ported from the QR promo's kit (kit/car3d.tsx, 2026-10-14) on 2026-10-15 for the CarNight scene; drawn at the stage's
// scale (dpr STAGE.s) so the paint and the card stay sharp. The QR promo's car: the studio's procedural premium saloon (src/scenes/three/car.ts: an implicit solid in metres, surface
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
import {buildCarAsync, DESIGNS} from './car';
import type {Model} from './model';
import {makeEnv} from './carenv';
import {STAGE} from '../../tokens';
import {OBJ} from '../../lib/layer';
import {shadowOf} from '../../lib/guardrt';

const NAME = 'sedan';
type Pt = number[];

export type CarCam = {pos: [number, number, number]; target: [number, number, number]; fov: number; roll?: number};

// ---- the model -------------------------------------------------------------------------------------------------------
const useModel = () => {
  const [m, setM] = useState<Model | null>(null);
  const [h] = useState(() => delayRender('qrpromo car'));
  useEffect(() => {
    buildCarAsync(NAME)
      .then((x) => {
        setM(x);
        continueRender(h);
      })
      .catch((e) => cancelRender(e));
  }, [h]);
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

const makeMasks = () => {
  const D = DESIGNS[NAME];
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
    polyPath(g, G.back as Pt[], map, s);
    g.fill();
    // the black frit round the windscreen's edge
    g.strokeStyle = 'rgb(0,255,0)';
    g.lineWidth = 0.03 * s;
    polyPath(g, G.front as Pt[], map, s);
    g.stroke();
  });
  // front (x, y): R the headlamp lens (dark, glossy), B its LED line and the DRL stroke, G the intakes (matte black)
  const front = maskCanvas(FRONT_BOX, 800, (g, map, s) => {
    const lamp: Pt[] = [[0.4, 0.685, 0.02], [0.83, 0.735, 0.05], [0.885, 0.695, 0.04], [0.83, 0.648, 0.05], [0.44, 0.64, 0.02]];
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
      const a = map(sx * 0.47, 0.672);
      const b = map(sx * 0.82, 0.709);
      g.moveTo(a[0], a[1]);
      g.lineTo(b[0], b[1]);
      g.stroke();
    }
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = 'rgb(0,255,0)';
    const grille: Pt[] = [[-0.34, 0.645, 0.02], [0.34, 0.645, 0.02], [0.32, 0.69, 0.02], [-0.32, 0.69, 0.02]];
    const intake: Pt[] = [[-0.6, 0.235, 0.06], [0.6, 0.235, 0.06], [0.52, 0.44, 0.06], [-0.52, 0.44, 0.06]];
    const curtain: Pt[] = [[0.7, 0.27, 0.03], [0.8, 0.27, 0.03], [0.8, 0.5, 0.03], [0.72, 0.5, 0.03]];
    for (const p of [grille, intake, curtain, mirrorX(curtain)]) {
      polyPath(g, p, map, s);
      g.fill();
    }
  });
  return {side, plan, front};
};

// ---- the paint shader (MeshPhysicalMaterial + the masks) -------------------------------------------------------------
const boxU = (b: Box) => new THREE.Vector4(b[0], b[1], b[2], b[3]);
const makeBodyMat = (env: THREE.Texture, masks: ReturnType<typeof makeMasks>, k: number) => {
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
float qGlass = max(sideW * sm.r, topW * pm.r);
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
  const [h] = useState(() => delayRender('qrpromo card texture'));
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
};

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
  const D = DESIGNS[NAME];
  const k = 4 / D.len;
  const nightQ = Math.round((p.night ?? 0) * 8) / 8;
  const env = useMemo(() => makeEnv(gl, {night: nightQ}), [gl, nightQ]);
  useEffect(() => () => env.dispose(), [env]);
  const masks = useMemo(() => makeMasks(), []);
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
      const inside = Math.abs(a[0]) < 0.72 && a[1] > 0.45 && a[1] < 1.3 && a[2] > -1.3 && a[2] < 0.75 && Math.abs(b[0]) < 0.72;
      if (nearWheel || inside) continue;
      keep.push(...f.slice(s * 6, s * 6 + 6));
    }
    const lines = new THREE.BufferGeometry();
    lines.setAttribute('position', new THREE.BufferAttribute(new Float32Array(keep), 3));
    return {body, tyres, lines};
  }, [p.model, D, k]);
  const body = useMemo(() => makeBodyMat(env.texture, masks, k), [env, masks, k]);
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
        const a = hit(x0, 0.8);
        const b = hit(x1, 0.78);
        if (!a || !b) return null;
        const c = a.p.clone().add(b.p).multiplyScalar(0.5);
        const len = a.p.distanceTo(b.p);
        const dir = b.p.clone().sub(a.p).normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
        return {c: c.add(a.n.clone().multiplyScalar(0.012)), len, q};
      }),
    [hit],
  );
  const shade = useMemo(() => {
    const geo2 = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.ShaderMaterial({vertexShader: VERT, fragmentShader: SHADOW_FRAG, transparent: true, depthWrite: false, uniforms: {uHalf: {value: new THREE.Vector2(0.9, 2.35)}, uA: {value: 0.5}}});
    return {geo: geo2, mat};
  }, []);
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
  body.mat.color.set(p.paint ?? '#1F47B6');
  body.uniforms.uLamp.value = p.lamp ?? 0;
  shade.mat.uniforms.uA.value = 0.55 * (p.shadow ?? 1);
  const shaded = shadowOf(1) > 0; // no contact shadow in the frame guards' probe
  const cardK = p.cardK ?? 0;
  const yaw = ((p.yaw ?? 0) * Math.PI) / 180;

  return (
    <group rotation={[0, yaw, 0]} position={p.at ? [p.at[0], 0, p.at[1]] : [0, 0, 0]}>
      {(p.night ?? 0) > 0.01 ? <pointLight position={[-3.2, 5.2, 3.2]} color="#FFC27E" intensity={3.2 * (p.night ?? 0) * (1 + 0.6 * (p.street ?? 0))} decay={0} /> : null}
      {(p.street ?? 0) > 0.01 ? <pointLight position={[-3.4, 4.8, 0.2]} color="#FFC788" intensity={3.6 * (p.street ?? 0)} decay={0} /> : null}
      {(p.street ?? 0) > 0.01 ? <pointLight position={[1.5, 3.2, 6.5]} color="#F2B27A" intensity={1.1 * (p.street ?? 0)} decay={0} /> : null}
      {(p.night ?? 0) < 0.99 ? <directionalLight position={[-3, 6, 4]} color="#FFFFFF" intensity={0.5 * (1 - (p.night ?? 0))} /> : null}
      {shaded ? <mesh geometry={shade.geo} material={shade.mat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0.05]} scale={[1.9 * 1.0 + 1.2, 4.7 + 1.2, 1]} renderOrder={-1} /> : null}
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
  const model = useModel();
  const cardTex = useCardTex();
  const w = p.w ?? 1080;
  const h = p.h ?? 1920;
  return (
    // the car is a thing the frame guards keep whole (lib/layer.ts OBJ); its canvas is transparent round it
    <div className={OBJ} style={{position: 'absolute', left: 0, top: 0, width: w, height: h, opacity, ...style}}>
      {model && cardTex ? (
        <ThreeCanvas width={w} height={h} dpr={STAGE.s * (typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1)} gl={{antialias: true, alpha: true}} style={{background: 'transparent'}}>
          <CarGL {...p} model={model} cardTex={cardTex} />
        </ThreeCanvas>
      ) : null}
    </div>
  );
};
