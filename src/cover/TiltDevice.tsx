// The cover's real devices, turned in 3D (the geometry is ./layout.mjs's: projectPoint, projectedBox, fitDevice, the poses):
//   Phone3D      the one tilted phone of the "phone" composition: a REAL current capture (public/screens/<src>.jpg, with the
//                studio's one status bar) in a whole iPhone, in the pose the ledger handed out, big, with the outline of the
//                tagged region drawn in the screen's own plane (concentric with it), so it tilts with the screen
//   CarPlayTilt  a REAL CarPlay capture (public/screens/carplay/<src>.png, 800 x 480) in the car's dark display, with the
//                approved transform of the ticked CarPlay cover (perspective 2200, rotateX 10 / rotateY -14 / rotateZ -2)
// Both in grey (grayscale 1, contrast 1.05) and WHOLE (never a cropped mockup, the owner 2026-10-12).
import React from 'react';
import {Img, staticFile} from 'remotion';
import {useScreenUrl} from '../lib/statusbar';
import {CARPLAY_ANGLES, CARPLAY_PERSPECTIVE, fitDevice, FRAME, PHONE_PERSPECTIVE} from './layout.mjs';

type Angles = readonly [number, number, number];
const rotate = ([x, y, z]: Angles) => `rotateX(${x}deg) rotateY(${y}deg) rotateZ(${z}deg)`;

/* eslint-disable @typescript-eslint/no-explicit-any */
export const Phone3D: React.FC<{p: Record<string, any>}> = ({p}) => {
  const url = useScreenUrl(p.src);
  const o = p.outline;
  return (
    <div style={{position: 'absolute', inset: 0, filter: 'grayscale(1) contrast(1.05)'}}>
      <div style={{position: 'absolute', inset: 0, perspective: PHONE_PERSPECTIVE, perspectiveOrigin: `${p.cx}px ${p.cy}px`}}>
        <div
          style={{
            position: 'absolute',
            left: p.cx - p.W / 2,
            top: p.cy - p.H / 2,
            width: p.W,
            height: p.H,
            borderRadius: 150,
            background: '#0E0E0E',
            boxShadow: '0 70px 140px rgba(0,0,0,0.30), 0 14px 36px rgba(0,0,0,0.20), inset 0 0 0 4px #3A3A3A',
            transform: `scale3d(${p.k}, ${p.k}, ${p.k}) ${rotate(p.angles)}`,
            transformOrigin: '50% 50%',
          }}
        >
          <div style={{position: 'absolute', left: p.BZ, top: p.BZ, width: p.SW, height: p.SH, borderRadius: 116, overflow: 'hidden', background: '#000'}}>
            {url ? <Img src={url} style={{position: 'absolute', left: 0, top: 0, width: p.SW, height: p.SH}} /> : null}
          </div>
          <div style={{position: 'absolute', left: o.x, top: o.y, width: o.w, height: o.h, borderRadius: o.r, boxShadow: `0 0 0 ${o.stroke}px #0B0B0B`}} />
        </div>
      </div>
    </div>
  );
};

/** A real CarPlay capture in the car's display, tilted, in grey: the approved CarPlay cover, unchanged. */
export const CarPlayTilt: React.FC<{src: string; stage: {top: number; bottom: number; left: number; right: number}}> = ({src, stage}) => {
  const IW = 800;
  const IH = 480;
  const BZ = 22;
  const W = IW + 2 * BZ;
  const H = IH + 2 * BZ;
  const room = {x0: stage.left, x1: stage.right, y0: stage.top + 40, y1: Math.min(FRAME.paBottom, stage.top + 820)};
  const f = fitDevice(W, H, CARPLAY_ANGLES, CARPLAY_PERSPECTIVE, room);
  return (
    <div style={{position: 'absolute', inset: 0, filter: 'grayscale(1) contrast(1.05)'}}>
      <div style={{position: 'absolute', inset: 0, perspective: CARPLAY_PERSPECTIVE, perspectiveOrigin: `${f.cx}px ${f.cy}px`}}>
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
            transform: `scale3d(${f.k}, ${f.k}, ${f.k}) ${rotate(CARPLAY_ANGLES as unknown as Angles)}`,
            transformOrigin: '50% 50%',
          }}
        >
          <Img src={staticFile(`screens/carplay/${src}.png`)} style={{position: 'absolute', left: BZ, top: BZ, width: IW, height: IH, borderRadius: 24}} />
        </div>
      </div>
    </div>
  );
};
