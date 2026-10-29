// The დიაგნოსტიკა Story's adapter slide (s5-diagnostika, the owner 2026-10-29: "the OBD adapter must show, how to plug it
// in"): the owner's own photo of an OBD2 adapter in its port under the dashboard, whole in its box (never cut), and a white
// ring round the adapter.
import React from 'react';
import {Img, staticFile} from 'remotion';

type Box = {x: number; y: number; w: number; h: number};
const AR = 1200 / 1600;
// the adapter on the photo, in fractions of it
const AD = {x: 0.45, y: 0.56, rx: 0.24, ry: 0.14};

export const S5Diagnostika: React.FC<{p: {box?: Box}}> = ({p}) => {
  const b = p.box ?? {x: 65, y: 560, w: 950, h: 1000};
  let h = b.h;
  let w = h * AR;
  if (w > b.w) {
    w = b.w;
    h = w / AR;
  }
  const x = b.x + (b.w - w) / 2;
  const y = b.y + (b.h - h) / 2;
  return (
    <>
      <div style={{position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 40, overflow: 'hidden'}}>
        <Img src={staticFile('photos/obd-adapter-plugged.jpg')} style={{width: '100%', height: '100%', objectFit: 'contain'}} />
      </div>
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
        <ellipse cx={x + w * AD.x} cy={y + h * AD.y} rx={w * AD.rx} ry={h * AD.ry} fill="none" stroke="#FFFFFF" strokeWidth={8} />
      </svg>
    </>
  );
};
