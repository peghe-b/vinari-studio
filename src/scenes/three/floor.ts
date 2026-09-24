import * as THREE from 'three';
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js';
import {LineSegments2} from 'three/examples/jsm/lines/LineSegments2.js';
import {LineSegmentsGeometry} from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import type {Model} from './model';

// The ground of the technical drawing: a ground line along each side of the body with a brighter
// tick where each wheel meets it. There is no floor grid and no contact shadow any more: the field
// is pure black (owner, 2026-09-24), and a shadow on black only ever darkened the grid.

/** Ground line along each side and a brighter tick where each wheel meets the ground. */
export const makeContact = (m: Model, ink: string, w: number, h: number) => {
  const mk = (width: number) => {
    const mat = new LineMaterial({color: new THREE.Color(ink), linewidth: width, worldUnits: false, transparent: true, opacity: 0});
    mat.toneMapped = false;
    mat.depthWrite = false;
    mat.resolution.set(w, h);
    return mat;
  };
  const ticks: number[] = [];
  const ground: number[] = [];
  const y = 0.004;
  if (m.car) {
    for (const side of [-1, 1]) {
      const ws = m.wheels.filter((wh) => Math.sign(wh.c.x) === side);
      if (!ws.length) continue;
      const x = ws[0].c.x + side * ws[0].halfW * 0.6;
      for (const wh of ws) ticks.push(x, y, wh.c.z - wh.r * 0.7, x, y, wh.c.z + wh.r * 0.7);
      // the contact line: from the rear contact patch to the front one, just past each wheel
      const zs = ws.map((wh) => wh.c.z);
      const r = ws[0].r;
      ground.push(x, y, Math.min(...zs) - r * 1.25, x, y, Math.max(...zs) + r * 1.25);
    }
  } else {
    const {min, max} = m.box;
    for (const x of [min.x, max.x]) ground.push(x, y, min.z - 0.2, x, y, max.z + 0.2);
  }
  const tMat = mk(1.8);
  const gMat = mk(1.1);
  const tg = new LineSegmentsGeometry();
  tg.setPositions(ticks.length ? ticks : [0, 0, 0, 0, 0, 0]);
  const gg = new LineSegmentsGeometry();
  gg.setPositions(ground);
  const tl = new LineSegments2(tg, tMat);
  const gl = new LineSegments2(gg, gMat);
  tl.renderOrder = 3;
  gl.renderOrder = 3;
  tl.visible = ticks.length > 0;
  return {ticks: tl, ground: gl, tMat, gMat};
};
