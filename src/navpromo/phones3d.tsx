// The navigator promo's phone: the studio's REAL 3D iPhone (src/scenes/three/phone3d.tsx: its body, titanium, black glass,
// buttons, Dynamic Island, procedural studio light and display shader, copied here because their internals are not
// exported), posed by the shot in frame pixels every frame instead of the studio's fixed staging. The studio component is
// not used directly: it plays its own sound effects (this film's sound is one premixed track), it sits at one small fixed
// size when whole, and it cannot keep its screen off or switch to the dark studio for the reveal.
//
// The camera: one full-frame canvas, the studio's lens (its 26 degrees over a 596 px half height: a focal of 2580 frame px)
// whose axis runs through the phone's centre. A bigger phone is a closer camera, never a CSS scale, so the screen's text
// stays sharp. The display is the WHOLE capture (public/screens, 1080 x 2346): nothing of it is ever cropped. Its status bar
// is redrawn once, clean (the time, one bar of signal, the battery; no Wi-Fi glyph next to an offline claim), under a soft
// paper fade like iOS's own scroll edge. The highlight band is the film's cobalt (C.accA), the veil a light paper fog.
//
// Lift: a region of the real capture lifted out of the screen as a floating card. At k 0 it lies exactly on the turned
// screen (a CSS 3D transform with the same lens), at k 1 it is flat, big and in front.
import {useThree} from '@react-three/fiber';
import {ThreeCanvas} from '@remotion/three';
import React, {useEffect, useMemo, useState} from 'react';
import {cancelRender, continueRender, delayRender, Img, staticFile} from 'remotion';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {fontsLoaded} from '../fonts';
import {C, rgba} from '../tokens';
import {clamp, lerp} from './lib';

// ---- the body (world units: the display is 1 wide), the studio's ------------------------------------------------------------
export const SRC_W = 1080;
export const SRC_H = 2346;
export const SH = SRC_H / SRC_W;
const BEZ = 0.034;
export const BW = 1 + 2 * BEZ;
export const BH = SH + 2 * BEZ;
const SCR_R = 0.1409;
const DEPTH = 0.123;
const EDGE_T = 0.016;
const EDGE_S = 0.012;
const FRONT = DEPTH / 2;
const ISLAND = {cx: 540, cy: 86, hw: 171, hh: 52};
const TAPK = SRC_W / 640; // the studio's tap ring, in capture px per its window's px

// ---- the lens -------------------------------------------------------------------------------------------------------------------
export const FPX = 2580; // the studio's focal length in frame px
const VW = 1100; // the virtual view round the axis (wider than the frame either way)
const VH = 1940;
const D2R = Math.PI / 180;
const TAU = Math.PI * 2;

export type Pose = {x: number; y: number; w: number; yaw: number; pitch: number; roll?: number}; // centre (frame px), display width (px), degrees
export type Rect = {x: number; y: number; w: number; h: number};
export type Region = {x0: number; y0: number; x1: number; y1: number}; // capture fractions

const rotOf = (p: Pose) => new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-p.pitch * D2R, p.yaw * D2R, (p.roll ?? 0) * D2R, 'YXZ'));
const proj = (p: Pose, R: THREE.Matrix4, X: number, Y: number, Z: number) => {
  const v = new THREE.Vector3(X, Y, Z).applyMatrix4(R);
  const k = FPX / (FPX / p.w - v.z);
  return {x: p.x + v.x * k, y: p.y - v.y * k};
};
const boxOf = (pts: {x: number; y: number}[]): Rect => {
  const xs = pts.map((q) => q.x);
  const ys = pts.map((q) => q.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return {x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y};
};
/** a display point (capture fractions) on the frame */
export const project = (p: Pose, u: number, v: number) => proj(p, rotOf(p), u - 0.5, (0.5 - v) * SH, FRONT);
/** a capture region's bounds on the frame */
export const projectBox = (p: Pose, r: Region): Rect => {
  const R = rotOf(p);
  return boxOf([
    [r.x0, r.y0],
    [r.x1, r.y0],
    [r.x0, r.y1],
    [r.x1, r.y1],
  ].map(([u, v]) => proj(p, R, u - 0.5, (0.5 - v) * SH, FRONT)));
};
/** the whole body's bounds on the frame */
export const bodyBox = (p: Pose): Rect => {
  const R = rotOf(p);
  const pts: {x: number; y: number}[] = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) pts.push(proj(p, R, (sx * BW) / 2, (sy * BH) / 2, sz * FRONT));
  return boxOf(pts);
};
/** a pose whose lowest point sits on `foot` (frame y) */
export const atFoot = (p: Omit<Pose, 'y'>, foot: number): Pose => {
  const q: Pose = {...p, y: 0};
  const b = bodyBox(q);
  return {...q, y: foot - (b.y + b.h)};
};
/** a camera move about a frame point: the pose as the frame scales by s about (ox, oy) */
export const zoomAbout = (p: Pose, s: number, ox: number, oy: number): Pose => ({...p, x: ox + (p.x - ox) * s, y: oy + (p.y - oy) * s, w: p.w * s});
/** the studio's float: slow sines of the frame (degrees, px) */
export const float = (t: number) => ({pitch: 0.45 * Math.sin((TAU * t) / 176 + 0.4), roll: 0.28 * Math.sin((TAU * t) / 236 + 1.1), bob: 3 * Math.sin((TAU * t) / 150 + 0.2)});

// ---- the studio light: a PMREM of softboxes in a room, from the dark film's room (look 0) to the light one's (look 1) ----------
const WALLS: [number, number][] = [
  [0.004, 0.62],
  [0.004, 0.58],
  [0.012, 0.95],
  [0, 0.34],
  [0, 0.035],
  [0.004, 0.7],
];
const makeEnv = (gl: THREE.WebGLRenderer, look: number) => {
  const scene = new THREE.Scene();
  const disposables: {dispose(): void}[] = [];
  const basic = (v: number, side: THREE.Side) => {
    const m = new THREE.MeshBasicMaterial({color: new THREE.Color(v, v, v), side});
    disposables.push(m);
    return m;
  };
  const L = (d: number, l: number) => lerp(d, l, look);
  const roomGeo = new THREE.BoxGeometry(30, 30, 30);
  disposables.push(roomGeo);
  scene.add(new THREE.Mesh(roomGeo, WALLS.map(([d, l]) => basic(L(d, l), THREE.BackSide))));
  const panel = (w: number, h: number, x: number, y: number, z: number, v: number) => {
    const g = new THREE.PlaneGeometry(w, h);
    disposables.push(g);
    const m = new THREE.Mesh(g, basic(v, THREE.DoubleSide));
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  panel(7, 5, -5, 6, 7, L(3.2, 2.4));
  panel(1.1, 12, -7, 0.5, -3.5, L(5, 3.2));
  panel(1.1, 12, 7, 0.5, -3.5, L(4, 2.6));
  panel(12, 1.2, 0, 8, -1.5, L(3, 2.2));
  panel(1.6, 14, -8, 0.5, 1.2, L(2.6, 1.4));
  panel(1.6, 14, 8, 0.5, 1.2, L(2, 1.1));
  panel(14, 3, 0, -2.5, 11, L(0.07, 0.22));
  const pm = new THREE.PMREMGenerator(gl);
  const rt = pm.fromScene(scene, 0.03, 0.1, 60);
  pm.dispose();
  disposables.forEach((d) => d.dispose());
  return rt;
};

const roundedRect = (w: number, h: number, r: number) => {
  const s = new THREE.Shape();
  const x0 = -w / 2;
  const y0 = -h / 2;
  s.moveTo(x0 + r, y0);
  s.lineTo(x0 + w - r, y0);
  s.absarc(x0 + w - r, y0 + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x0 + w, y0 + h - r);
  s.absarc(x0 + w - r, y0 + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x0 + r, y0 + h);
  s.absarc(x0 + r, y0 + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x0, y0 + r);
  s.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
};

const makeGeo = () => {
  const r = SCR_R + BEZ - EDGE_S;
  const geo = new THREE.ExtrudeGeometry(roundedRect(BW - 2 * EDGE_S, BH - 2 * EDGE_S, r), {
    depth: DEPTH - 2 * EDGE_T,
    bevelEnabled: true,
    bevelThickness: EDGE_T,
    bevelSize: EDGE_S,
    bevelSegments: 7,
    curveSegments: 28,
  });
  geo.translate(0, 0, -(DEPTH - 2 * EDGE_T) / 2);
  const pos = geo.getAttribute('position');
  const lidN = geo.groups[0]?.materialIndex === 0 ? geo.groups[0].count : 0;
  const lids = new THREE.BufferGeometry();
  lids.setAttribute('position', new THREE.BufferAttribute((pos.array as Float32Array).slice(0, lidN * 3), 3));
  lids.computeVertexNormals();
  const wall0 = new THREE.BufferGeometry();
  wall0.setAttribute('position', new THREE.BufferAttribute((pos.array as Float32Array).slice(lidN * 3), 3));
  const walls = mergeVertices(wall0, 1e-6);
  walls.computeVertexNormals();
  wall0.dispose();
  geo.dispose();
  const buttons: {geo: THREE.BufferGeometry; x: number; y: number; crystal: boolean}[] = [];
  const btn = (side: -1 | 1, at: number, len: number, crystal = false, out = 0.0055) => {
    buttons.push({geo: new RoundedBoxGeometry(0.02, len * BH, 0.046, 3, 0.0085), x: side * (BW / 2 - 0.01 + out), y: BH / 2 - at * BH, crystal});
  };
  btn(-1, 0.212, 0.044);
  btn(-1, 0.298, 0.07);
  btn(-1, 0.384, 0.07);
  btn(1, 0.335, 0.108);
  btn(1, 0.6, 0.082, true, 0.002);
  return {lids, walls, buttons};
};

const makeMats = (env: THREE.Texture) => ({
  glass: new THREE.MeshStandardMaterial({color: 0x050505, roughness: 0.12, metalness: 0, envMap: env, envMapIntensity: 1}),
  metal: new THREE.MeshStandardMaterial({color: 0xb2b2b2, roughness: 0.3, metalness: 1, envMap: env, envMapIntensity: 1}),
  crystal: new THREE.MeshStandardMaterial({color: 0x161616, roughness: 0.18, metalness: 0.4, envMap: env, envMapIntensity: 1}),
});

// ---- the display (the studio's shader) --------------------------------------------------------------------------------------------
const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D map;
uniform vec2 uSize;
uniform float uRad;
uniform float uLum;
uniform float uPx;
uniform vec4 uIsland;
uniform vec4 uVeilBox;
uniform float uVeilR;
uniform vec3 uVeil;
uniform float uVeilA;
uniform vec4 uRingBox;
uniform float uRingR;
uniform float uRingA;
uniform vec3 uRingCol;
uniform float uRingW;
uniform float uGlowA;
uniform vec4 uTaps[4];
uniform vec3 uTapInk;
uniform vec3 uTapHalo;
uniform float uTapHaloA;
uniform vec3 uSheen;
varying vec2 vUv;

float sdBox(vec2 p, vec2 b, float r) {
  r = min(r, min(b.x, b.y));
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 px = vec2(vUv.x, 1.0 - vUv.y) * uSize;
  vec2 ddx = dFdx(vUv);
  vec2 ddy = dFdy(vUv);
  float pw = max(1e-4, 0.5 * (length(dFdx(px)) + length(dFdy(px))));
  vec2 gx = 0.5 * ddx;
  vec2 gy = 0.5 * ddy;
  vec2 a = 0.25 * (ddx + ddy);
  vec2 b = 0.25 * (ddx - ddy);
  vec3 c = 0.25 * (textureGrad(map, vUv + a, gx, gy).rgb + textureGrad(map, vUv - a, gx, gy).rgb
                 + textureGrad(map, vUv + b, gx, gy).rgb + textureGrad(map, vUv - b, gx, gy).rgb);
  c *= uLum;
  float dv = sdBox(px - uVeilBox.xy, uVeilBox.zw, uVeilR);
  c = mix(c, uVeil, uVeilA * clamp(0.5 + dv / pw, 0.0, 1.0));
  float dr = sdBox(px - uRingBox.xy, uRingBox.zw, uRingR) / pw;
  float wpx = uRingW * uPx;
  float sig = 12.0 * uPx;
  float glow = dr > 0.0 ? 0.5 * exp(-0.5 * (dr * dr) / (sig * sig)) : 0.0;
  c = mix(c, uRingCol, uGlowA * glow * uRingA);
  c = mix(c, uRingCol, clamp(0.5 * wpx + 0.5 - abs(dr + 0.5 * wpx), 0.0, 1.0) * uRingA);
  for (int i = 0; i < 4; i++) {
    vec4 t = uTaps[i];
    if (t.w <= 0.0) continue;
    float R = 44.0 * ${TAPK.toFixed(4)} * t.z;
    float w = 4.0 * ${TAPK.toFixed(4)} * t.z;
    float h = 3.0 * ${TAPK.toFixed(4)} * t.z;
    float d = length(px - t.xy);
    float ink = clamp(min(d - (R - w), R - d) / pw + 0.5, 0.0, 1.0);
    float halo = clamp(min(d - R, R + h - d) / pw + 0.5, 0.0, 1.0);
    c = mix(c, uTapHalo, halo * uTapHaloA * t.w);
    c = mix(c, uTapInk, ink * 0.95 * t.w);
  }
  vec2 q = px / uSize.x;
  float s = dot(q, vec2(0.876, 0.482)) - uSheen.x;
  c += uSheen.z * exp(-(s * s) / (uSheen.y * uSheen.y));
  float di = sdBox(px - uIsland.xy, uIsland.zw, uIsland.w);
  c = mix(c, vec3(0.0), clamp(0.5 - di / pw, 0.0, 1.0));
  float dd = sdBox(px - 0.5 * uSize, 0.5 * uSize, uRad);
  float alpha = clamp(0.5 - dd / pw, 0.0, 1.0);
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), alpha);
}`;

const rgb = (hex: string) => {
  const c = new THREE.Color();
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  c.setRGB(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, THREE.NoColorSpace);
  return c;
};

const makeScreen = (tex: THREE.Texture) => {
  const geo = new THREE.PlaneGeometry(1, SH);
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    uniforms: {
      map: {value: tex},
      uSize: {value: new THREE.Vector2(SRC_W, SRC_H)},
      uRad: {value: SCR_R * SRC_W},
      uLum: {value: 1},
      uPx: {value: 1},
      uIsland: {value: new THREE.Vector4(ISLAND.cx, ISLAND.cy, ISLAND.hw, ISLAND.hh)},
      uVeilBox: {value: new THREE.Vector4(-100, -100, 0, 0)},
      uVeilR: {value: 14 * TAPK},
      uVeil: {value: new THREE.Color()},
      uVeilA: {value: 0},
      uRingBox: {value: new THREE.Vector4(0, 0, 1, 1)},
      uRingR: {value: 14 * TAPK},
      uRingA: {value: 0},
      uRingCol: {value: new THREE.Color()},
      uRingW: {value: 3.5},
      uGlowA: {value: 0},
      uTaps: {value: [0, 1, 2, 3].map(() => new THREE.Vector4(0, 0, 1, 0))},
      uTapInk: {value: new THREE.Color()},
      uTapHalo: {value: new THREE.Color()},
      uTapHaloA: {value: 0.7},
      uSheen: {value: new THREE.Vector3(0, 0.3, 0)},
    },
  });
  mat.toneMapped = false;
  return {geo, mat};
};

const SHADOW_FRAG = /* glsl */ `
precision highp float;
uniform vec2 uHalf;
uniform float uR;
uniform float uSoft;
uniform float uA;
varying vec2 vUv;
float sdBox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main() {
  vec2 p = (vUv - 0.5) * (2.0 * uHalf + 2.0 * uSoft * 2.5);
  float d = sdBox(p, uHalf, uR);
  float k = 1.0 - smoothstep(-0.6 * uSoft, 1.6 * uSoft, d);
  gl_FragColor = vec4(0.0, 0.0, 0.0, uA * k * k);
}`;
const makeShadow = () => {
  const soft = 0.16;
  const half = new THREE.Vector2(BW / 2 - 0.04, BH / 2 - 0.04);
  const geo = new THREE.PlaneGeometry(2 * half.x + 2 * soft * 2.5, 2 * half.y + 2 * soft * 2.5);
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: SHADOW_FRAG,
    transparent: true,
    depthWrite: false,
    uniforms: {uHalf: {value: half}, uR: {value: SCR_R + BEZ}, uSoft: {value: soft}, uA: {value: 0}},
  });
  mat.toneMapped = false;
  return {geo, mat};
};

// ---- the capture as a texture, its status bar redrawn clean -----------------------------------------------------------------------
const statusBar = (g: CanvasRenderingContext2D) => {
  // the paper fade (iOS's scroll edge): solid under the bar, gone by 165 px, above every capture's own content
  const fade = g.createLinearGradient(0, 0, 0, 165);
  fade.addColorStop(0, rgba(C.surface, 0.97));
  fade.addColorStop(0.6, rgba(C.surface, 0.94));
  fade.addColorStop(1, rgba(C.surface, 0));
  g.fillStyle = fade;
  g.fillRect(0, 0, SRC_W, 165);
  g.fillStyle = C.ink;
  g.font = '600 48px FiraGO';
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.fillText('9:41', 196, 101);
  const rr = (x: number, y: number, w: number, h: number, r: number) => {
    g.beginPath();
    g.roundRect(x, y, w, h, r);
  };
  // the signal: one bar of four (out in the hills), no Wi-Fi
  const bars = [14, 20, 26, 32];
  bars.forEach((h, i) => {
    g.fillStyle = i === 0 ? C.ink : rgba(C.ink, 0.22);
    rr(826 + i * 14, 100 - h, 10, h, 3);
    g.fill();
  });
  // the battery
  g.strokeStyle = rgba(C.ink, 0.4);
  g.lineWidth = 3;
  rr(904.5, 70.5, 60, 29, 9);
  g.stroke();
  g.fillStyle = C.ink;
  rr(910, 76, 42, 18, 5);
  g.fill();
  g.fillStyle = rgba(C.ink, 0.4);
  rr(968, 80, 5, 10, 2.5);
  g.fill();
};

const useCapture = (src: string) => {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const [handle] = useState(() => delayRender(`navpromo phone ${src}`));
  useEffect(() => {
    let dead = false;
    const img = new Image();
    img.src = staticFile(`screens/${src}.jpg`);
    Promise.all([img.decode(), fontsLoaded])
      .then(() => {
        if (dead) return;
        const cv = document.createElement('canvas');
        cv.width = SRC_W;
        cv.height = SRC_H;
        const g = cv.getContext('2d');
        if (!g) throw new Error('no 2d context');
        g.drawImage(img, 0, 0, SRC_W, SRC_H);
        statusBar(g);
        const t = new THREE.CanvasTexture(cv);
        t.colorSpace = THREE.NoColorSpace;
        t.generateMipmaps = true;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        t.magFilter = THREE.LinearFilter;
        t.wrapS = THREE.ClampToEdgeWrapping;
        t.wrapT = THREE.ClampToEdgeWrapping;
        t.needsUpdate = true;
        setTex(t);
      })
      .catch((e) => cancelRender(e));
    return () => {
      dead = true;
    };
  }, [src]);
  useEffect(() => () => tex?.dispose(), [tex]);
  useEffect(() => {
    if (tex) continueRender(handle);
  }, [tex, handle]);
  return tex;
};

// ---- the phone ------------------------------------------------------------------------------------------------------------------------
export type Band = {x: number; y: number; w: number; h: number; a: number}; // capture fractions; a 0..1
export type Tap = {x: number; y: number; k: number}; // capture fractions; k 0..1 the ring's life
export type Phone3Props = {
  src: string;
  pose: Pose;
  on?: number; // the screen: 0 off (the black glass) .. 1 lit
  look?: number; // the studio: 0 the dark film's (the reveal) .. 1 the light film's
  rim?: number; // the frame's light (environment intensity), 1 the studio's
  veil?: number; // the paper fog over the screen except the band
  band?: Band | null;
  taps?: Tap[];
  sheen?: [number, number, number] | null; // the glass's light band: position, width, strength (null: the studio's, following the turn)
  shadow?: number; // the soft shadow on the paper (0..1 of the studio's)
};

const PhoneGL: React.FC<Phone3Props & {tex: THREE.Texture; dpr: number}> = ({tex, dpr, pose, on = 1, look = 1, rim = 1, veil = 0, band = null, taps = [], sheen = null, shadow = 1}) => {
  const {gl, camera} = useThree();
  const lookQ = Math.round(clamp(look) * 12) / 12;
  const env = useMemo(() => makeEnv(gl, lookQ), [gl, lookQ]);
  useEffect(() => () => env.dispose(), [env]);
  const geo = useMemo(() => makeGeo(), []);
  const mats = useMemo(() => makeMats(env.texture), [env]);
  const screen = useMemo(() => makeScreen(tex), [tex]);
  const shade = useMemo(() => makeShadow(), []);
  useEffect(() => () => [mats.glass, mats.metal, mats.crystal].forEach((m) => m.dispose()), [mats]);
  useEffect(
    () => () => {
      geo.lids.dispose();
      geo.walls.dispose();
      geo.buttons.forEach((b) => b.geo.dispose());
      screen.geo.dispose();
      screen.mat.dispose();
      shade.geo.dispose();
      shade.mat.dispose();
    },
    [geo, screen, shade],
  );
  useMemo(() => {
    tex.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    tex.needsUpdate = true;
  }, [tex, gl]);
  gl.toneMapping = THREE.NeutralToneMapping;
  gl.toneMappingExposure = 1;

  // the lens: its axis through the phone's centre, the frame a window of a wider virtual view
  const cam = camera as THREE.PerspectiveCamera;
  cam.fov = (2 * Math.atan(VH / FPX)) / D2R;
  cam.aspect = VW / VH;
  cam.near = 0.2;
  cam.far = 80;
  cam.setViewOffset(2 * VW, 2 * VH, VW - pose.x, VH - pose.y, 1080, 1920);
  cam.position.set(0, 0, FPX / pose.w);
  cam.rotation.set(0, 0, 0);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();

  const r = Math.max(0, rim);
  mats.glass.envMapIntensity = r;
  mats.metal.envMapIntensity = r;
  mats.crystal.envMapIntensity = r;
  mats.metal.color.copy(new THREE.Color(0xb2b2b2).lerp(new THREE.Color(0xa9a9a9), clamp(look)));

  const u = screen.mat.uniforms;
  u.uLum.value = clamp(on);
  u.uPx.value = dpr;
  const bx = (b: Band, s: number): [number, number, number, number] => [(b.x + b.w / 2) * SRC_W, (b.y + b.h / 2) * SRC_H, ((b.w / 2) * SRC_W) * s, ((b.h / 2) * SRC_H) * s];
  u.uVeilBox.value.set(...(band ? bx(band, 1) : [-100, -100, 0, 0]));
  u.uVeilA.value = clamp(veil);
  (u.uVeil.value as THREE.Color).copy(rgb(C.surface));
  const ba = band ? clamp(band.a) : 0;
  u.uRingBox.value.set(...(band ? bx(band, 0.96 + 0.04 * ba) : [0, 0, 1, 1]));
  u.uRingA.value = ba;
  (u.uRingCol.value as THREE.Color).copy(rgb(C.accA));
  u.uGlowA.value = 0.12;
  (u.uTaps.value as THREE.Vector4[]).forEach((v, i) => {
    const t = taps[i];
    if (t && t.k > 0 && t.k < 1) v.set(t.x * SRC_W, t.y * SRC_H, 0.55 + 0.6 * t.k, 1 - t.k);
    else v.set(0, 0, 1, 0);
  });
  (u.uTapInk.value as THREE.Color).copy(rgb(C.ink));
  (u.uTapHalo.value as THREE.Color).copy(rgb(C.onInk));
  const yaw = pose.yaw * D2R;
  const pitch = pose.pitch * D2R;
  u.uSheen.value.set(...(sheen ?? [0.55 + 1.6 * Math.sin(yaw) + 0.6 * Math.sin(pitch), 0.32, lerp(0.05, 0.035, clamp(look))]));
  shade.mat.uniforms.uA.value = 0.2 * clamp(look) * clamp(shadow);

  return (
    <>
      <group rotation={[0, yaw, 0]}>
        <group rotation={[-pitch, 0, 0]}>
          <group rotation={[0, 0, (pose.roll ?? 0) * D2R]}>
            <mesh geometry={geo.lids} material={mats.glass} />
            <mesh geometry={geo.walls} material={mats.metal} />
            {geo.buttons.map((b, i) => (
              <mesh key={i} geometry={b.geo} material={b.crystal ? mats.crystal : mats.metal} position={[b.x, b.y, 0]} />
            ))}
            <mesh geometry={screen.geo} material={screen.mat} position={[0, 0, FRONT + 0.0007]} renderOrder={2} />
          </group>
        </group>
      </group>
      {shade.mat.uniforms.uA.value > 0 ? <mesh geometry={shade.geo} material={shade.mat} position={[0.05, -0.09, -0.5]} renderOrder={0} /> : null}
    </>
  );
};

/** the real 3D iPhone over the whole frame, posed in frame px */
export const Phone3: React.FC<Phone3Props & {opacity?: number}> = ({opacity = 1, ...p}) => {
  const tex = useCapture(p.src);
  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, opacity: clamp(opacity)}}>
      {tex ? (
        <ThreeCanvas width={1080} height={1920} dpr={dpr} gl={{antialias: true, alpha: true}} style={{background: 'transparent'}}>
          <PhoneGL {...p} tex={tex} dpr={dpr} />
        </ThreeCanvas>
      ) : null}
    </div>
  );
};

// ---- a region of the screen lifted out as a card ------------------------------------------------------------------------------------
/** the region's rect on the unturned display at the phone's centre plane (frame px) */
const flatRect = (p: Pose, r: Region): Rect => ({x: p.x + (r.x0 - 0.5) * p.w, y: p.y + (r.y0 - 0.5) * SH * p.w, w: (r.x1 - r.x0) * p.w, h: (r.y1 - r.y0) * SH * p.w});

export type CardMap = {fx: (u: number) => number; fy: (v: number) => number; s: number};
export const cardRect = (r: Region, width: number, x: number, y: number): Rect => ({x, y, w: width, h: (width * (r.y1 - r.y0) * SRC_H) / ((r.x1 - r.x0) * SRC_W)});

export const Lift: React.FC<{
  src: string;
  r: Region;
  pose: Pose;
  to: Rect;
  k: number; // 0 on the screen .. 1 lifted (a spring may overshoot)
  show?: number; // its opacity
  radius?: number;
  band?: {x0: number; y0: number; x1: number; y1: number; a: number} | null; // capture fractions, the film's cobalt
  fog?: number; // the phone's paper veil, on the card while it lies on the screen
  children?: (m: CardMap) => React.ReactNode;
}> = ({src, r, pose, to, k, show = 1, radius = 28, band = null, fog = 0, children}) => {
  if (show <= 0.001) return null;
  const from = flatRect(pose, r);
  const x = lerp(from.x, to.x, k);
  const y = lerp(from.y, to.y, k);
  const w = lerp(from.w, to.w, k);
  const h = lerp(from.h, to.h, k);
  const q = 1 - clamp(k);
  const iw = w / (r.x1 - r.x0);
  const ih = iw * (SRC_H / SRC_W);
  const s = w / to.w;
  const fx = (u: number) => ((u - r.x0) / (r.x1 - r.x0)) * w;
  const fy = (v: number) => ((v - r.y0) / (r.y1 - r.y0)) * h;
  const lifted = clamp(k);
  const front = FRONT * pose.w * q;
  return (
    <div style={{position: 'absolute', inset: 0, perspective: `${FPX}px`, perspectiveOrigin: `${pose.x}px ${pose.y}px`, pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: w,
          height: h,
          opacity: clamp(show),
          transformOrigin: `${pose.x - x}px ${pose.y - y}px`,
          transform: q > 0.001 ? `rotateY(${pose.yaw * q}deg) rotateX(${pose.pitch * q}deg) rotateZ(${-(pose.roll ?? 0) * q}deg) translateZ(${front}px)` : undefined,
          borderRadius: radius * s,
          overflow: 'hidden',
          background: C.surface,
          boxShadow: `0 ${26 * lifted}px ${64 * lifted}px ${rgba(C.shade, 0.16 * lifted)}, 0 ${4 * lifted}px ${14 * lifted}px ${rgba(C.shade, 0.08 * lifted)}`,
        }}
      >
        <Img src={staticFile(`screens/${src}.jpg`)} style={{position: 'absolute', left: -r.x0 * iw, top: -r.y0 * ih, width: iw, height: ih}} />
        {band && band.a > 0 ? (
          <div
            style={{
              position: 'absolute',
              left: fx(band.x0) - 8 * s,
              top: fy(band.y0) - 5 * s,
              width: fx(band.x1) - fx(band.x0) + 16 * s,
              height: fy(band.y1) - fy(band.y0) + 10 * s,
              border: `${5 * s}px solid ${C.accA}`,
              borderRadius: 14 * s,
              opacity: clamp(band.a),
              transform: `scale(${0.96 + 0.04 * clamp(band.a)})`,
            }}
          />
        ) : null}
        {children ? children({fx, fy, s}) : null}
        {fog > 0.001 ? <div style={{position: 'absolute', inset: 0, background: C.surface, opacity: clamp(fog)}} /> : null}
      </div>
    </div>
  );
};

/** a tap: the studio's ring (ink, a white halo), growing as it fades; k 0..1 its life, in card px */
export const TapRing: React.FC<{x: number; y: number; k: number; s?: number}> = ({x, y, k, s = 1}) =>
  k > 0 && k < 1 ? (
    <div
      style={{
        position: 'absolute',
        left: x - 50 * s,
        top: y - 50 * s,
        width: 100 * s,
        height: 100 * s,
        borderRadius: 50 * s,
        border: `${4.5 * s}px solid ${rgba(C.ink, 0.92)}`,
        boxShadow: `0 0 0 ${3 * s}px ${rgba(C.onInk, 0.75)}`,
        opacity: 1 - k,
        transform: `scale(${0.55 + 0.6 * k})`,
      }}
    />
  ) : null;

/** an iOS switch drawn over the capture's own (a paper patch hides the original): `on` 0 off .. 1 on; centre and height in card px */
export const Switch: React.FC<{cx: number; cy: number; h: number; on: number}> = ({cx, cy, h, on}) => {
  const w = h * (138 / 86);
  const kr = h * (37 / 86);
  const k = clamp(on);
  const kx = lerp(cx - w / 2 + h / 2, cx + w / 2 - h / 2, k);
  return (
    <>
      <div style={{position: 'absolute', left: cx - w / 2 - h * 0.12, top: cy - h / 2 - h * 0.12, width: w + h * 0.24, height: h * 1.24, background: C.surface}} />
      <div style={{position: 'absolute', left: cx - w / 2, top: cy - h / 2, width: w, height: h, borderRadius: h / 2, background: rgba(C.ink, lerp(0.085, 1, k))}} />
      <div
        style={{
          position: 'absolute',
          left: kx - kr,
          top: cy - kr,
          width: 2 * kr,
          height: 2 * kr,
          borderRadius: kr,
          background: C.surface,
          boxShadow: `0 ${h * 0.04}px ${h * 0.1}px ${rgba(C.shade, 0.16 * (1 - k))}`,
        }}
      />
    </>
  );
};
